import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { GET } from './+server';
import { createTestUser, createTestVaultPhoto } from '$lib/server/test-helpers/fixtures';

type GetEvent = Parameters<typeof GET>[0];

function fakeEvent(userId: string | undefined): GetEvent {
	return {
		locals: userId ? { user: { id: userId, email: 'test@example.com' } } : {},
		platform: { env }
	} as unknown as GetEvent;
}

describe('GET /api/photos/vault', () => {
	it('rejects an unauthenticated request', async () => {
		await expect(GET(fakeEvent(undefined))).rejects.toMatchObject({ status: 401 });
	});

	it('returns only the requesting users own active vault photos', async () => {
		const userId = await createTestUser(env.DB);
		const otherUserId = await createTestUser(env.DB);

		const mine1 = await createTestVaultPhoto(env.DB, userId);
		const mine2 = await createTestVaultPhoto(env.DB, userId);
		await createTestVaultPhoto(env.DB, otherUserId);
		await createTestVaultPhoto(env.DB, userId, { deletedAt: new Date() });

		const res = await GET(fakeEvent(userId));
		const body = (await res.json()) as { photos: { id: string; deliveryUrl: string }[] };

		const ids = body.photos.map((p) => p.id).sort();
		expect(ids).toEqual([mine1, mine2].sort());
		expect(body.photos.every((p) => p.deliveryUrl.includes(p.id))).toBe(true);
	});
});
