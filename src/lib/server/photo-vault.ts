import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { photoVault, photoAlbums } from '$lib/server/db/schema';
import { imageUrl } from '$lib/server/cloudflare-images';

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
): Promise<{ id: string; deliveryUrl: string }[]> {
	const rows = await getDb(db)
		.select({ id: photoVault.id, cfImageId: photoVault.cfImageId })
		.from(photoVault)
		.where(and(eq(photoVault.albumId, albumId), isNull(photoVault.deletedAt)))
		.orderBy(sql`coalesce(${photoVault.displayOrder}, 999999) asc`, asc(photoVault.uploadedAt))
		.all();
	return rows.map((r) => ({ id: r.id, deliveryUrl: imageUrl(accountHash, r.cfImageId) }));
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
		.where(and(eq(photoVault.userId, userId), isNull(photoVault.deletedAt)))
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
