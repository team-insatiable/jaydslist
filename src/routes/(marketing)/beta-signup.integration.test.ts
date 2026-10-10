import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { actions } from './+page.server';
import { load as confirmSignup } from './beta/confirm/+page.server';

const signupEnv = {
	...env,
	INSTANCE_PRELAUNCH_MODE: 'true',
	INSTANCE_URL: 'https://example.test',
	EMAIL_PROVIDER: 'resend',
	RESEND_API_KEY: 're_test_key',
	EMAIL_FROM: 'Test <noreply@example.test>'
} as Env;

function signup(email: string) {
	const form = new FormData();
	form.set('email', email);
	return {
		request: new Request('https://example.test/', { method: 'POST', body: form }),
		platform: { env: signupEnv }
	} as Parameters<typeof actions.joinBeta>[0];
}

function uniqueEmail() {
	return `${crypto.randomUUID()}@example.test`;
}

afterEach(() => vi.unstubAllGlobals());

describe('beta signup', () => {
	it('confirms the emailed link before counting an address on the list', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		const email = uniqueEmail();
		expect(await actions.joinBeta(signup(email))).toEqual({ submitted: true });
		const request = JSON.parse(fetchMock.mock.calls[0][1].body) as { html: string };
		const confirmUrl = request.html.match(
			/https:\/\/example\.test\/beta\/confirm\?token=[a-f0-9]+/
		)?.[0];
		expect(confirmUrl).toBeDefined();
		const before = await env.DB.prepare('SELECT status FROM beta_waitlist WHERE email = ?')
			.bind(email)
			.first<{ status: string }>();
		expect(before?.status).toBe('pending');
		expect(
			await confirmSignup({
				url: new URL(confirmUrl!),
				platform: { env: signupEnv }
			} as Parameters<typeof confirmSignup>[0])
		).toMatchObject({ instanceName: 'Jaydslist' });
		const after = await env.DB.prepare(
			'SELECT status, confirmation_token_hash FROM beta_waitlist WHERE email = ?'
		)
			.bind(email)
			.first<{ status: string; confirmation_token_hash: string | null }>();
		expect(after).toEqual({ status: 'confirmed', confirmation_token_hash: null });
	});

	it('sends once during the cooldown and allows a later confirmation retry', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		const email = uniqueEmail();
		expect(await actions.joinBeta(signup(email))).toEqual({ submitted: true });
		expect(await actions.joinBeta(signup(email))).toEqual({ submitted: true });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		await env.DB.prepare('UPDATE beta_waitlist SET confirmation_expires_at = ? WHERE email = ?')
			.bind(Math.floor(Date.now() / 1000) + 23 * 60 * 60, email)
			.run();
		expect(await actions.joinBeta(signup(email))).toEqual({ submitted: true });
		expect(fetchMock).toHaveBeenCalledTimes(2);
		const row = await env.DB.prepare(
			'SELECT status, confirmation_token_hash FROM beta_waitlist WHERE email = ?'
		)
			.bind(email)
			.first<{ status: string; confirmation_token_hash: string }>();
		expect(row).toMatchObject({ status: 'pending' });
		expect(row!.confirmation_token_hash).toHaveLength(64);
	});

	it('does not disclose or resend to a confirmed address', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		const email = uniqueEmail();
		await env.DB.prepare('INSERT INTO beta_waitlist (id, email, status) VALUES (?, ?, ?)')
			.bind(crypto.randomUUID(), email, 'confirmed')
			.run();
		expect(await actions.joinBeta(signup(email))).toEqual({ submitted: true });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('reports provider failure and allows a retry', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
			.mockResolvedValueOnce(new Response('{}', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		const email = uniqueEmail();
		expect(await actions.joinBeta(signup(email))).toMatchObject({ status: 503 });
		const row = await env.DB.prepare(
			'SELECT confirmation_token_hash, confirmation_expires_at FROM beta_waitlist WHERE email = ?'
		)
			.bind(email)
			.first<{ confirmation_token_hash: string | null; confirmation_expires_at: number | null }>();
		expect(row).toEqual({ confirmation_token_hash: null, confirmation_expires_at: null });
		expect(await actions.joinBeta(signup(email))).toEqual({ submitted: true });
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
