import { getInstanceConfig } from './instance';
import { escapeEmailHtml } from './email-html';

export interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
	from?: string;
}

type EmailProvider = {
	send(options: Required<SendEmailOptions>): Promise<void>;
};

function toHex(value: ArrayBuffer) {
	return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string) {
	return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function hmac(key: string | ArrayBuffer, value: string) {
	const keyData = typeof key === 'string' ? new TextEncoder().encode(key) : key;
	const importedKey = await crypto.subtle.importKey(
		'raw',
		keyData,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	return crypto.subtle.sign('HMAC', importedKey, new TextEncoder().encode(value));
}

function awsTimestamp(date: Date) {
	return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function resendProvider(apiKey: string): EmailProvider {
	return {
		async send({ to, subject, html, from }) {
			const response = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({ from, to: [to], subject, html })
			});
			if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`);
		}
	};
}

function sesProvider(env: Env): EmailProvider {
	const accessKeyId = env.SES_ACCESS_KEY_ID!;
	const secretAccessKey = env.SES_SECRET_ACCESS_KEY!;
	const region = env.SES_REGION ?? 'us-east-1';
	const sessionToken = env.SES_SESSION_TOKEN;

	return {
		async send({ to, subject, html, from }) {
			const host = `email.${region}.amazonaws.com`;
			const payload = JSON.stringify({
				FromEmailAddress: from,
				Destination: { ToAddresses: [to] },
				Content: {
					Simple: {
						Subject: { Data: subject, Charset: 'UTF-8' },
						Body: { Html: { Data: html, Charset: 'UTF-8' } }
					}
				}
			});
			const payloadHash = await sha256(payload);
			const timestamp = awsTimestamp(new Date());
			const date = timestamp.slice(0, 8);
			const headers: Record<string, string> = {
				'content-type': 'application/json',
				host,
				'x-amz-content-sha256': payloadHash,
				'x-amz-date': timestamp
			};
			if (sessionToken) headers['x-amz-security-token'] = sessionToken;

			const signedHeaders = Object.keys(headers).sort();
			const canonicalHeaders = signedHeaders
				.map((name) => `${name}:${headers[name].trim().replace(/\s+/g, ' ')}`)
				.join('\n');
			const canonicalRequest = [
				'POST',
				'/v2/email/outbound-emails',
				'',
				canonicalHeaders,
				'',
				signedHeaders.join(';'),
				payloadHash
			].join('\n');
			const credentialScope = `${date}/${region}/ses/aws4_request`;
			const stringToSign = [
				'AWS4-HMAC-SHA256',
				timestamp,
				credentialScope,
				await sha256(canonicalRequest)
			].join('\n');
			const dateKey = await hmac(`AWS4${secretAccessKey}`, date);
			const regionKey = await hmac(dateKey, region);
			const serviceKey = await hmac(regionKey, 'ses');
			const signingKey = await hmac(serviceKey, 'aws4_request');
			const signature = toHex(await hmac(signingKey, stringToSign));

			const response = await fetch(`https://${host}/v2/email/outbound-emails`, {
				method: 'POST',
				headers: {
					...headers,
					Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`
				},
				body: payload
			});
			if (!response.ok) throw new Error(`Amazon SES ${response.status}: ${await response.text()}`);
		}
	};
}

export function getEmailProvider(env: Env): EmailProvider | null {
	const provider = env.EMAIL_PROVIDER ?? (env.RESEND_API_KEY ? 'resend' : undefined);
	if (provider === 'resend' && env.RESEND_API_KEY) return resendProvider(env.RESEND_API_KEY);
	if (provider === 'ses' && env.SES_ACCESS_KEY_ID && env.SES_SECRET_ACCESS_KEY && env.EMAIL_FROM)
		return sesProvider(env);
	return null;
}

export function emailIsConfigured(env: Env) {
	return getEmailProvider(env) !== null;
}

export async function sendEmail(env: Env, options: SendEmailOptions): Promise<void> {
	const provider = getEmailProvider(env);
	if (!provider) return;

	try {
		const name = getInstanceConfig(env).name.replace(/[\r\n<>"\\]/g, '');
		await provider.send({
			...options,
			from: options.from ?? env.EMAIL_FROM ?? `${name} <onboarding@resend.dev>`
		});
	} catch (error) {
		console.error('Email delivery failed:', error);
	}
}

export function listingFlaggedEmail(subject: string, reason: string | null): string {
	return `
		<p>Your listing <strong>"${subject}"</strong> has been suspended by a moderator.</p>
		${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
		<p>Please edit your listing to address the issue. Once you save your changes, the listing will be reactivated automatically.</p>
		<p><em>If you believe this was in error, you can reply to this email.</em></p>
	`;
}

export function userWarnedEmail(env: Env, reason: string | null): string {
	const instance = getInstanceConfig(env);
	const rulesUrl = `${instance.url.replace(/\/$/, '')}/rules`;
	return `
		<p>Your account has received a warning from a ${escapeEmailHtml(instance.name)} moderator.</p>
		${reason ? `<p><strong>Reason:</strong> ${escapeEmailHtml(reason)}</p>` : ''}
		<p>Please review the <a href="${escapeEmailHtml(rulesUrl)}">community guidelines</a>. Further violations may result in account suspension.</p>
		<p><em>If you believe this was in error, you can reply to this email.</em></p>
	`;
}

export async function sendNewMessageEmail(
	env: Env,
	to: string,
	fromAlias: string,
	listingSubject: string,
	preview: string,
	threadUrl: string
): Promise<void> {
	const safePreview = preview.slice(0, 150) + (preview.length > 150 ? '…' : '');
	await sendEmail(env, {
		to,
		subject: `New message from ${fromAlias}`,
		html: `
			<p>You have a new message from <strong>${fromAlias}</strong> regarding <em>"${listingSubject}"</em>.</p>
			${safePreview ? `<blockquote style="border-left:3px solid #ccc;padding-left:1em;color:#555">${safePreview}</blockquote>` : ''}
			<p><a href="${threadUrl}">View thread →</a></p>
			<p style="font-size:0.85em;color:#888">Do not share personal contact info by email — use the contact exchange feature inside the thread.</p>
		`
	});
}

export async function sendAbuseAlertEmail(
	env: Env,
	adminEmails: string[],
	details: { alias: string; userId: string; reason: string; count: number; threadUrl?: string },
	origin: string
): Promise<void> {
	const { alias, userId, reason, count, threadUrl } = details;
	const html = `
		<p><strong>Auto-suspension triggered</strong></p>
		<p>User <strong>${alias}</strong> (ID: <code>${userId}</code>) was automatically suspended.</p>
		<p><strong>Reason:</strong> ${reason}</p>
		<p><strong>Count:</strong> ${count}</p>
		${threadUrl ? `<p><a href="${threadUrl}">View thread</a></p>` : ''}
		<p><a href="${origin}/admin">Open admin panel</a></p>
	`;
	for (const email of adminEmails)
		await sendEmail(env, {
			to: email,
			subject: `[${getInstanceConfig(env).name}] Auto-suspension: ${alias}`,
			html
		});
}
