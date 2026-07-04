import { eq, and, isNull, desc } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { photoVault } from '$lib/server/db/schema';
import { imageUrl } from '$lib/server/cloudflare-images';

export interface VaultPhoto {
	id: string;
	deliveryUrl: string;
	uploadedAt: Date;
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
			uploadedAt: photoVault.uploadedAt
		})
		.from(photoVault)
		.where(and(eq(photoVault.userId, userId), isNull(photoVault.deletedAt)))
		.orderBy(desc(photoVault.uploadedAt))
		.all();

	return rows.map((r) => ({
		id: r.id,
		deliveryUrl: imageUrl(accountHash, r.cfImageId),
		uploadedAt: r.uploadedAt
	}));
}
