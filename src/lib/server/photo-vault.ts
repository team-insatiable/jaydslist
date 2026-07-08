import { eq, and, isNull, desc } from 'drizzle-orm';
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
		.orderBy(photoVault.uploadedAt)
		.all();
	return rows.map((r) => ({ id: r.id, deliveryUrl: imageUrl(accountHash, r.cfImageId) }));
}

export async function getAlbums(
	db: D1Database,
	userId: string,
	accountHash: string
): Promise<VaultAlbum[]> {
	const albums = await getDb(db)
		.select({ id: photoAlbums.id, name: photoAlbums.name })
		.from(photoAlbums)
		.where(eq(photoAlbums.userId, userId))
		.orderBy(desc(photoAlbums.createdAt))
		.all();

	const photos = await getDb(db)
		.select({ albumId: photoVault.albumId, cfImageId: photoVault.cfImageId })
		.from(photoVault)
		.where(and(eq(photoVault.userId, userId), isNull(photoVault.deletedAt)))
		.all();

	return albums.map((a) => {
		const albumPhotos = photos.filter((p) => p.albumId === a.id);
		const cover = albumPhotos[0];
		return {
			id: a.id,
			name: a.name,
			coverUrl: cover ? imageUrl(accountHash, cover.cfImageId) : null,
			photoCount: albumPhotos.length
		};
	});
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
