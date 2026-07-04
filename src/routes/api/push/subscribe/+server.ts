import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { pushSubscriptions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	const body = (await request.json()) as {
		endpoint: string;
		keys: { p256dh: string; auth: string };
	};

	if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
		throw error(400, 'Invalid subscription');
	}

	const db = getDb(env.DB);
	const userId = locals.user.id;

	// Upsert — if this endpoint exists for another user (e.g. shared device), replace it
	const existing = await db
		.select({ id: pushSubscriptions.id })
		.from(pushSubscriptions)
		.where(eq(pushSubscriptions.endpoint, body.endpoint))
		.get();

	if (existing) {
		await db
			.update(pushSubscriptions)
			.set({ userId, p256dh: body.keys.p256dh, auth: body.keys.auth })
			.where(eq(pushSubscriptions.id, existing.id));
	} else {
		await db.insert(pushSubscriptions).values({
			id: crypto.randomUUID(),
			userId,
			endpoint: body.endpoint,
			p256dh: body.keys.p256dh,
			auth: body.keys.auth
		});
	}

	return json({ ok: true });
};
