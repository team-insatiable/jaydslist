import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isBlockedByDbbl, queryDbblScore, reportBanToDbbl } from './dbbl';
import { encryptContact } from './crypto';

const TEST_ENV = {
	DBBL_API_URL: 'https://api.example.com',
	DBBL_API_KEY: 'dbbl_testkey',
	CONTACT_ENCRYPTION_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' // 32 zero bytes base64
};

beforeEach(() => {
	vi.restoreAllMocks();
});

// ── isBlockedByDbbl ───────────────────────────────────────────────────────────

describe('isBlockedByDbbl', () => {
	it('returns true for restricted', () => {
		expect(isBlockedByDbbl('restricted')).toBe(true);
	});

	it('returns true for blacklisted', () => {
		expect(isBlockedByDbbl('blacklisted')).toBe(true);
	});

	it('returns false for clear', () => {
		expect(isBlockedByDbbl('clear')).toBe(false);
	});

	it('returns false for flagged', () => {
		expect(isBlockedByDbbl('flagged')).toBe(false);
	});

	it('returns false for cautioned', () => {
		expect(isBlockedByDbbl('cautioned')).toBe(false);
	});

	it('returns false for null', () => {
		expect(isBlockedByDbbl(null)).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(isBlockedByDbbl(undefined)).toBe(false);
	});
});

// ── queryDbblScore ────────────────────────────────────────────────────────────

describe('queryDbblScore', () => {
	it('returns null for no_data response', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(
				JSON.stringify({ status: 'no_data', score: null, rating: null, confidence: null }),
				{ status: 200 }
			)
		);

		const result = await queryDbblScore('phonehash', 'emailhash', TEST_ENV);
		expect(result).toBeNull();
	});

	it('returns score data for found response', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(
				JSON.stringify({ status: 'found', score: 72.5, rating: 'restricted', confidence: 'high' }),
				{ status: 200 }
			)
		);

		const result = await queryDbblScore('phonehash', 'emailhash', TEST_ENV);
		expect(result).toEqual({ score: 72.5, rating: 'restricted', confidence: 'high' });
	});

	it('sends correct auth header and signals', async () => {
		const spy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({ status: 'no_data', score: null, rating: null, confidence: null }),
					{ status: 200 }
				)
			);

		await queryDbblScore('myphonehash', 'myemailhash', TEST_ENV);

		const [url, init] = spy.mock.calls[0] as [string, RequestInit];
		expect(url).toContain('phoneHash=myphonehash');
		expect(url).toContain('emailHash=myemailhash');
		expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer dbbl_testkey');
	});

	it('throws on non-OK response', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('', { status: 503 }));

		await expect(queryDbblScore('phonehash', 'emailhash', TEST_ENV)).rejects.toThrow(
			'DBBL non-OK: 503'
		);
	});
});

// ── reportBanToDbbl ───────────────────────────────────────────────────────────

describe('reportBanToDbbl', () => {
	it('sends violationCategory and severity in request body', async () => {
		const spy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 201 }));

		const encryptedPhone = await encryptContact('+15550001234', TEST_ENV.CONTACT_ENCRYPTION_KEY);

		await reportBanToDbbl({
			encryptedPhone,
			email: 'bad@example.com',
			category: 'harassment',
			env: TEST_ENV
		});

		const [, init] = spy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(init.body as string);
		expect(body.violationCategory).toBe('harassment');
		expect(body.severity).toBe('medium');
		expect(body).not.toHaveProperty('category');
	});

	it('maps all Jaydslist categories to DBBL violation categories', async () => {
		const categories = ['harassment', 'spam', 'fake_profile', 'explicit_content', 'unsolicited_dm'];
		const encryptedPhone = await encryptContact('+15550001234', TEST_ENV.CONTACT_ENCRYPTION_KEY);

		for (const category of categories) {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify({ success: true }), { status: 201 })
			);

			const spy = vi.spyOn(globalThis, 'fetch');
			await reportBanToDbbl({ encryptedPhone, email: 'bad@example.com', category, env: TEST_ENV });

			const body = JSON.parse((spy.mock.calls.at(-1)![1] as RequestInit).body as string);
			expect(body.violationCategory).toBe(category);
		}
	});

	it('falls back to "other" for unknown category', async () => {
		const spy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 201 }));

		const encryptedPhone = await encryptContact('+15550001234', TEST_ENV.CONTACT_ENCRYPTION_KEY);

		await reportBanToDbbl({
			encryptedPhone,
			email: 'bad@example.com',
			category: 'something_unknown',
			env: TEST_ENV
		});

		const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
		expect(body.violationCategory).toBe('other');
	});

	it('throws on non-OK response', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('', { status: 500 }));

		const encryptedPhone = await encryptContact('+15550001234', TEST_ENV.CONTACT_ENCRYPTION_KEY);

		await expect(
			reportBanToDbbl({ encryptedPhone, email: 'bad@example.com', category: 'spam', env: TEST_ENV })
		).rejects.toThrow('DBBL report non-OK: 500');
	});

	it('sends correct auth header', async () => {
		const spy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 201 }));

		const encryptedPhone = await encryptContact('+15550001234', TEST_ENV.CONTACT_ENCRYPTION_KEY);

		await reportBanToDbbl({
			encryptedPhone,
			email: 'bad@example.com',
			category: 'spam',
			env: TEST_ENV
		});

		const [, init] = spy.mock.calls[0] as [string, RequestInit];
		expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer dbbl_testkey');
	});
});
