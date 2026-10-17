import { fail, redirect } from '@sveltejs/kit';
import { and, eq, isNull, lte, or } from 'drizzle-orm';
import { betaWaitlist } from '$lib/server/db/schema';
import { getDb } from '$lib/server/db';
import { emailIsConfigured, sendEmailOrThrow } from '$lib/server/email';
import { getInstanceConfig } from '$lib/server/instance';
import { renderInstanceEmail } from '$lib/server/email-templates';
import type { Actions, PageServerLoad } from './$types';

const hash = async (value: string) =>
	Array.from(
		new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
		(byte) => byte.toString(16).padStart(2, '0')
	).join('');

const CONFIRMATION_LIFETIME_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 15 * 60 * 1000;

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (locals.user) throw redirect(302, '/browse');
	const instance = getInstanceConfig(platform?.env);
	return {
		instanceName: instance.name,
		instanceTagline: instance.tagline,
		prelaunchMode: instance.prelaunchMode
	};
};

export const actions: Actions = {
	joinBeta: async ({ request, platform }) => {
		const env = platform?.env;
		const instance = getInstanceConfig(env);
		const email = String((await request.formData()).get('email') ?? '')
			.trim()
			.toLowerCase();
		if (!env || !instance.prelaunchMode) return fail(404, { error: 'Beta signup is unavailable.' });
		if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email))
			return fail(400, { error: 'Enter a valid email address.' });
		if (!emailIsConfigured(env))
			return fail(503, { error: 'Email confirmation is not configured yet.' });
		// The address cooldown protects one inbox; this limits bursts across addresses.
		// Cloudflare supplies this header. A shared fallback key fails safely in local dev.
		const clientIp = request.headers.get('cf-connecting-ip') ?? 'unknown';
		try {
			const rate = await env.BETA_SIGNUP_RATE_LIMITER.limit({
				key: `beta-signup:${await hash(clientIp)}`
			});
			if (!rate.success)
				return fail(429, { error: 'Too many signup attempts. Please try again shortly.' });
		} catch {
			return fail(503, { error: 'Beta signup is temporarily unavailable.' });
		}
		const rawToken =
			crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
		const expiresAt = new Date(Date.now() + CONFIRMATION_LIFETIME_MS);
		const tokenHash = await hash(rawToken);
		const db = getDb(env.DB);
		const values = {
			status: 'pending',
			confirmationTokenHash: tokenHash,
			confirmationExpiresAt: expiresAt
		};
		const inserted = await db
			.insert(betaWaitlist)
			.values({ id: crypto.randomUUID(), email, ...values })
			.onConflictDoNothing()
			.run();
		if (!inserted.meta.changes) {
			// The token's 24-hour expiry also records the last send time. A conditional update
			// reserves the next send atomically, including when two requests arrive together.
			const reserved = await db
				.update(betaWaitlist)
				.set(values)
				.where(
					and(
						eq(betaWaitlist.email, email),
						eq(betaWaitlist.status, 'pending'),
						or(
							isNull(betaWaitlist.confirmationExpiresAt),
							lte(
								betaWaitlist.confirmationExpiresAt,
								new Date(Date.now() + CONFIRMATION_LIFETIME_MS - RESEND_COOLDOWN_MS)
							)
						)
					)
				)
				.run();
			if (!reserved.meta.changes) return { submitted: true };
		}
		const confirmUrl = new URL('/beta/confirm', instance.url);
		confirmUrl.searchParams.set('token', rawToken);
		try {
			await sendEmailOrThrow(env, {
				to: email,
				...renderInstanceEmail(env, 'betaConfirm', { confirmUrl: confirmUrl.toString() })
			});
		} catch {
			// A failed provider request must not consume the resend allowance.
			await db
				.update(betaWaitlist)
				.set({ confirmationTokenHash: null, confirmationExpiresAt: null })
				.where(
					and(eq(betaWaitlist.email, email), eq(betaWaitlist.confirmationTokenHash, tokenHash))
				)
				.run();
			return fail(503, { error: 'Confirmation email could not be sent. Please try again.' });
		}
		return { submitted: true };
	}
};
