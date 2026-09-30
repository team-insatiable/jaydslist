import { describe, expect, it } from 'vitest';
import { renderInstanceEmail } from './email-templates';

const instance = {
	INSTANCE_NAME: 'Harbor <Connections>',
	INSTANCE_URL: 'https://harbor.example',
	INSTANCE_LEGAL_EMAIL: 'help@harbor.example'
} as Env;

describe('operator email templates', () => {
	it('uses the instance-hosted logo without separate configuration', () => {
		const email = renderInstanceEmail(instance, 'betaWelcome');
		expect(email.html).toContain('src="https://harbor.example/logo.png"');
		expect(email.html).toContain(
			'<strong style="font-size:20px">Harbor &lt;Connections&gt;</strong>'
		);
	});

	it('accepts a custom HTTPS logo with a visible text name and safe action link', () => {
		const email = renderInstanceEmail(
			{ ...instance, INSTANCE_EMAIL_LOGO_URL: 'https://harbor.example/logo.png' },
			'passwordReset',
			{ resetUrl: 'https://harbor.example/reset?token=a&b=2' }
		);
		expect(email.subject).toBe('Reset your Harbor <Connections> password');
		expect(email.html).toContain('src="https://harbor.example/logo.png"');
		expect(email.html).toContain(
			'<strong style="font-size:20px">Harbor &lt;Connections&gt;</strong>'
		);
		expect(email.html).toContain('href="https://harbor.example/reset?token=a&amp;b=2"');
		expect(email.html).not.toContain('static/logo.svg');
	});

	it('falls back to the instance asset when a logo override is unsafe', () => {
		for (const logo of ['http://harbor.example/logo.png', 'javascript:alert(1)']) {
			const email = renderInstanceEmail(
				{ ...instance, INSTANCE_EMAIL_LOGO_URL: logo },
				'betaWelcome'
			);
			expect(email.html).toContain('src="https://harbor.example/logo.png"');
			expect(email.html).toContain('Harbor &lt;Connections&gt;');
		}
	});

	it('shows text without an image when the instance URL is not public HTTPS', () => {
		const email = renderInstanceEmail(
			{ ...instance, INSTANCE_URL: 'http://localhost:5173' },
			'betaWelcome'
		);
		expect(email.html).not.toContain('<img');
		expect(email.html).toContain('Harbor &lt;Connections&gt;');
	});

	it('escapes untrusted message content and removes absent optional sections', () => {
		const email = renderInstanceEmail(instance, 'newMessage', {
			fromAlias: '<img src=x onerror=alert(1)>\r\nBcc: test',
			listingSubject: '<script>private</script>',
			preview: '',
			threadUrl: 'https://harbor.example/thread?a=1&b=2'
		});
		expect(email.subject).not.toContain('\n');
		expect(email.html).toContain('&lt;script&gt;private&lt;/script&gt;');
		expect(email.html).not.toContain('<script>');
		expect(email.html).not.toContain('<blockquote');
		expect(email.html).toContain('href="https://harbor.example/thread?a=1&amp;b=2"');
	});

	it('keeps confirmation links and escapes moderation reasons', () => {
		const confirm = renderInstanceEmail(instance, 'betaConfirm', {
			confirmUrl: 'https://harbor.example/beta/confirm?token=abc'
		});
		const warning = renderInstanceEmail(instance, 'accountWarning', {
			reason: '<script>test</script>'
		});
		expect(confirm.html).toContain('href="https://harbor.example/beta/confirm?token=abc"');
		expect(warning.html).toContain('href="https://harbor.example/rules"');
		expect(warning.html).toContain('&lt;script&gt;test&lt;/script&gt;');
	});
});
