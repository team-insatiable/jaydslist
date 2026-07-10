import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import {
	photoAlbums,
	photoVault,
	messages,
	listingPhotos,
	listings,
	userProfiles
} from '$lib/server/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { getVaultPhotos } from '$lib/server/photo-vault';
import { deleteImage } from '$lib/server/cloudflare-images';

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
		isSupporter: profile?.isSupporter ?? false
	};
};

export const actions: Actions = {
	createAlbum: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const db = getDb(env.DB);
		const profile = await db
			.select({ isSupporter: userProfiles.isSupporter })
			.from(userProfiles)
			.where(eq(userProfiles.id, locals.user.id))
			.get();
		if (!profile?.isSupporter) return fail(403, { error: 'Photo vault is a supporter feature' });

		const data = await request.formData();
		const name = ((data.get('name') as string) || '').trim();
		if (!name) return fail(400, { error: 'Album name is required' });
		if (name.length > 40) return fail(400, { error: 'Album name must be 40 characters or less' });

		const id = crypto.randomUUID();
		await db.insert(photoAlbums).values({ id, userId: locals.user.id, name });

		return { success: true, albumId: id };
	},

	renameAlbum: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const db = getDb(env.DB);
		const profile = await db
			.select({ isSupporter: userProfiles.isSupporter })
			.from(userProfiles)
			.where(eq(userProfiles.id, locals.user.id))
			.get();
		if (!profile?.isSupporter) return fail(403, { error: 'Photo vault is a supporter feature' });

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
		const profile = await db
			.select({ isSupporter: userProfiles.isSupporter })
			.from(userProfiles)
			.where(eq(userProfiles.id, locals.user.id))
			.get();
		if (!profile?.isSupporter) return fail(403, { error: 'Photo vault is a supporter feature' });

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
		const profile = await db
			.select({ isSupporter: userProfiles.isSupporter })
			.from(userProfiles)
			.where(eq(userProfiles.id, locals.user.id))
			.get();
		if (!profile?.isSupporter) return fail(403, { error: 'Photo vault is a supporter feature' });

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
		const profile = await db
			.select({ isSupporter: userProfiles.isSupporter })
			.from(userProfiles)
			.where(eq(userProfiles.id, locals.user.id))
			.get();
		if (!profile?.isSupporter) return fail(403, { error: 'Photo vault is a supporter feature' });

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

		await db.update(photoVault).set({ deletedAt: new Date() }).where(eq(photoVault.id, photoId));

		// "No active listing references it" per CLAUDE.md — status = 'active' is
		// the only status that keeps a photo alive; paused/removed/flagged do not.
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
			// Purges every listingPhotos row for this vault photo (not just one
			// listing's) — correct, since the underlying image is gone regardless
			// of which listing(s) ever referenced it. Note: this does not sweep
			// for photos that become unreferenced *later* (e.g. their one active
			// listing expires or is removed after this call already skipped the
			// purge) — that would need a periodic background job, out of scope
			// here, same deferred posture as pHash blocklist enforcement.
			await db
				.update(listingPhotos)
				.set({ purgedAt: new Date() })
				.where(and(eq(listingPhotos.vaultPhotoId, photoId), isNull(listingPhotos.purgedAt)));

			// Fire-and-forget: DB deletedAt/purgedAt state is the source of truth
			// for what the app shows; a failed CF-side delete just leaves an
			// orphaned image blob, matching the existing fire-and-forget pattern
			// used for DBBL ban reporting.
			deleteImage(env, photo.cfImageId).catch((e) => console.error('Failed to purge CF image:', e));
		}

		return { success: true };
	}
};
