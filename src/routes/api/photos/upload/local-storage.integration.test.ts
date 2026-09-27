import { describe, it, expect, vi, afterEach } from 'vitest';
import { env } from 'cloudflare:test';
import { POST } from './+server';
import { GET } from '../[imageId]/+server';
import { deleteImage } from '$lib/server/cloudflare-images';
import { createTestUser } from '$lib/server/test-helpers/fixtures';
vi.mock('$app/environment', () => ({ dev: true }));
afterEach(() => vi.unstubAllGlobals());

describe('local development photo uploads', () => {
	it.each(['safe', 'nsfw', 'unknown'])(
		'stores and serves a simulated %s photo without external credentials or requests',
		async (rating) => {
			const fetchSpy = vi.fn(() => {
				throw new Error('Local photos must never call an external service');
			});
			vi.stubGlobal('fetch', fetchSpy);
			const userId = await createTestUser(env.DB);
			const localEnv = {
				...env,
				REKOGNITION_ACCESS_KEY_ID: '',
				REKOGNITION_SECRET_ACCESS_KEY: '',
				CF_IMAGES_ACCOUNT_ID: 'YOUR_CLOUDFLARE_ACCOUNT_ID',
				CF_IMAGES_API_TOKEN: ''
			};
			const form = new FormData();
			form.set('file', new File(['local-image'], 'photo.png', { type: 'image/png' }));
			form.set('devContentRating', rating);
			const response = await POST({
				locals: { user: { id: userId } },
				platform: { env: localEnv },
				request: new Request('http://localhost/api/photos/upload', { method: 'POST', body: form })
			} as unknown as Parameters<typeof POST>[0]);
			const photo = (await response.json()) as { id: string; cfImageId: string };
			const row = await env.DB.prepare('SELECT content_rating FROM photo_vault WHERE id = ?')
				.bind(photo.id)
				.first();
			expect(row?.content_rating).toBe(rating);
			const image = await GET({
				locals: { user: { id: userId } },
				platform: { env: localEnv },
				params: { imageId: photo.cfImageId }
			} as unknown as Parameters<typeof GET>[0]);
			expect(image.headers.get('Content-Type')).toBe('image/png');
			expect(await image.text()).toBe('local-image');
			await deleteImage(localEnv as Env, photo.cfImageId);
			expect(await env.PHONE_VERIFICATION_KV.get(`dev:photo:${photo.id}`)).toBeNull();
			expect(fetchSpy).not.toHaveBeenCalled();
		}
	);
});
