import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { GET } from './+server';
import { GET as albumGET } from '../../albums/[albumId]/+server';
import { downloadImage, downloadBlurredImage } from '$lib/server/cloudflare-images';
import {
	createTestUser,
	createTestVaultPhoto,
	createTestListing,
	createTestListingPhoto,
	createTestAlbum,
	createTestThread
} from '$lib/server/test-helpers/fixtures';
vi.mock('$lib/server/cloudflare-images', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/cloudflare-images')>()),
	downloadImage: vi.fn(),
	downloadBlurredImage: vi.fn()
}));
beforeEach(() => {
	vi.mocked(downloadBlurredImage)
		.mockReset()
		.mockResolvedValue(new Response('blurred', { headers: { 'Content-Type': 'image/png' } }));
	vi.mocked(downloadImage)
		.mockReset()
		.mockImplementation(
			async () => new Response('photo', { headers: { 'Content-Type': 'image/png' } })
		);
});
function event(userId: string | undefined, imageId: string, blurred = false) {
	return {
		locals: userId ? { user: { id: userId } } : {},
		platform: { env },
		params: { imageId },
		url: new URL(`http://localhost/api/photos/${imageId}${blurred ? '?preview=blurred' : ''}`)
	} as unknown as Parameters<typeof GET>[0];
}
describe('private photo delivery', () => {
	it('requires authentication and prevents unrelated users accessing private vault photos', async () => {
		const owner = await createTestUser(env.DB);
		const stranger = await createTestUser(env.DB);
		await createTestVaultPhoto(env.DB, owner, { cfImageId: 'private-photo' });
		await expect(GET(event(undefined, 'private-photo'))).rejects.toMatchObject({ status: 401 });
		await expect(GET(event(stranger, 'private-photo'))).rejects.toMatchObject({ status: 403 });
		expect(downloadImage).not.toHaveBeenCalled();
		expect((await GET(event(owner, 'private-photo'))).headers.get('Cache-Control')).toBe(
			'private, no-store'
		);
	});
	it('honors current preferences on direct listing image requests, including revocation and unknown images', async () => {
		const owner = await createTestUser(env.DB);
		const viewer = await createTestUser(env.DB);
		const photo = await createTestVaultPhoto(env.DB, owner, {
			cfImageId: 'nsfw-photo',
			contentRating: 'nsfw'
		});
		const listing = await createTestListing(env.DB, owner);
		await createTestListingPhoto(env.DB, { listingId: listing, vaultPhotoId: photo });
		await expect(GET(event(viewer, 'nsfw-photo'))).rejects.toMatchObject({ status: 403 });
		await env.DB.prepare('UPDATE user_profiles SET allow_nsfw = 1 WHERE id = ?').bind(viewer).run();
		expect((await GET(event(viewer, 'nsfw-photo'))).status).toBe(200);
		await env.DB.prepare("UPDATE photo_vault SET content_rating = 'unknown' WHERE id = ?")
			.bind(photo)
			.run();
		await expect(GET(event(viewer, 'nsfw-photo'))).rejects.toMatchObject({ status: 403 });
		await env.DB.prepare("UPDATE photo_vault SET content_rating = 'nsfw' WHERE id = ?")
			.bind(photo)
			.run();
		await env.DB.prepare('UPDATE user_profiles SET allow_nsfw = 0 WHERE id = ?').bind(viewer).run();
		await expect(GET(event(viewer, 'nsfw-photo'))).rejects.toMatchObject({ status: 403 });
	});
	it('allows only blurred NSFW ad previews for opted-out viewers', async () => {
		const owner = await createTestUser(env.DB);
		const viewer = await createTestUser(env.DB);
		const photo = await createTestVaultPhoto(env.DB, owner, {
			cfImageId: 'explicit-ad',
			contentRating: 'nsfw'
		});
		const listing = await createTestListing(env.DB, owner);
		await createTestListingPhoto(env.DB, { listingId: listing, vaultPhotoId: photo });
		const response = await GET(event(viewer, 'explicit-ad', true));
		expect(await response.text()).toBe('blurred');
		expect(downloadBlurredImage).toHaveBeenCalledTimes(1);
		expect(downloadImage).not.toHaveBeenCalled();
		await expect(GET(event(viewer, 'explicit-ad'))).rejects.toMatchObject({ status: 403 });
		await env.DB.prepare('UPDATE user_profiles SET allow_nsfw = 1 WHERE id = ?').bind(viewer).run();
		expect((await GET(event(viewer, 'explicit-ad'))).status).toBe(200);
	});
	it('does not allow blurred previews to bypass message or unknown-photo restrictions', async () => {
		const owner = await createTestUser(env.DB);
		const viewer = await createTestUser(env.DB);
		await createTestVaultPhoto(env.DB, owner, {
			cfImageId: 'private-explicit',
			contentRating: 'nsfw'
		});
		const threadListing = await createTestListing(env.DB, owner);
		const thread = await createTestThread(env.DB, {
			listingId: threadListing,
			initiatorId: viewer,
			posterId: owner
		});
		await env.DB.prepare(
			'INSERT INTO messages (id, thread_id, sender_id, body, cf_image_id) VALUES (?, ?, ?, ?, ?)'
		)
			.bind(crypto.randomUUID(), thread, owner, '', 'private-explicit')
			.run();
		await expect(GET(event(viewer, 'private-explicit'))).rejects.toMatchObject({ status: 403 });
		await expect(GET(event(viewer, 'private-explicit', true))).rejects.toMatchObject({
			status: 403
		});
		const unknown = await createTestVaultPhoto(env.DB, owner, {
			cfImageId: 'unknown-ad',
			contentRating: 'unknown'
		});
		const listing = await createTestListing(env.DB, owner);
		await createTestListingPhoto(env.DB, { listingId: listing, vaultPhotoId: unknown });
		await expect(GET(event(viewer, 'unknown-ad', true))).rejects.toMatchObject({ status: 403 });
		expect(downloadBlurredImage).not.toHaveBeenCalled();
		expect(downloadImage).not.toHaveBeenCalled();
	});
	it('checks blocks and listing expiry before returning blurred pixels', async () => {
		const owner = await createTestUser(env.DB);
		const viewer = await createTestUser(env.DB);
		const photo = await createTestVaultPhoto(env.DB, owner, {
			cfImageId: 'expired-explicit',
			contentRating: 'nsfw'
		});
		const listing = await createTestListing(env.DB, owner);
		await createTestListingPhoto(env.DB, { listingId: listing, vaultPhotoId: photo });
		await env.DB.prepare('UPDATE listings SET expires_at = 0 WHERE id = ?').bind(listing).run();
		await expect(GET(event(viewer, 'expired-explicit', true))).rejects.toMatchObject({
			status: 403
		});
		await env.DB.prepare('UPDATE listings SET expires_at = unixepoch() + 3600 WHERE id = ?')
			.bind(listing)
			.run();
		await env.DB.prepare(
			'INSERT INTO user_blocks (id, blocker_id, blocked_id, created_at) VALUES (?, ?, ?, unixepoch())'
		)
			.bind(crypto.randomUUID(), owner, viewer)
			.run();
		await expect(GET(event(viewer, 'expired-explicit', true))).rejects.toMatchObject({
			status: 403
		});
		expect(downloadBlurredImage).not.toHaveBeenCalled();
	});
	it('cannot use an unrelated shared thread to access an album and filters photos added after sharing', async () => {
		const owner = await createTestUser(env.DB);
		const viewer = await createTestUser(env.DB);
		const album = await createTestAlbum(env.DB, owner);
		const listing = await createTestListing(env.DB, owner);
		const thread = await createTestThread(env.DB, {
			listingId: listing,
			initiatorId: viewer,
			posterId: owner
		});
		const albumEvent = {
			locals: { user: { id: viewer } },
			platform: { env },
			params: { albumId: album }
		} as unknown as Parameters<typeof albumGET>[0];
		await env.DB.prepare(
			'INSERT INTO messages (id, thread_id, sender_id, body) VALUES (?, ?, ?, ?)'
		)
			.bind(crypto.randomUUID(), thread, owner, 'hello')
			.run();
		await expect(albumGET(albumEvent)).rejects.toMatchObject({ status: 403 });
		await env.DB.prepare(
			'INSERT INTO messages (id, thread_id, sender_id, body, album_id) VALUES (?, ?, ?, ?, ?)'
		)
			.bind(crypto.randomUUID(), thread, owner, '', album)
			.run();
		await createTestVaultPhoto(env.DB, owner, { albumId: album, cfImageId: 'safe-album' });
		await createTestVaultPhoto(env.DB, owner, {
			albumId: album,
			cfImageId: 'new-nsfw-album',
			contentRating: 'nsfw'
		});
		const result = (await (await albumGET(albumEvent)).json()) as {
			photos: { cfImageId: string }[];
		};
		expect(result.photos.map((p) => p.cfImageId)).toEqual(['safe-album']);
		await expect(GET(event(viewer, 'new-nsfw-album'))).rejects.toMatchObject({ status: 403 });
		expect((await GET(event(viewer, 'safe-album'))).status).toBe(200);
	});
});
