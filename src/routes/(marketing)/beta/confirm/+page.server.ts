import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { betaWaitlist } from '$lib/server/db/schema';
import { getDb } from '$lib/server/db';
import { sendEmail } from '$lib/server/email';
import { getInstanceConfig } from '$lib/server/instance';
import { escapeEmailHtml } from '$lib/server/email-html';
import type { PageServerLoad } from './$types';

const hash = async (value: string) =>
	Array.from(
		new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
		(byte) => byte.toString(16).padStart(2, '0')
	).join('');

export const load: PageServerLoad = async ({ url, platform }) => {
	const env = platform?.env;
	const token = url.searchParams.get('token');
	if (!env || !token) throw error(400, 'This confirmation link is invalid.');
	const db = getDb(env.DB);
	const entry = await db
		.select()
		.from(betaWaitlist)
		.where(eq(betaWaitlist.confirmationTokenHash, await hash(token)))
		.get();
	if (!entry || !entry.confirmationExpiresAt || entry.confirmationExpiresAt < new Date())
		throw error(400, 'This confirmation link has expired.');
	const instance = getInstanceConfig(env);
	if (entry.status !== 'confirmed') {
		await db
			.update(betaWaitlist)
			.set({
				status: 'confirmed',
				confirmedAt: new Date(),
				confirmationTokenHash: null,
				confirmationExpiresAt: null
			})
			.where(eq(betaWaitlist.id, entry.id));
		await sendEmail(env, {
			to: entry.email,
			subject: `You’re on the ${instance.name} beta list`,
			html: `<p>You’re confirmed for the ${escapeEmailHtml(instance.name)} beta. We’ll email you when there is news to share.</p>`
		});
	}
	return { instanceName: instance.name };
};
