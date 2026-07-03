import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { getDb } from '$lib/server/db';
import { userProfiles } from '$lib/server/db/schema';

async function sendResetEmail(to: string, url: string) {
	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: env.EMAIL_FROM ?? 'Jaydslist <onboarding@resend.dev>',
			to: [to],
			subject: 'Reset your password',
			html: `<p>Click the link below to reset your Jaydslist password. This link expires in 1 hour.</p><p><a href="${url}">Reset password</a></p><p>If you didn't request this, you can ignore this email.</p>`
		})
	});
	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Resend error ${res.status}: ${body}`);
	}
}

const authConfig = {
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	emailAndPassword: {
		enabled: true,
		sendResetPassword: async ({ user, url }) => {
			await sendResetEmail(user.email, url);
		}
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
} satisfies Omit<Parameters<typeof betterAuth>[0], 'database'>;

export const createAuth = (d1: D1Database) =>
	betterAuth({
		...authConfig,
		database: drizzleAdapter(getDb(d1), { provider: 'sqlite' }),
		databaseHooks: {
			user: {
				create: {
					after: async (user) => {
						const db = getDb(d1);
						await db.insert(userProfiles).values({ id: user.id }).onConflictDoNothing();
					}
				}
			}
		}
	});

/**
 * DO NOT USE!
 *
 * This instance is used by the `better-auth` CLI for schema generation ONLY.
 * To access `auth` at runtime, use `event.locals.auth`.
 */
export const auth = createAuth(null!);
