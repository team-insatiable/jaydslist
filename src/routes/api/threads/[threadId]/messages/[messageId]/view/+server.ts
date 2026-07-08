import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { conversationThreads, messages } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { imageUrl } from '$lib/server/cloudflare-images';

export const POST: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	const db = getDb(env.DB);

	const thread = await db
		.select({
			initiatorId: conversationThreads.initiatorId,
			posterId: conversationThreads.posterId
		})
		.from(conversationThreads)
		.where(eq(conversationThreads.id, params.threadId))
		.get();

	if (!thread) throw error(404, 'Thread not found');
	if (thread.initiatorId !== locals.user.id && thread.posterId !== locals.user.id)
		throw error(403, 'Forbidden');

	const msg = await db
		.select({
			id: messages.id,
			senderId: messages.senderId,
			cfImageId: messages.cfImageId,
			isExpiring: messages.isExpiring,
			photoViewedAt: messages.photoViewedAt
		})
		.from(messages)
		.where(and(eq(messages.id, params.messageId), eq(messages.threadId, params.threadId)))
		.get();

	if (!msg) throw error(404, 'Message not found');
	if (!msg.cfImageId) throw error(400, 'Message has no photo');
	if (!msg.isExpiring) throw error(400, 'Photo is not expiring');
	// Sender can't "view" their own expiring photo via this endpoint
	if (msg.senderId === locals.user.id) throw error(403, 'Forbidden');
	// Already viewed — return expired
	if (msg.photoViewedAt) return json({ expired: true });

	await db
		.update(messages)
		.set({ photoViewedAt: new Date() })
		.where(eq(messages.id, params.messageId));

	return json({ cfImageUrl: imageUrl(env.CF_IMAGES_ACCOUNT_HASH, msg.cfImageId) });
};
