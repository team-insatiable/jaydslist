import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadImage, deleteImage } from './cloudflare-images';

const env = { CF_IMAGES_ACCOUNT_ID: 'test-account', CF_IMAGES_API_TOKEN: 'test-token' } as Env;
afterEach(() => vi.unstubAllGlobals());

describe('Cloudflare image storage', () => {
	it('uploads using the reserved ID and keeps credentials on the server', async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValue(Response.json({ success: true, result: { id: 'reserved-id' } }));
		vi.stubGlobal('fetch', fetcher);
		await uploadImage(env, 'reserved-id', new File(['image'], 'photo.png', { type: 'image/png' }));
		const [url, options] = fetcher.mock.calls[0];
		expect(url).toBe('https://api.cloudflare.com/client/v4/accounts/test-account/images/v1');
		expect(options.headers.Authorization).toBe('Bearer test-token');
		expect(options.body.get('id')).toBe('reserved-id');
		expect(options.body.get('file').name).toBe('photo.png');
	});
	it.each([{ success: false }, { success: true, result: { id: 'unexpected-id' } }])(
		'rejects an unsuccessful or mismatched upload response',
		async (body) => {
			vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)));
			await expect(
				uploadImage(env, 'reserved-id', new File(['image'], 'photo.png'))
			).rejects.toThrow();
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
