import { afterEach, describe, expect, it, vi } from 'vitest';
import { emailIsConfigured, sendEmail, sendAbuseAlertEmail, userWarnedEmail } from './email';

const resendEnv = {
	EMAIL_PROVIDER: 'resend',
	RESEND_API_KEY: 're_test_key',
	EMAIL_FROM: 'Jaydslist <noreply@example.com>'
} as Env;

afterEach(() => vi.unstubAllGlobals());

describe('email providers', () => {
	it('uses the instance name for the fallback sender', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		await sendEmail({ RESEND_API_KEY: 'test', INSTANCE_NAME: 'Local Connections' } as Env, {
			to: 'person@example.com',
			subject: 'Hello',
			html: '<p>Hello</p>'
		});
		expect(JSON.parse(fetchMock.mock.calls[0][1].body).from).toBe(
			'Local Connections <onboarding@resend.dev>'
		);
	});

	it('uses the instance name in administrative alert subjects', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		await sendAbuseAlertEmail(
			{ ...resendEnv, INSTANCE_NAME: 'Local Connections' },
			['admin@example.com'],
			{ alias: 'Test', userId: 'test', reason: 'Test', count: 1 },
			'https://community.example'
		);
		expect(JSON.parse(fetchMock.mock.calls[0][1].body).subject).toBe(
			'[Local Connections] Auto-suspension: Test'
		);
	});

	it('uses the instance rules URL and escapes names in moderation email HTML', () => {
		const html = userWarnedEmail(
			{ INSTANCE_NAME: 'Local <Connections>', INSTANCE_URL: 'https://community.example/' } as Env,
			'<script>test</script>'
		);
		expect(html).toContain('Local &lt;Connections&gt; moderator');
		expect(html).toContain('href="https://community.example/rules"');
		expect(html).toContain('&lt;script&gt;test&lt;/script&gt;');
		expect(html).not.toContain('jaydslist.com');
	});
	it('keeps Resend available through the provider interface', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);

		await sendEmail(resendEnv, {
			to: 'person@example.com',
			subject: 'Hello',
			html: '<p>Hello</p>'
		});

		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.resend.com/emails',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({ Authorization: 'Bearer re_test_key' })
			})
		);
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
			from: 'Jaydslist <noreply@example.com>',
			to: ['person@example.com'],
			subject: 'Hello',
			html: '<p>Hello</p>'
		});
	});

	it('signs Amazon SES API requests and sends a simple HTML email', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		const env = {
			EMAIL_PROVIDER: 'ses',
			EMAIL_FROM: 'Jaydslist <noreply@example.com>',
			SES_ACCESS_KEY_ID: 'AKIDEXAMPLE',
			SES_SECRET_ACCESS_KEY: 'secret'
		} as Env;

		await sendEmail(env, { to: 'person@example.com', subject: 'Hello', html: '<p>Hello</p>' });

		const [url, request] = fetchMock.mock.calls[0];
		expect(url).toBe('https://email.us-east-1.amazonaws.com/v2/email/outbound-emails');
		expect(request.headers).toMatchObject({
			'content-type': 'application/json',
			host: 'email.us-east-1.amazonaws.com',
			Authorization: expect.stringContaining('Credential=AKIDEXAMPLE/')
		});
		expect(JSON.parse(request.body)).toMatchObject({
			FromEmailAddress: 'Jaydslist <noreply@example.com>',
			Destination: { ToAddresses: ['person@example.com'] },
			Content: { Simple: { Subject: { Data: 'Hello' }, Body: { Html: { Data: '<p>Hello</p>' } } } }
		});
	});

	it('does not enable delivery for incomplete or unsupported provider configuration', () => {
		expect(emailIsConfigured({ EMAIL_PROVIDER: 'ses' } as Env)).toBe(false);
		expect(
			emailIsConfigured({
				EMAIL_PROVIDER: 'ses',
				SES_ACCESS_KEY_ID: 'key',
				SES_SECRET_ACCESS_KEY: 'secret'
			} as Env)
		).toBe(false);
		expect(emailIsConfigured({ EMAIL_PROVIDER: 'other' } as unknown as Env)).toBe(false);
	});
});
