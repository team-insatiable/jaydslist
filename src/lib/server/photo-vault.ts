import { eq, and, isNull, desc, asc, sql, ne } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import {
	photoVault,
	photoAlbums,
	userProfiles,
	DEFAULT_CONFIG,
	listingPhotos,
	listings
} from '$lib/server/db/schema';
import { getConfig } from '$lib/server/config';
import { imageUrl, deleteImage } from '$lib/server/cloudflare-images';

export interface VaultPhoto {
	id: string;
	cfImageId: string;
	deliveryUrl: string;
	uploadedAt: Date;
	albumId: string | null;
}

export interface VaultAlbum {
	id: string;
	name: string;
	coverUrl: string | null;
	photoCount: number;
}

export async function getAlbumPhotos(
	db: D1Database,
	albumId: string,
	accountHash: string
): Promise<{ id: string; cfImageId: string; deliveryUrl: string }[]> {
	const rows = await getDb(db)
		.select({ id: photoVault.id, cfImageId: photoVault.cfImageId })
		.from(photoVault)
		.where(
			and(
				eq(photoVault.albumId, albumId),
				isNull(photoVault.deletedAt),
				ne(photoVault.scanStatus, 'uploading')
			)
		)
		.orderBy(sql`coalesce(${photoVault.displayOrder}, 999999) asc`, asc(photoVault.uploadedAt))
		.all();
	return rows.map((r) => ({
		id: r.id,
		cfImageId: r.cfImageId,
		deliveryUrl: imageUrl(accountHash, r.cfImageId)
	}));
}

// Returns just the album rows — cover URL and photo count are computed by the
// caller from the photo list to avoid a separate JS-filtered query.
export async function getAlbumList(
	db: D1Database,
	userId: string
): Promise<{ id: string; name: string }[]> {
	return getDb(db)
		.select({ id: photoAlbums.id, name: photoAlbums.name })
		.from(photoAlbums)
		.where(eq(photoAlbums.userId, userId))
		.orderBy(desc(photoAlbums.createdAt))
		.all();
}

export async function getVaultPhotos(
	db: D1Database,
	userId: string,
	accountHash: string
): Promise<VaultPhoto[]> {
	const rows = await getDb(db)
		.select({
			id: photoVault.id,
			cfImageId: photoVault.cfImageId,
			uploadedAt: photoVault.uploadedAt,
			albumId: photoVault.albumId
		})
		.from(photoVault)
		.where(
			and(
				eq(photoVault.userId, userId),
				isNull(photoVault.deletedAt),
				ne(photoVault.scanStatus, 'uploading')
			)
		)
		.orderBy(desc(photoVault.uploadedAt))
		.all();

	return rows.map((r) => ({
		id: r.id,
		cfImageId: r.cfImageId,
		deliveryUrl: imageUrl(accountHash, r.cfImageId),
		uploadedAt: r.uploadedAt,
		albumId: r.albumId
	}));
}

export function photoLimits(isSupporter: boolean) {
	return {
		maxAlbums: Number(
			isSupporter ? DEFAULT_CONFIG.VAULT_MAX_ALBUMS_PAID : DEFAULT_CONFIG.VAULT_MAX_ALBUMS_FREE
		),
		maxPhotos: Number(
			isSupporter ? DEFAULT_CONFIG.VAULT_MAX_PHOTOS_PAID : DEFAULT_CONFIG.VAULT_MAX_PHOTOS_FREE
		)
	};
}

export async function getPhotoLimits(env: Env, userId: string) {
	const profile = await getDb(env.DB)
		.select({ isSupporter: userProfiles.isSupporter })
		.from(userProfiles)
		.where(eq(userProfiles.id, userId))
		.get();
	const supporter = profile?.isSupporter ?? false;
	const defaults = photoLimits(supporter);
	const [albums, photos] = await Promise.all([
		getConfig(supporter ? 'VAULT_MAX_ALBUMS_PAID' : 'VAULT_MAX_ALBUMS_FREE', env, env.DB),
		getConfig(supporter ? 'VAULT_MAX_PHOTOS_PAID' : 'VAULT_MAX_PHOTOS_FREE', env, env.DB)
	]);
	const positive = (value: string, fallback: number) => {
		const parsed = Number(value);
		return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
	};
	return {
		maxAlbums: positive(albums, defaults.maxAlbums),
		maxPhotos: positive(photos, defaults.maxPhotos)
	};
}

// Reclaim deleted photos once their final active listing no longer needs them.
// This also retries storage cleanup failures on the next upload attempt.
export async function purgeRetiredPhotos(env: Env, userId: string) {
	const rows = await env.DB.prepare(
		`SELECT v.id, v.cf_image_id FROM photo_vault v
		WHERE v.user_id = ? AND v.deleted_at IS NOT NULL
		AND EXISTS (SELECT 1 FROM listing_photos lp WHERE lp.vault_photo_id = v.id AND lp.purged_at IS NULL)
		AND NOT EXISTS (SELECT 1 FROM listing_photos lp JOIN listings l ON l.id = lp.listing_id
			WHERE lp.vault_photo_id = v.id AND lp.purged_at IS NULL AND l.status = 'active')`
	)
		.bind(userId)
		.all<{ id: string; cf_image_id: string }>();
	for (const photo of rows.results) {
		try {
			await removeVaultPhoto(env, photo.id, photo.cf_image_id);
		} catch {
			console.error('Failed to purge retained photo', photo.id);
		}
	}
}

export async function getPhotoUsage(database: D1Database, userId: string) {
	const row = await database
		.prepare(
			`SELECT count(*) AS total FROM photo_vault v
		WHERE v.user_id = ? AND (v.deleted_at IS NULL OR EXISTS (
			SELECT 1 FROM listing_photos lp WHERE lp.vault_photo_id = v.id AND lp.purged_at IS NULL))`
		)
		.bind(userId)
		.first<{ total: number }>();
	return row?.total ?? 0;
}

// One INSERT ... SELECT makes the quota check and reservation atomic, including
// simultaneous uploads. Deleted photos retained by listings still occupy slots.
export async function reservePhoto(
	database: D1Database,
	userId: string,
	id: string,
	albumId: string | null,
	max: number,
	contentHash: string
) {
	return database
		.prepare(
			`INSERT INTO photo_vault (id, user_id, cf_image_id, album_id, scan_status, p_hash)
		SELECT ?, ?, ?, ?, 'uploading', ?
		WHERE (SELECT count(*) FROM photo_vault v WHERE v.user_id = ? AND
			(v.deleted_at IS NULL OR EXISTS (SELECT 1 FROM listing_photos lp
			WHERE lp.vault_photo_id = v.id AND lp.purged_at IS NULL))) < ?
		AND NOT EXISTS (SELECT 1 FROM photo_vault v WHERE v.user_id = ?
			AND v.p_hash = ? AND v.deleted_at IS NULL)`
		)
		.bind(id, userId, id, albumId, contentHash, userId, max, userId, contentHash)
		.run();
}

// Keep retained listing photos charged to the account. Confirm physical deletion
// before freeing a slot so repeated deletion failures cannot grow storage.
export async function removeVaultPhoto(env: Env, photoId: string, cfImageId: string) {
	const db = getDb(env.DB);
	const active = await db
		.select({ id: listingPhotos.id })
		.from(listingPhotos)
		.innerJoin(listings, eq(listingPhotos.listingId, listings.id))
		.where(
			and(
				eq(listingPhotos.vaultPhotoId, photoId),
				isNull(listingPhotos.purgedAt),
				eq(listings.status, 'active')
			)
		)
		.get();
	if (!active) {
		await deleteImage(env, cfImageId);
		await db
			.update(listingPhotos)
			.set({ purgedAt: new Date() })
			.where(and(eq(listingPhotos.vaultPhotoId, photoId), isNull(listingPhotos.purgedAt)));
	}
	await db.update(photoVault).set({ deletedAt: new Date() }).where(eq(photoVault.id, photoId));
}
