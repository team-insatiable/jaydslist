import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ dev: false }));

import { uploadImage, deleteImage, downloadImage, downloadBlurredImage } from './cloudflare-images';

const env = { CF_IMAGES_ACCOUNT_ID: 'test-account', CF_IMAGES_API_TOKEN: 'test-token' } as Env;
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

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
	it('fetches signed private image bytes on the server with a short expiry', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
		const fetcher = vi
			.fn()
			.mockResolvedValue(new Response('image', { headers: { 'Content-Type': 'image/png' } }));
		vi.stubGlobal('fetch', fetcher);
		await downloadImage(
			{ ...env, CF_IMAGES_ACCOUNT_HASH: 'account-hash', CF_IMAGES_SIGNING_KEY: 'signing-secret' },
			'image-id'
		);
		const [url, options] = fetcher.mock.calls[0];
		expect(url.origin).toBe('https://imagedelivery.net');
		expect(url.pathname).toBe('/account-hash/image-id/jaydslistPrivateOriginal');
		expect(url.searchParams.get('exp')).toBe('1700000060');
		const signature = url.searchParams.get('sig');
		url.searchParams.delete('sig');
		const key = await crypto.subtle.importKey(
			'raw',
			new TextEncoder().encode('signing-secret'),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);
		const mac = await crypto.subtle.sign(
			'HMAC',
			key,
			new TextEncoder().encode(url.pathname + '?' + url.searchParams.toString())
		);
		expect(signature).toBe(
			[...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
		);
		expect(options.headers.Authorization).toBeUndefined();
		expect(options.redirect).toBe('manual');
	});
	it('fails closed when signed delivery is rejected', async () => {
		const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
		vi.stubGlobal('fetch', fetcher);
		await expect(
			downloadImage(
				{ ...env, CF_IMAGES_ACCOUNT_HASH: 'account-hash', CF_IMAGES_SIGNING_KEY: 'signing-secret' },
				'image-id'
			)
		).rejects.toThrow('Private image delivery failed');
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
	it('fetches only the signed blurred variant and never falls back to clear pixels', async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValue(new Response('blurred', { headers: { 'Content-Type': 'image/png' } }));
		vi.stubGlobal('fetch', fetcher);
		const blurEnv = { ...env, CF_IMAGES_ACCOUNT_HASH: 'hash', CF_IMAGES_SIGNING_KEY: 'secret' };
		await downloadBlurredImage(blurEnv, 'id');
		expect(fetcher.mock.calls[0][0].pathname).toBe('/hash/id/jaydslistNsfwBlur');
		fetcher.mockResolvedValueOnce(new Response(null, { status: 502 }));
		await expect(downloadBlurredImage(blurEnv, 'id')).rejects.toThrow();
		expect(fetcher).toHaveBeenCalledTimes(2);
		await expect(downloadBlurredImage(env, 'id')).rejects.toThrow(
			'Private image signing is not configured'
		);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
	it('does not treat failed storage deletion as success', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
		await expect(deleteImage(env, 'image-id')).rejects.toThrow();
	});
	it('treats an already absent image as deleted', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
		await expect(deleteImage(env, 'image-id')).resolves.toBeUndefined();
	});
});
