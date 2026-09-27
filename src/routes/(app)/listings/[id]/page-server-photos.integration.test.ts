import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { load } from './+page.server';
import {
	createTestUser,
	createTestListing,
	createTestVaultPhoto
} from '$lib/server/test-helpers/fixtures';
import { getDb } from '$lib/server/db';
import { listingPhotos } from '$lib/server/db/schema';

type LoadEvent = Parameters<typeof load>[0];

function fakeEvent(listingId: string, userId?: string): LoadEvent {
	return {
		params: { id: listingId },
		locals: userId ? { user: { id: userId, email: 'test@example.com' } } : {},
		platform: { env }
	} as unknown as LoadEvent;
}

describe('listing detail load photos', () => {
	it('returns an empty array when the listing has no photos', async () => {
		const userId = await createTestUser(env.DB);
		const listingId = await createTestListing(env.DB, userId);

		const result = (await load(fakeEvent(listingId, userId))) as { photos: unknown[] };
		expect(result.photos).toEqual([]);
	});

	it('returns attached photos in display order with delivery URLs', async () => {
		const userId = await createTestUser(env.DB);
		const listingId = await createTestListing(env.DB, userId);
		const photoA = await createTestVaultPhoto(env.DB, userId, { cfImageId: 'cf-a' });
		const photoB = await createTestVaultPhoto(env.DB, userId, { cfImageId: 'cf-b' });

		const db = getDb(env.DB);
		await db.insert(listingPhotos).values([
			{ id: crypto.randomUUID(), listingId, vaultPhotoId: photoB, displayOrder: 1 },
			{ id: crypto.randomUUID(), listingId, vaultPhotoId: photoA, displayOrder: 0 }
		]);

		const result = (await load(fakeEvent(listingId, userId))) as {
			photos: { id: string; deliveryUrl: string }[];
		};
		expect(result.photos.length).toBe(2);
		expect(result.photos[0].deliveryUrl).toContain('cf-a');
		expect(result.photos[1].deliveryUrl).toContain('cf-b');
	});
	it('returns blurred explicit ad previews while keeping unknown photos hidden', async () => {
		const owner = await createTestUser(env.DB);
		const viewer = await createTestUser(env.DB);
		const listingId = await createTestListing(env.DB, owner);
		const explicit = await createTestVaultPhoto(env.DB, owner, {
			cfImageId: 'nsfw-ad',
			contentRating: 'nsfw'
		});
		const unknown = await createTestVaultPhoto(env.DB, owner, {
			cfImageId: 'unknown-ad',
			contentRating: 'unknown'
		});
		await getDb(env.DB)
			.insert(listingPhotos)
			.values([
				{ id: crypto.randomUUID(), listingId, vaultPhotoId: explicit, displayOrder: 0 },
				{ id: crypto.randomUUID(), listingId, vaultPhotoId: unknown, displayOrder: 1 }
			]);
		const optedOut = (await load(fakeEvent(listingId, viewer))) as {
			photos: { deliveryUrl: string; blurred: boolean; isNsfw: boolean }[];
		};
		expect(optedOut.photos).toEqual([
			expect.objectContaining({
				deliveryUrl: '/api/photos/nsfw-ad?preview=blurred',
				blurred: true,
				isNsfw: true
			})
		]);
		await env.DB.prepare('UPDATE user_profiles SET allow_nsfw = 1 WHERE id = ?').bind(viewer).run();
		const optedIn = (await load(fakeEvent(listingId, viewer))) as typeof optedOut;
		expect(optedIn.photos).toEqual([
			expect.objectContaining({ deliveryUrl: '/api/photos/nsfw-ad', blurred: false })
		]);
		const owned = (await load(fakeEvent(listingId, owner))) as typeof optedOut;
		expect(owned.photos).toHaveLength(2);
		expect(owned.photos[0].blurred).toBe(false);
	});
});
