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
});
