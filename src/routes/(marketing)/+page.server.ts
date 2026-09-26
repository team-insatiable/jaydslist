import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { betaWaitlist } from '$lib/server/db/schema';
import { getDb } from '$lib/server/db';
import { emailIsConfigured, sendEmail } from '$lib/server/email';
import { getInstanceConfig } from '$lib/server/instance';
import { escapeEmailHtml } from '$lib/server/email-html';
import type { Actions, PageServerLoad } from './$types';

const hash = async (value: string) =>
	Array.from(
		new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
		(byte) => byte.toString(16).padStart(2, '0')
	).join('');

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
		if (!/^\S+@\S+\.\S+$/.test(email)) return fail(400, { error: 'Enter a valid email address.' });
		if (!emailIsConfigured(env))
			return fail(503, { error: 'Email confirmation is not configured yet.' });
		const rawToken =
			crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
		const expiresAt = new Date(Date.now() + 86_400_000);
		const db = getDb(env.DB);
		const existing = await db
			.select()
			.from(betaWaitlist)
			.where(eq(betaWaitlist.email, email))
			.get();
		if (existing?.status === 'confirmed') return { submitted: true };
		const values = {
			status: 'pending',
			confirmationTokenHash: await hash(rawToken),
			confirmationExpiresAt: expiresAt
		};
		if (existing) await db.update(betaWaitlist).set(values).where(eq(betaWaitlist.id, existing.id));
		else await db.insert(betaWaitlist).values({ id: crypto.randomUUID(), email, ...values });
		const confirmUrl = new URL('/beta/confirm', instance.url);
		confirmUrl.searchParams.set('token', rawToken);
		await sendEmail(env, {
			to: email,
			subject: `Confirm your ${instance.name} beta signup`,
			html: `<p>Confirm that you want beta updates from ${escapeEmailHtml(instance.name)}.</p><p><a href="${escapeEmailHtml(confirmUrl.toString())}">Confirm beta signup</a></p><p>This link expires in 24 hours. If you did not request this, you can ignore this email.</p>`
		});
		return { submitted: true };
	}
};
