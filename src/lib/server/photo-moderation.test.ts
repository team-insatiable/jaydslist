import { describe, it, expect, vi, afterEach } from 'vitest';
import { classifyLabels, canReceivePhoto, screenPhoto } from './photo-moderation';
vi.mock('$app/environment', () => ({ dev: false }));

vi.mock('$lib/server/config', () => ({
	getConfig: vi.fn(async (key: string) => (key === 'PHOTO_NSFW_CONFIDENCE' ? '80' : '50'))
}));
afterEach(() => vi.unstubAllGlobals());

describe('photo content policy', () => {
	it('ignores simulated ratings in production and uses the AWS result', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(
					Response.json({ ModerationLabels: [{ Name: 'Explicit', Confidence: 95 }] })
				)
		);
		const env = {
			REKOGNITION_ACCESS_KEY_ID: 'test-access',
			REKOGNITION_SECRET_ACCESS_KEY: 'test-secret'
		} as Env;
		expect(await screenPhoto(env, new Blob(['test'], { type: 'image/png' }), 'safe')).toBe('nsfw');
	});
	it.each([
		'Explicit',
		'Exposed Male Genitalia',
		'Exposed Female Genitalia',
		'Exposed Female Nipple',
		'Exposed Buttocks or Anus',
		'Explicit Sexual Activity',
		'Sex Toys'
	])('marks %s as NSFW', (Name) => {
		expect(classifyLabels([{ Name, Confidence: 95 }])).toBe('nsfw');
	});
	it.each([
		'Swimwear or Underwear',
		'Exposed Male Nipple',
		'Kissing on the Lips',
		'Implied Nudity'
	])('allows %s', (Name) => {
		expect(classifyLabels([{ Name, Confidence: 99 }])).toBe('safe');
	});
	it('holds uncertain nudity for review regardless of opt-in', () => {
		expect(classifyLabels([{ Name: 'Explicit Nudity', Confidence: 65 }])).toBe('unknown');
		expect(canReceivePhoto('unknown', true)).toBe(false);
	});
	it('requires consent for NSFW while allowing safe photos', () => {
		expect(canReceivePhoto('nsfw', false)).toBe(false);
		expect(canReceivePhoto('nsfw', true)).toBe(true);
		expect(canReceivePhoto('safe', false)).toBe(true);
	});
	it('fails closed without credentials and on malformed AWS responses', async () => {
		const image = new Blob(['test'], { type: 'image/png' });
		await expect(screenPhoto({} as Env, image)).rejects.toThrow('not configured');
		const fetchMock = vi.fn().mockResolvedValue(Response.json({}));
		vi.stubGlobal('fetch', fetchMock);
		const env = {
			REKOGNITION_ACCESS_KEY_ID: 'test-access',
			REKOGNITION_SECRET_ACCESS_KEY: 'test-secret'
		} as Env;
		await expect(screenPhoto(env, image)).rejects.toThrow('Invalid photo screening response');
		expect(fetchMock.mock.calls[0][0]).toBe('https://rekognition.us-east-1.amazonaws.com/');
		const request = fetchMock.mock.calls[0][1];
		expect(request.headers['x-amz-target']).toBe('RekognitionService.DetectModerationLabels');
		expect(request.headers.Authorization).toContain('/rekognition/aws4_request');
		expect(JSON.parse(request.body)).toEqual({ Image: { Bytes: 'dGVzdA==' }, MinConfidence: 50 });
	});
});
