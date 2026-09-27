import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from 'cloudflare:test';
vi.mock('$app/environment', () => ({ dev: false }));
import { downloadImage } from './cloudflare-images';
afterEach(() => vi.unstubAllGlobals());
const deliveryEnv = () => ({
	...env,
	CF_IMAGES_ACCOUNT_HASH: 'test-hash',
	CF_IMAGES_SIGNING_KEY: 'test-signing-key'
});
describe('signed private delivery in the Worker runtime', () => {
	it('constructs a runtime-supported request and reads photo bytes', async () => {
		vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
			const request = new Request(input, init);
			expect(request.redirect).toBe('manual');
			return new Response('photo bytes', { headers: { 'content-type': 'image/png' } });
		});
		const response = await downloadImage(deliveryEnv(), 'image-id');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('photo bytes');
	});
	it('rejects upstream redirects without following them', async () => {
		vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
			new Request(input, init);
			return new Response('', {
				status: 302,
				headers: { location: 'https://untrusted.example/photo' }
			});
		});
		await expect(downloadImage(deliveryEnv(), 'image-id')).rejects.toThrow(
			'Private image delivery failed'
		);
	});
	it('reproduces the unsupported redirect option at request construction', () => {
		expect(() => new Request('https://imagedelivery.net/test', { redirect: 'error' })).toThrow(
			'Invalid redirect value'
		);
	});
});
