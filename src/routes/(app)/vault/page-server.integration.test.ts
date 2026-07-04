import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { load, actions } from './+page.server';
import {
	createTestUser,
	createTestVaultPhoto,
	createTestAlbum,
	createTestListing,
	createTestListingPhoto
} from '$lib/server/test-helpers/fixtures';
import { getDb } from '$lib/server/db';
import { photoVault, listingPhotos, photoAlbums } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

type LoadEvent = Parameters<typeof load>[0];
type ActionEvent = Parameters<(typeof actions)['createAlbum']>[0];

function fakeLoadEvent(userId: string): LoadEvent {
	return {
		locals: { user: { id: userId, email: 'test@example.com' } },
		platform: { env }
	} as unknown as LoadEvent;
}

function fakeActionEvent(userId: string, fields: Record<string, string>): ActionEvent {
	const form = new FormData();
	for (const [key, value] of Object.entries(fields)) form.append(key, value);
	return {
		request: new Request('http://localhost/vault', { method: 'POST', body: form }),
		locals: { user: { id: userId, email: 'test@example.com' } },
		platform: { env }
	} as unknown as ActionEvent;
}

describe('vault load', () => {
	it('returns non-supporter data with an empty vault', async () => {
		const userId = await createTestUser(env.DB, { isSupporter: false });
		const result = await load(fakeLoadEvent(userId));
		expect(result.isSupporter).toBe(false);
		expect(result.photos).toEqual([]);
	});

	it('groups photos by album and excludes other users and soft-deleted photos', async () => {
		const userId = await createTestUser(env.DB, { isSupporter: true });
		const otherUserId = await createTestUser(env.DB, { isSupporter: true });
		const albumId = await createTestAlbum(env.DB, userId, { name: 'Vacation' });

		const inAlbum = await createTestVaultPhoto(env.DB, userId, { albumId });
		const uncategorized = await createTestVaultPhoto(env.DB, userId);
		await createTestVaultPhoto(env.DB, userId, { deletedAt: new Date() });
		await createTestVaultPhoto(env.DB, otherUserId);

		const result = await load(fakeLoadEvent(userId));
		expect(result.albums.length).toBe(1);
		expect(result.albums[0].name).toBe('Vacation');

		const ids = result.photos.map((p) => p.id).sort();
		expect(ids).toEqual([inAlbum, uncategorized].sort());
	});
});

describe('vault actions', () => {
	it('createAlbum rejects non-supporters', async () => {
		const userId = await createTestUser(env.DB, { isSupporter: false });
		const result = await actions.createAlbum(fakeActionEvent(userId, { name: 'New Album' }));
		expect(result).toMatchObject({ status: 403 });
	});

	it('createAlbum rejects an empty name', async () => {
		const userId = await createTestUser(env.DB, { isSupporter: true });
		const result = await actions.createAlbum(fakeActionEvent(userId, { name: '  ' }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('createAlbum creates a row scoped to the user', async () => {
		const userId = await createTestUser(env.DB, { isSupporter: true });
		await actions.createAlbum(fakeActionEvent(userId, { name: 'My Album' }));

		const rows = await getDb(env.DB)
			.select()
			.from(photoAlbums)
			.where(eq(photoAlbums.userId, userId))
			.all();
		expect(rows.length).toBe(1);
		expect(rows[0].name).toBe('My Album');
	});

	it('renameAlbum rejects renaming another users album', async () => {
		const ownerId = await createTestUser(env.DB, { isSupporter: true });
		const attackerId = await createTestUser(env.DB, { isSupporter: true });
		const albumId = await createTestAlbum(env.DB, ownerId, { name: 'Original' });

		const result = await actions.renameAlbum(
			fakeActionEvent(attackerId, { id: albumId, name: 'Hijacked' })
		);
		expect(result).toMatchObject({ status: 404 });

		const album = await getDb(env.DB)
			.select({ name: photoAlbums.name })
			.from(photoAlbums)
			.where(eq(photoAlbums.id, albumId))
			.get();
		expect(album?.name).toBe('Original');
	});

	it('deleteAlbum removes the album and leaves its photos uncategorized', async () => {
		const userId = await createTestUser(env.DB, { isSupporter: true });
		const albumId = await createTestAlbum(env.DB, userId);
		const photoId = await createTestVaultPhoto(env.DB, userId, { albumId });

		const result = await actions.deleteAlbum(fakeActionEvent(userId, { id: albumId }));
		expect(result).toEqual({ success: true });

		const album = await getDb(env.DB)
			.select()
			.from(photoAlbums)
			.where(eq(photoAlbums.id, albumId))
			.get();
		expect(album).toBeUndefined();

		const photo = await getDb(env.DB)
			.select({ albumId: photoVault.albumId })
			.from(photoVault)
			.where(eq(photoVault.id, photoId))
			.get();
		expect(photo?.albumId).toBeNull();
	});

	it('moveToAlbum rejects moving another users photo', async () => {
		const ownerId = await createTestUser(env.DB, { isSupporter: true });
		const attackerId = await createTestUser(env.DB, { isSupporter: true });
		const photoId = await createTestVaultPhoto(env.DB, ownerId);

		const result = await actions.moveToAlbum(fakeActionEvent(attackerId, { photoId, albumId: '' }));
		expect(result).toMatchObject({ status: 404 });
	});

	it('moveToAlbum rejects moving into another users album', async () => {
		const userId = await createTestUser(env.DB, { isSupporter: true });
		const otherUserId = await createTestUser(env.DB, { isSupporter: true });
		const photoId = await createTestVaultPhoto(env.DB, userId);
		const foreignAlbumId = await createTestAlbum(env.DB, otherUserId);

		const result = await actions.moveToAlbum(
			fakeActionEvent(userId, { photoId, albumId: foreignAlbumId })
		);
		expect(result).toMatchObject({ status: 404 });
	});

	it('moveToAlbum with an empty albumId uncategorizes the photo', async () => {
		const userId = await createTestUser(env.DB, { isSupporter: true });
		const albumId = await createTestAlbum(env.DB, userId);
		const photoId = await createTestVaultPhoto(env.DB, userId, { albumId });

		const result = await actions.moveToAlbum(fakeActionEvent(userId, { photoId, albumId: '' }));
		expect(result).toEqual({ success: true });

		const photo = await getDb(env.DB)
			.select({ albumId: photoVault.albumId })
			.from(photoVault)
			.where(eq(photoVault.id, photoId))
			.get();
		expect(photo?.albumId).toBeNull();
	});

	it('deletePhoto rejects deleting another users photo', async () => {
		const ownerId = await createTestUser(env.DB, { isSupporter: true });
		const attackerId = await createTestUser(env.DB, { isSupporter: true });
		const photoId = await createTestVaultPhoto(env.DB, ownerId);

		const result = await actions.deletePhoto(fakeActionEvent(attackerId, { photoId }));
		expect(result).toMatchObject({ status: 404 });
	});

	it('deletePhoto with no listing references soft-deletes with no purge rows to touch', async () => {
		const userId = await createTestUser(env.DB, { isSupporter: true });
		const photoId = await createTestVaultPhoto(env.DB, userId);

		const result = await actions.deletePhoto(fakeActionEvent(userId, { photoId }));
		expect(result).toEqual({ success: true });

		const photo = await getDb(env.DB)
			.select({ deletedAt: photoVault.deletedAt })
			.from(photoVault)
			.where(eq(photoVault.id, photoId))
			.get();
		expect(photo?.deletedAt).not.toBeNull();
	});

	it('deletePhoto referenced by an active listing soft-deletes but does not purge', async () => {
		const userId = await createTestUser(env.DB, { isSupporter: true });
		const photoId = await createTestVaultPhoto(env.DB, userId);
		const listingId = await createTestListing(env.DB, userId, { status: 'active' });
		const listingPhotoId = await createTestListingPhoto(env.DB, {
			listingId,
			vaultPhotoId: photoId
		});

		const result = await actions.deletePhoto(fakeActionEvent(userId, { photoId }));
		expect(result).toEqual({ success: true });

		const photo = await getDb(env.DB)
			.select({ deletedAt: photoVault.deletedAt })
			.from(photoVault)
			.where(eq(photoVault.id, photoId))
			.get();
		expect(photo?.deletedAt).not.toBeNull();

		const lp = await getDb(env.DB)
			.select({ purgedAt: listingPhotos.purgedAt })
			.from(listingPhotos)
			.where(eq(listingPhotos.id, listingPhotoId))
			.get();
		expect(lp?.purgedAt).toBeNull();
	});

	it('deletePhoto referenced only by a paused listing soft-deletes and purges', async () => {
		const userId = await createTestUser(env.DB, { isSupporter: true });
		const photoId = await createTestVaultPhoto(env.DB, userId);
		const listingId = await createTestListing(env.DB, userId, { status: 'paused' });
		const listingPhotoId = await createTestListingPhoto(env.DB, {
			listingId,
			vaultPhotoId: photoId
		});

		const result = await actions.deletePhoto(fakeActionEvent(userId, { photoId }));
		expect(result).toEqual({ success: true });

		const lp = await getDb(env.DB)
			.select({ purgedAt: listingPhotos.purgedAt })
			.from(listingPhotos)
			.where(eq(listingPhotos.id, listingPhotoId))
			.get();
		expect(lp?.purgedAt).not.toBeNull();
	});

	it('deletePhoto is idempotent when the photo is already deleted', async () => {
		const userId = await createTestUser(env.DB, { isSupporter: true });
		const photoId = await createTestVaultPhoto(env.DB, userId, { deletedAt: new Date() });

		const result = await actions.deletePhoto(fakeActionEvent(userId, { photoId }));
		expect(result).toEqual({ success: true });
	});
});
