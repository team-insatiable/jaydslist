import { fail, redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import {
	photoAlbums,
	photoVault,
	listingPhotos,
	listings,
	userProfiles
} from '$lib/server/db/schema';
import { eq, and, isNull, asc, ne, or, sql } from 'drizzle-orm';
import { imageUrl, deleteImage } from '$lib/server/cloudflare-images';

async function requireSupporter(locals: App.Locals, platform: App.Platform | undefined) {
	if (!locals.user) throw redirect(302, '/login');
	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');
	const db = getDb(env.DB);
	const profile = await db
		.select({ isSupporter: userProfiles.isSupporter })
		.from(userProfiles)
		.where(eq(userProfiles.id, locals.user.id))
		.get();
	if (!profile?.isSupporter) throw redirect(302, '/vault');
	return { db, env, userId: locals.user.id };
}

export const load: PageServerLoad = async ({ locals, platform, params }) => {
	const { db, env, userId } = await requireSupporter(locals, platform);

	const isUncategorized = params.albumId === 'uncategorized';

	let albumName = 'Uncategorized';
	if (!isUncategorized) {
		const album = await db
			.select({ id: photoAlbums.id, name: photoAlbums.name, userId: photoAlbums.userId })
			.from(photoAlbums)
			.where(eq(photoAlbums.id, params.albumId))
			.get();
		if (!album || album.userId !== userId) throw error(404, 'Album not found');
		albumName = album.name;
	}

	const albumPhotos = await db
		.select({
			id: photoVault.id,
			cfImageId: photoVault.cfImageId,
			uploadedAt: photoVault.uploadedAt,
			displayOrder: photoVault.displayOrder
		})
		.from(photoVault)
		.where(
			and(
				eq(photoVault.userId, userId),
				isNull(photoVault.deletedAt),
				isUncategorized ? isNull(photoVault.albumId) : eq(photoVault.albumId, params.albumId)
			)
		)
		.orderBy(sql`coalesce(${photoVault.displayOrder}, 999999) asc`, asc(photoVault.uploadedAt))
		.all();

	const otherPhotos = isUncategorized
		? []
		: await db
				.select({ id: photoVault.id, cfImageId: photoVault.cfImageId })
				.from(photoVault)
				.where(
					and(
						eq(photoVault.userId, userId),
						isNull(photoVault.deletedAt),
						or(isNull(photoVault.albumId), ne(photoVault.albumId, params.albumId))
					)
				)
				.orderBy(asc(photoVault.uploadedAt))
				.all();

	const accountHash = env.CF_IMAGES_ACCOUNT_HASH;
	const lastUpdated = albumPhotos.length ? albumPhotos[albumPhotos.length - 1].uploadedAt : null;

	return {
		albumId: params.albumId,
		albumName,
		isUncategorized,
		albumPhotos: albumPhotos.map((p) => ({
			id: p.id,
			deliveryUrl: imageUrl(accountHash, p.cfImageId)
		})),
		otherPhotos: otherPhotos.map((p) => ({
			id: p.id,
			deliveryUrl: imageUrl(accountHash, p.cfImageId)
		})),
		lastUpdated
	};
};

export const actions: Actions = {
	renameAlbum: async ({ request, locals, platform, params }) => {
		const { db, userId } = await requireSupporter(locals, platform);

		if (params.albumId === 'uncategorized')
			return fail(400, { error: 'Cannot rename Uncategorized' });

		const name = (((await request.formData()).get('name') as string) || '').trim();
		if (!name) return fail(400, { error: 'Album name is required' });
		if (name.length > 40) return fail(400, { error: 'Album name must be 40 characters or less' });

		const album = await db
			.select({ userId: photoAlbums.userId })
			.from(photoAlbums)
			.where(eq(photoAlbums.id, params.albumId))
			.get();
		if (!album || album.userId !== userId) return fail(404, { error: 'Album not found' });

		await db.update(photoAlbums).set({ name }).where(eq(photoAlbums.id, params.albumId));
		return { success: true };
	},

	addToAlbum: async ({ request, locals, platform, params }) => {
		const { db, userId } = await requireSupporter(locals, platform);

		if (params.albumId === 'uncategorized')
			return fail(400, { error: 'Cannot add to Uncategorized via this action' });

		const photoId = (await request.formData()).get('photoId') as string;
		const photo = await db
			.select({ userId: photoVault.userId })
			.from(photoVault)
			.where(eq(photoVault.id, photoId))
			.get();
		if (!photo || photo.userId !== userId) return fail(404, { error: 'Photo not found' });

		const album = await db
			.select({ userId: photoAlbums.userId })
			.from(photoAlbums)
			.where(eq(photoAlbums.id, params.albumId))
			.get();
		if (!album || album.userId !== userId) return fail(404, { error: 'Album not found' });

		await db.update(photoVault).set({ albumId: params.albumId }).where(eq(photoVault.id, photoId));
		return { success: true };
	},

	removeFromAlbum: async ({ request, locals, platform }) => {
		const { db, userId } = await requireSupporter(locals, platform);

		const photoId = (await request.formData()).get('photoId') as string;
		const photo = await db
			.select({ userId: photoVault.userId })
			.from(photoVault)
			.where(eq(photoVault.id, photoId))
			.get();
		if (!photo || photo.userId !== userId) return fail(404, { error: 'Photo not found' });

		await db.update(photoVault).set({ albumId: null }).where(eq(photoVault.id, photoId));
		return { success: true };
	},

	reorderPhotos: async ({ request, locals, platform }) => {
		const { db, userId } = await requireSupporter(locals, platform);

		const ids = JSON.parse(((await request.formData()).get('order') as string) || '[]') as string[];
		if (!Array.isArray(ids) || ids.length === 0) return { success: true };

		for (let i = 0; i < ids.length; i++) {
			await db
				.update(photoVault)
				.set({ displayOrder: i })
				.where(and(eq(photoVault.id, ids[i]), eq(photoVault.userId, userId)));
		}
		return { success: true };
	},

	deletePhoto: async ({ request, locals, platform }) => {
		const { db, env, userId } = await requireSupporter(locals, platform);

		const photoId = (await request.formData()).get('photoId') as string;
		const photo = await db
			.select({
				userId: photoVault.userId,
				cfImageId: photoVault.cfImageId,
				deletedAt: photoVault.deletedAt
			})
			.from(photoVault)
			.where(eq(photoVault.id, photoId))
			.get();
		if (!photo || photo.userId !== userId) return fail(404, { error: 'Photo not found' });
		if (photo.deletedAt) return { success: true };

		await db.update(photoVault).set({ deletedAt: new Date() }).where(eq(photoVault.id, photoId));

		const stillActive = await db
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

		if (!stillActive) {
			await db
				.update(listingPhotos)
				.set({ purgedAt: new Date() })
				.where(and(eq(listingPhotos.vaultPhotoId, photoId), isNull(listingPhotos.purgedAt)));

			deleteImage(env, photo.cfImageId).catch((e) => console.error('Failed to purge CF image:', e));
		}

		return { success: true };
	}
};
