import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { createAuth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { getDb } from '$lib/server/db';
import { userProfiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	if (!event.platform?.env?.DB)
		throw new Error('D1 binding "DB" not found - are you running with wrangler?');

	event.locals.auth = createAuth(event.platform.env);

	const { auth } = event.locals;
	const session = await auth.api.getSession({ headers: event.request.headers });

	event.locals.phoneVerified = false;

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;

		const db = getDb(event.platform.env.DB);
		const profile = await db
			.select({
				phoneVerified: userProfiles.phoneVerified,
				privacyMode: userProfiles.privacyMode,
				lastActiveAt: userProfiles.lastActiveAt
			})
			.from(userProfiles)
			.where(eq(userProfiles.id, session.user.id))
			.get();
		event.locals.phoneVerified = profile?.phoneVerified ?? false;

		// Update lastActiveAt (throttled to 30s, skipped when privacy mode is on)
		const now = new Date();
		const stale = !profile?.lastActiveAt || now.getTime() - profile.lastActiveAt.getTime() > 30_000;
		if (!profile?.privacyMode && stale) {
			db.update(userProfiles)
				.set({ lastActiveAt: now })
				.where(eq(userProfiles.id, session.user.id))
				.run();
		}
	}

	if (event.platform.env.INSTANCE_PRELAUNCH_MODE === 'true') {
		const admins = (event.platform.env.ADMIN_EMAILS ?? '')
			.split(',')
			.map((email) => email.trim().toLowerCase())
			.filter(Boolean);
		const isAdmin = !!event.locals.user && admins.includes(event.locals.user.email.toLowerCase());
		const publicPath =
			event.url.pathname === '/' ||
			event.url.pathname === '/beta/confirm' ||
			['/about', '/rules', '/terms', '/privacy', '/login'].includes(event.url.pathname) ||
			event.url.pathname.startsWith('/api/auth/');
		if (!isAdmin && !publicPath) throw redirect(303, '/');
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
