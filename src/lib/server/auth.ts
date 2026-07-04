import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { getDb } from '$lib/server/db';
import { userProfiles } from '$lib/server/db/schema';
import { sendEmail } from '$lib/server/email';

// env is passed in from event.platform.env (not read via $env/dynamic/private)
// because that module only proxies Node's process.env — on Cloudflare Workers
// (via @cloudflare/vite-plugin in dev, or the real runtime in prod), .dev.vars
// and wrangler vars are only ever exposed through platform.env, never process.env.
export const createAuth = (env: Env) =>
	betterAuth({
		baseURL: env.ORIGIN,
		secret: env.BETTER_AUTH_SECRET,
		emailAndPassword: {
			enabled: true,
			sendResetPassword: async ({ user, url }) => {
				await sendEmail({
					to: user.email,
					subject: 'Reset your password',
					html: `<p>Click the link below to reset your Jaydslist password. This link expires in 1 hour.</p><p><a href="${url}">Reset password</a></p><p>If you didn't request this, you can ignore this email.</p>`,
					apiKey: env.RESEND_API_KEY,
					from: env.EMAIL_FROM
				});
			}
		},
		plugins: [
			sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
		],
		database: drizzleAdapter(getDb(env.DB), { provider: 'sqlite' }),
		databaseHooks: {
			user: {
				create: {
					after: async (user) => {
						const db = getDb(env.DB);
						await db.insert(userProfiles).values({ id: user.id }).onConflictDoNothing();
					}
				}
			}
		}
	});

/**
 * DO NOT USE!
 *
 * This instance is used by the `better-auth` CLI for schema generation ONLY,
 * which only introspects the config shape and never dispatches a real
 * request — an empty env stub is enough to avoid crashing at import time.
 * To access `auth` at runtime, use `event.locals.auth`.
 */
export const auth = createAuth({} as Env);
