import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { conversationThreads, listings, messages, userProfiles } from '$lib/server/db/schema';
import { eq, or, desc, and, ne, isNull, inArray, count } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) throw redirect(302, '/login');

	const env = platform?.env;
	if (!env) throw new Error('Server configuration error');

	const userId = locals.user.id;
	const db = getDb(env.DB);

	const rawThreads = await db
		.select({
			id: conversationThreads.id,
			listingId: conversationThreads.listingId,
			listingSubject: listings.subject,
			initiatorId: conversationThreads.initiatorId,
			posterId: conversationThreads.posterId,
			status: conversationThreads.status,
			lastActivityAt: conversationThreads.lastActivityAt
		})
		.from(conversationThreads)
		.innerJoin(listings, eq(conversationThreads.listingId, listings.id))
		.where(or(eq(conversationThreads.initiatorId, userId), eq(conversationThreads.posterId, userId)))
		.orderBy(desc(conversationThreads.lastActivityAt))
		.all();

	if (!rawThreads.length) return { threads: [] };

	const threadIds = rawThreads.map((t) => t.id);
	const otherUserIds = [
		...new Set(rawThreads.map((t) => (t.initiatorId === userId ? t.posterId : t.initiatorId)))
	];

	const [otherProfiles, allMessages, unreadRows] = await Promise.all([
		db
			.select({ id: userProfiles.id, alias: userProfiles.alias })
			.from(userProfiles)
			.where(inArray(userProfiles.id, otherUserIds))
			.all(),

		db
			.select({ threadId: messages.threadId, body: messages.body, sentAt: messages.sentAt })
			.from(messages)
			.where(inArray(messages.threadId, threadIds))
			.orderBy(desc(messages.sentAt))
			.all(),

		db
			.select({ threadId: messages.threadId, total: count() })
			.from(messages)
			.where(
				and(
					inArray(messages.threadId, threadIds),
					ne(messages.senderId, userId),
					isNull(messages.readAt)
				)
			)
			.groupBy(messages.threadId)
			.all()
	]);

	const aliasMap = new Map(otherProfiles.map((p) => [p.id, p.alias ?? 'Anonymous']));
	const unreadMap = new Map(unreadRows.map((r) => [r.threadId, r.total]));

	// Deduplicate messages to get last per thread (already ordered desc)
	const lastMsgMap = new Map<string, { body: string; sentAt: Date | null }>();
	for (const msg of allMessages) {
		if (!lastMsgMap.has(msg.threadId)) {
			lastMsgMap.set(msg.threadId, { body: msg.body, sentAt: msg.sentAt });
		}
	}

	const threads = rawThreads.map((t) => {
		const otherUserId = t.initiatorId === userId ? t.posterId : t.initiatorId;
		const lastMsg = lastMsgMap.get(t.id);
		return {
			id: t.id,
			listingId: t.listingId,
			listingSubject: t.listingSubject,
			otherAlias: aliasMap.get(otherUserId) ?? 'Anonymous',
			lastMessagePreview: lastMsg ? lastMsg.body.slice(0, 80) : '',
			lastMessageAt: lastMsg?.sentAt ?? t.lastActivityAt,
			unreadCount: unreadMap.get(t.id) ?? 0,
			role: t.posterId === userId ? 'poster' : 'responder',
			status: t.status
		};
	});

	return { threads };
};
