import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { conversationThreads } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	const db = getDb(env.DB);
	const thread = await db
		.select({
			initiatorId: conversationThreads.initiatorId,
			posterId: conversationThreads.posterId,
			status: conversationThreads.status
		})
		.from(conversationThreads)
		.where(eq(conversationThreads.id, params.threadId))
		.get();

	if (!thread) throw error(404, 'Thread not found');
	if (thread.initiatorId !== locals.user.id && thread.posterId !== locals.user.id)
		throw error(403, 'Forbidden');
	if (thread.status !== 'open') return json({ ok: true }); // silently ignore closed threads

	// Store timestamp — KV minimum TTL is 60s so we check freshness on read instead
	await env.PHONE_VERIFICATION_KV.put(
		`typing:${params.threadId}:${locals.user.id}`,
		String(Date.now())
	);

	return json({ ok: true });
};
