import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { GET } from './+server';
import { GET as albumGET } from '../../albums/[albumId]/+server';
import { downloadImage } from '$lib/server/cloudflare-images';
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
	downloadImage: vi.fn()
}));
beforeEach(() =>
	vi
		.mocked(downloadImage)
		.mockReset()
		.mockImplementation(
			async () => new Response('photo', { headers: { 'Content-Type': 'image/png' } })
		)
);
function event(userId: string | undefined, imageId: string) {
	return {
		locals: userId ? { user: { id: userId } } : {},
		platform: { env },
		params: { imageId }
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
