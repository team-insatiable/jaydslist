import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { createAuth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { getDb } from '$lib/server/db';
import { userProfiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	if (!event.platform?.env?.DB)
		throw new Error('D1 binding "DB" not found - are you running with wrangler?');

	event.locals.auth = createAuth(event.platform.env.DB);

	const { auth } = event.locals;
	const session = await auth.api.getSession({ headers: event.request.headers });

	event.locals.phoneVerified = false;

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;

		const db = getDb(event.platform.env.DB);
		const profile = await db
			.select({ phoneVerified: userProfiles.phoneVerified })
			.from(userProfiles)
			.where(eq(userProfiles.id, session.user.id))
			.get();
		event.locals.phoneVerified = profile?.phoneVerified ?? false;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
