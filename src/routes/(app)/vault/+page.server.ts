import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { photoAlbums, photoVault, messages, userProfiles } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import {
	getVaultPhotos,
	getPhotoLimits,
	removeVaultPhoto,
	getPhotoUsage
} from '$lib/server/photo-vault';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) throw redirect(302, '/login');

	const env = platform?.env;
	if (!env) throw new Error('Server configuration error');

	const db = getDb(env.DB);

	const profile = await db
		.select({ isSupporter: userProfiles.isSupporter })
		.from(userProfiles)
		.where(eq(userProfiles.id, locals.user.id))
		.get();

	const albums = await db
		.select({ id: photoAlbums.id, name: photoAlbums.name, createdAt: photoAlbums.createdAt })
		.from(photoAlbums)
		.where(eq(photoAlbums.userId, locals.user.id))
		.orderBy(asc(photoAlbums.createdAt))
		.all();

	const photos = await getVaultPhotos(env.DB, locals.user.id, env.CF_IMAGES_ACCOUNT_HASH);

	return {
		albums,
		photos,
		photoUsage: await getPhotoUsage(env.DB, locals.user.id),
		isSupporter: profile?.isSupporter ?? false,
		...(await getPhotoLimits(env, locals.user.id))
	};
};

export const actions: Actions = {
	createAlbum: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const name = ((data.get('name') as string) || '').trim();
		if (!name) return fail(400, { error: 'Album name is required' });
		if (name.length > 40) return fail(400, { error: 'Album name must be 40 characters or less' });

		const id = crypto.randomUUID();
		const { maxAlbums } = await getPhotoLimits(env, locals.user.id);
		const inserted = await env.DB.prepare(
			`INSERT INTO photo_albums (id, user_id, name)
			SELECT ?, ?, ? WHERE (SELECT count(*) FROM photo_albums WHERE user_id = ?) < ?`
		)
			.bind(id, locals.user.id, name, locals.user.id, maxAlbums)
			.run();
		if (!inserted.meta.changes)
			return fail(400, {
				error: `Your account allows ${maxAlbums} album${maxAlbums === 1 ? '' : 's'}`
			});

		return { success: true, albumId: id };
	},

	renameAlbum: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const db = getDb(env.DB);

		const data = await request.formData();
		const id = data.get('id') as string;
		const name = ((data.get('name') as string) || '').trim();
		if (!name) return fail(400, { error: 'Album name is required' });
		if (name.length > 40) return fail(400, { error: 'Album name must be 40 characters or less' });

		const album = await db
			.select({ userId: photoAlbums.userId })
			.from(photoAlbums)
			.where(eq(photoAlbums.id, id))
			.get();
		if (!album || album.userId !== locals.user.id) return fail(404, { error: 'Album not found' });

		await db.update(photoAlbums).set({ name }).where(eq(photoAlbums.id, id));

		return { success: true };
	},

	deleteAlbum: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const db = getDb(env.DB);

		const data = await request.formData();
		const id = data.get('id') as string;

		const album = await db
			.select({ userId: photoAlbums.userId })
			.from(photoAlbums)
			.where(eq(photoAlbums.id, id))
			.get();
		if (!album || album.userId !== locals.user.id) return fail(404, { error: 'Album not found' });

		// schema.ts declares photoVault.albumId as ON DELETE SET NULL, but D1
		// can't actually apply that behavior retroactively on the existing table
		// (ALTER TABLE ADD COLUMN doesn't carry the clause through, and D1 doesn't
		// honor PRAGMA foreign_keys=OFF across statements, so the standard SQLite
		// table-rebuild recipe to fix it isn't viable against live data). Null out
		// the references ourselves before deleting the album, or the delete would
		// fail against the real (unconditional) FK constraint that's actually in
		// the database.
		await db.update(photoVault).set({ albumId: null }).where(eq(photoVault.albumId, id));
		await db.update(messages).set({ albumId: null }).where(eq(messages.albumId, id));
		await db.delete(photoAlbums).where(eq(photoAlbums.id, id));

		return { success: true };
	},

	moveToAlbum: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const db = getDb(env.DB);

		const data = await request.formData();
		const photoId = data.get('photoId') as string;
		const albumIdRaw = (data.get('albumId') as string) || '';
		const albumId = albumIdRaw || null;

		const photo = await db
			.select({ userId: photoVault.userId })
			.from(photoVault)
			.where(eq(photoVault.id, photoId))
			.get();
		if (!photo || photo.userId !== locals.user.id) return fail(404, { error: 'Photo not found' });

		if (albumId) {
			const album = await db
				.select({ userId: photoAlbums.userId })
				.from(photoAlbums)
				.where(eq(photoAlbums.id, albumId))
				.get();
			if (!album || album.userId !== locals.user.id) return fail(404, { error: 'Album not found' });
		}

		await db.update(photoVault).set({ albumId }).where(eq(photoVault.id, photoId));

		return { success: true };
	},

	deletePhoto: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const db = getDb(env.DB);

		const data = await request.formData();
		const photoId = data.get('photoId') as string;

		const photo = await db
			.select({
				userId: photoVault.userId,
				cfImageId: photoVault.cfImageId,
				deletedAt: photoVault.deletedAt
			})
			.from(photoVault)
			.where(eq(photoVault.id, photoId))
			.get();
		if (!photo || photo.userId !== locals.user.id) return fail(404, { error: 'Photo not found' });
		if (photo.deletedAt) return { success: true };

		try {
			await removeVaultPhoto(env, photoId, photo.cfImageId);
		} catch {
			return fail(502, { error: 'Could not delete photo from storage. Please try again.' });
		}

		return { success: true };
	}
};
