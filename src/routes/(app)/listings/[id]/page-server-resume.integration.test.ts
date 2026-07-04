import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { actions } from './+page.server';
import {
	createTestUser,
	createTestListing,
	createTestVaultPhoto,
	createTestListingPhoto
} from '$lib/server/test-helpers/fixtures';

type ResumeEvent = Parameters<typeof actions.resume>[0];

function fakeEvent(listingId: string, userId: string): ResumeEvent {
	return {
		params: { id: listingId },
		locals: { user: { id: userId, email: 'test@example.com' } },
		platform: { env }
	} as unknown as ResumeEvent;
}

describe('resume action purgedPhotoCount', () => {
	it('returns 0 when no photos were purged', async () => {
		const userId = await createTestUser(env.DB);
		const listingId = await createTestListing(env.DB, userId, { status: 'paused' });
		const photoId = await createTestVaultPhoto(env.DB, userId);
		await createTestListingPhoto(env.DB, { listingId, vaultPhotoId: photoId });

		const result = await actions.resume(fakeEvent(listingId, userId));
		expect(result).toEqual({ success: true, purgedPhotoCount: 0 });
	});

	it('returns the correct nonzero count when some photos were purged', async () => {
		const userId = await createTestUser(env.DB);
		const listingId = await createTestListing(env.DB, userId, { status: 'paused' });
		const stillThere = await createTestVaultPhoto(env.DB, userId);
		const purged = await createTestVaultPhoto(env.DB, userId, { deletedAt: new Date() });
		await createTestListingPhoto(env.DB, { listingId, vaultPhotoId: stillThere });
		await createTestListingPhoto(env.DB, {
			listingId,
			vaultPhotoId: purged,
			purgedAt: new Date()
		});

		const result = await actions.resume(fakeEvent(listingId, userId));
		expect(result).toEqual({ success: true, purgedPhotoCount: 1 });
	});
});
