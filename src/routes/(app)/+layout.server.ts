import type { LayoutServerLoad } from './$types';
import { requirePhoneVerifiedRedirect } from '$lib/server/guards/requirePhoneVerified';
import { getDb } from '$lib/server/db';
import { messages, conversationThreads } from '$lib/server/db/schema';
import { eq, and, isNull, ne } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
	requirePhoneVerifiedRedirect(locals);

	let unreadCount = 0;
	if (locals.user && platform?.env) {
		const db = getDb(platform.env.DB);
		const unread = await db
			.select({ id: messages.id })
			.from(messages)
			.innerJoin(conversationThreads, eq(messages.threadId, conversationThreads.id))
			.where(
				and(
					isNull(messages.readAt),
					ne(messages.senderId, locals.user.id),
					eq(conversationThreads.status, 'open'),
					// only threads where current user is a participant
					eq(
						conversationThreads.posterId,
						locals.user.id
					)
				)
			)
			.all();

		// also count as initiator
		const unreadAsInitiator = await db
			.select({ id: messages.id })
			.from(messages)
			.innerJoin(conversationThreads, eq(messages.threadId, conversationThreads.id))
			.where(
				and(
					isNull(messages.readAt),
					ne(messages.senderId, locals.user.id),
					eq(conversationThreads.status, 'open'),
					eq(conversationThreads.initiatorId, locals.user.id)
				)
			)
			.all();

		unreadCount = unread.length + unreadAsInitiator.length;
	}

	return { user: locals.user, unreadCount };
};
