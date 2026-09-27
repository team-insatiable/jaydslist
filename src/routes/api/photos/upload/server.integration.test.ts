import { screenPhoto } from '$lib/server/photo-moderation';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { POST } from './+server';
import { POST as legacyUpload } from '../upload-url/+server';
import { POST as legacyConfirm } from '../confirm/+server';
import { uploadImage, deleteImage, ImageStorageError } from '$lib/server/cloudflare-images';
import { getVaultPhotos } from '$lib/server/photo-vault';
import {
	createTestUser,
	createTestVaultPhoto,
	createTestAlbum,
	createTestListing,
	createTestListingPhoto
} from '$lib/server/test-helpers/fixtures';

vi.mock('$app/environment', () => ({ dev: false }));

vi.mock('$lib/server/cloudflare-images', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/cloudflare-images')>()),
	uploadImage: vi.fn().mockResolvedValue(undefined),
	deleteImage: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/server/photo-moderation', () => ({ screenPhoto: vi.fn().mockResolvedValue('safe') }));

beforeEach(() => {
	vi.mocked(screenPhoto).mockReset().mockResolvedValue('safe');
	vi.mocked(uploadImage).mockReset().mockResolvedValue(undefined);
	vi.mocked(deleteImage).mockReset().mockResolvedValue(undefined);
});
type Event = Parameters<typeof POST>[0];
function event(
	userId?: string,
	albumId?: string,
	file = new File(['image'], 'photo.png', { type: 'image/png' })
): Event {
	const form = new FormData();
	form.set('file', file);
	if (albumId) form.set('albumId', albumId);
	return {
		locals: userId ? { user: { id: userId } } : {},
		platform: {
			env: {
				...env,
				CF_IMAGES_ACCOUNT_ID: 'test-account',
				CF_IMAGES_API_TOKEN: 'test-token',
				REKOGNITION_ACCESS_KEY_ID: 'test',
				REKOGNITION_SECRET_ACCESS_KEY: 'test'
			}
		},
		request: new Request('http://localhost/api/photos/upload', { method: 'POST', body: form })
	} as unknown as Event;
}

describe('account photo uploads', () => {
	it('identifies rejected storage credentials and cleans the failed reservation', async () => {
		const userId = await createTestUser(env.DB);
		vi.mocked(uploadImage).mockRejectedValueOnce(new ImageStorageError(403));
		await expect(POST(event(userId))).rejects.toMatchObject({
			status: 502,
			body: { message: expect.stringContaining('Photo storage rejected its credentials') }
		});
		expect(deleteImage).toHaveBeenCalledTimes(1);
		const count = await env.DB.prepare(
			'SELECT count(*) AS total FROM photo_vault WHERE user_id = ?'
		)
			.bind(userId)
			.first<{ total: number }>();
		expect(count?.total).toBe(0);
	});
	it('never uploads images when AWS screening fails and stores uncertain results as unknown', async () => {
		const userId = await createTestUser(env.DB);
		vi.mocked(screenPhoto).mockRejectedValueOnce(new Error('AWS unavailable'));
		await expect(POST(event(userId))).rejects.toMatchObject({ status: 502 });
		expect(uploadImage).not.toHaveBeenCalled();
		vi.mocked(screenPhoto).mockResolvedValueOnce('unknown');
		const response = await POST(event(userId));
		const photo = (await response.json()) as { id: string };
		const row = await env.DB.prepare('SELECT content_rating FROM photo_vault WHERE id = ?')
			.bind(photo.id)
			.first();
		expect(row?.content_rating).toBe('unknown');
	});
	it('requires authentication and validates the file before contacting storage', async () => {
		await expect(POST(event())).rejects.toMatchObject({ status: 401 });
		const userId = await createTestUser(env.DB);
		await expect(
			POST(event(userId, undefined, new File(['svg'], 'x.svg', { type: 'image/svg+xml' })))
		).rejects.toMatchObject({ status: 400 });
		await expect(
			POST(
				event(
					userId,
					undefined,
					new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'x.png', { type: 'image/png' })
				)
			)
		).rejects.toMatchObject({ status: 400 });
		expect(uploadImage).not.toHaveBeenCalled();
	});
	it.each([
		[false, 5],
		[true, 10]
	])('limits supporter=%s to %i photos including concurrent uploads', async (isSupporter, max) => {
		const userId = await createTestUser(env.DB, { isSupporter });
		const results = await Promise.allSettled(
			Array.from({ length: max + 3 }, () => POST(event(userId)))
		);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(max);
		for (const result of results)
			if (result.status === 'rejected') expect(result.reason).toMatchObject({ status: 400 });
		expect(uploadImage).toHaveBeenCalledTimes(max);
		expect(await getVaultPhotos(env.DB, userId, 'test')).toHaveLength(max);
	});
	it('rejects a foreign album before uploading', async () => {
		const owner = await createTestUser(env.DB);
		const attacker = await createTestUser(env.DB);
		const album = await createTestAlbum(env.DB, owner);
		await expect(POST(event(attacker, album))).rejects.toMatchObject({ status: 404 });
		expect(uploadImage).not.toHaveBeenCalled();
	});
	it('stores a free account photo in its own album', async () => {
		const userId = await createTestUser(env.DB);
		const albumId = await createTestAlbum(env.DB, userId);
		const response = await POST(event(userId, albumId));
		const photo = (await response.json()) as { id: string; cfImageId: string };
		expect(photo.cfImageId).toBe(photo.id);
		expect(await getVaultPhotos(env.DB, userId, 'test')).toMatchObject([{ id: photo.id, albumId }]);
	});
	it('cleans up failed uploads before releasing their reservation', async () => {
		const userId = await createTestUser(env.DB);
		vi.mocked(uploadImage).mockRejectedValueOnce(new Error('Storage unavailable'));
		await expect(POST(event(userId))).rejects.toMatchObject({ status: 502 });
		expect(deleteImage).toHaveBeenCalledTimes(1);
		const count = await env.DB.prepare(
			'SELECT count(*) AS total FROM photo_vault WHERE user_id = ?'
		)
			.bind(userId)
			.first<{ total: number }>();
		expect(count?.total).toBe(0);
	});
	it('keeps the slot reserved if cleanup fails, and hides incomplete uploads', async () => {
		const userId = await createTestUser(env.DB);
		vi.mocked(uploadImage).mockRejectedValueOnce(new Error('Lost response'));
		vi.mocked(deleteImage).mockRejectedValueOnce(new Error('Storage unavailable'));
		await expect(POST(event(userId))).rejects.toMatchObject({ status: 502 });
		expect(await getVaultPhotos(env.DB, userId, 'test')).toEqual([]);
		const row = await env.DB.prepare('SELECT scan_status FROM photo_vault WHERE user_id = ?')
			.bind(userId)
			.first();
		expect(row?.scan_status).toBe('uploading');
	});
	it('counts deleted photos still retained by listings toward storage', async () => {
		const userId = await createTestUser(env.DB);
		for (let i = 0; i < 4; i++) await createTestVaultPhoto(env.DB, userId);
		const retained = await createTestVaultPhoto(env.DB, userId, { deletedAt: new Date() });
		const listingId = await createTestListing(env.DB, userId);
		await createTestListingPhoto(env.DB, { listingId, vaultPhotoId: retained });
		await expect(POST(event(userId))).rejects.toMatchObject({ status: 400 });
		expect(uploadImage).not.toHaveBeenCalled();
	});
	it('reclaims a retained photo once its listing is paused', async () => {
		const userId = await createTestUser(env.DB);
		for (let i = 0; i < 4; i++) await createTestVaultPhoto(env.DB, userId);
		const retained = await createTestVaultPhoto(env.DB, userId, { deletedAt: new Date() });
		const listingId = await createTestListing(env.DB, userId, { status: 'paused' });
		await createTestListingPhoto(env.DB, { listingId, vaultPhotoId: retained });
		expect((await POST(event(userId))).status).toBe(200);
		expect(deleteImage).toHaveBeenCalledTimes(1);
	});

	it('honors operator photo limit overrides', async () => {
		const userId = await createTestUser(env.DB);
		await env.DB.prepare(
			"INSERT INTO platform_config (key, value) VALUES ('VAULT_MAX_PHOTOS_FREE', '1')"
		).run();
		expect((await POST(event(userId))).status).toBe(200);
		await expect(POST(event(userId))).rejects.toMatchObject({ status: 400 });
	});

	it('closes legacy direct-upload and arbitrary confirmation endpoints', () => {
		expect(() => legacyUpload(event())).toThrow();
		expect(() => legacyConfirm(event())).toThrow();
		expect(uploadImage).not.toHaveBeenCalled();
	});
});
