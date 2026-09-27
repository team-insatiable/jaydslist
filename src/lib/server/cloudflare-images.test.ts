import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ dev: false }));

import { uploadImage, deleteImage } from './cloudflare-images';

const env = { CF_IMAGES_ACCOUNT_ID: 'test-account', CF_IMAGES_API_TOKEN: 'test-token' } as Env;
afterEach(() => vi.unstubAllGlobals());

describe('Cloudflare image storage', () => {
	it('allocates a private Cloudflare ID and uploads without custom IDs or exposed credentials', async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(
				Response.json({
					success: true,
					result: {
						id: 'cloudflare-id',
						uploadURL: 'https://upload.imagedelivery.net/private-upload'
					}
				})
			)
			.mockResolvedValueOnce(Response.json({ success: true, result: { id: 'cloudflare-id' } }));
		vi.stubGlobal('fetch', fetcher);
		await expect(
			uploadImage(env, 'reserved-id', new File(['image'], 'photo.png', { type: 'image/png' }))
		).resolves.toBe('cloudflare-id');
		const [url, options] = fetcher.mock.calls[0];
		expect(url).toBe(
			'https://api.cloudflare.com/client/v4/accounts/test-account/images/v2/direct_upload'
		);
		expect(options.headers.Authorization).toBe('Bearer test-token');
		expect(options.body.get('requireSignedURLs')).toBe('true');
		expect(options.body.get('id')).toBeNull();
		const [uploadUrl, uploadOptions] = fetcher.mock.calls[1];
		expect(uploadUrl).toBe('https://upload.imagedelivery.net/private-upload');
		expect(uploadOptions.headers).toBeUndefined();
		expect(uploadOptions.body.get('id')).toBeNull();
		expect(uploadOptions.body.get('file').name).toBe('photo.png');
	});
	it.each([{ success: false }, { success: true, result: { id: 'unexpected-id' } }])(
		'retains the allocated ID when upload confirmation fails',
		async (body) => {
			vi.stubGlobal(
				'fetch',
				vi
					.fn()
					.mockResolvedValueOnce(
						Response.json({
							success: true,
							result: {
								id: 'cloudflare-id',
								uploadURL: 'https://upload.imagedelivery.net/private-upload'
							}
						})
					)
					.mockResolvedValueOnce(Response.json(body))
			);
			await expect(
				uploadImage(env, 'reserved-id', new File(['image'], 'photo.png'))
			).rejects.toMatchObject({ imageId: 'cloudflare-id' });
		}
	);
	it('does not treat failed storage deletion as success', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
		await expect(deleteImage(env, 'image-id')).rejects.toThrow();
	});
	it('treats an already absent image as deleted', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
		await expect(deleteImage(env, 'image-id')).resolves.toBeUndefined();
	});
});
