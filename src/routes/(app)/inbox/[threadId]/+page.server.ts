import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import {
	conversationThreads,
	listings,
	messages,
	userProfiles,
	DEFAULT_CONFIG
} from '$lib/server/db/schema';
import { eq, and, asc, ne, isNull } from 'drizzle-orm';

const CONTACT_INFO_PATTERN = /(\+?[\d\s\-().]{7,}|\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b)/i;

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	if (!locals.user) throw redirect(302, '/login');

	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	const userId = locals.user.id;
	const db = getDb(env.DB);

	const thread = await db
		.select({
			id: conversationThreads.id,
			listingId: conversationThreads.listingId,
			listingSubject: listings.subject,
			initiatorId: conversationThreads.initiatorId,
			posterId: conversationThreads.posterId,
			status: conversationThreads.status
		})
		.from(conversationThreads)
		.innerJoin(listings, eq(conversationThreads.listingId, listings.id))
		.where(eq(conversationThreads.id, params.threadId))
		.get();

	if (!thread) throw error(404, 'Thread not found');
	if (thread.initiatorId !== userId && thread.posterId !== userId) throw error(403, 'Forbidden');

	const otherUserId = thread.initiatorId === userId ? thread.posterId : thread.initiatorId;

	const [otherProfile, currentProfile, threadMessages] = await Promise.all([
		db
			.select({ alias: userProfiles.alias })
			.from(userProfiles)
			.where(eq(userProfiles.id, otherUserId))
			.get(),

		db
			.select({ isSupporter: userProfiles.isSupporter })
			.from(userProfiles)
			.where(eq(userProfiles.id, userId))
			.get(),

		db
			.select({
				id: messages.id,
				senderId: messages.senderId,
				body: messages.body,
				sentAt: messages.sentAt,
				readAt: messages.readAt
			})
			.from(messages)
			.where(eq(messages.threadId, params.threadId))
			.orderBy(asc(messages.sentAt))
			.all()
	]);

	// Mark received unread messages as read
	const unreadReceivedIds = threadMessages
		.filter((m) => m.senderId !== userId && !m.readAt)
		.map((m) => m.id);

	if (unreadReceivedIds.length > 0) {
		await db
			.update(messages)
			.set({ readAt: new Date() })
			.where(
				and(
					eq(messages.threadId, params.threadId),
					ne(messages.senderId, userId),
					isNull(messages.readAt)
				)
			);
	}

	return {
		thread: {
			id: thread.id,
			listingId: thread.listingId,
			listingSubject: thread.listingSubject,
			status: thread.status,
			role: thread.posterId === userId ? 'poster' : 'responder'
		},
		otherAlias: otherProfile?.alias ?? 'Anonymous',
		isSupporter: currentProfile?.isSupporter ?? false,
		messages: threadMessages.map((m) => ({
			id: m.id,
			isMine: m.senderId === userId,
			body: m.body,
			sentAt: m.sentAt,
			readAt: m.readAt
		})),
		minLength: parseInt(DEFAULT_CONFIG.MESSAGE_MIN_LENGTH)
	};
};

export const actions: Actions = {
	send: async ({ params, request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const userId = locals.user.id;
		const db = getDb(env.DB);

		const thread = await db
			.select({
				id: conversationThreads.id,
				initiatorId: conversationThreads.initiatorId,
				posterId: conversationThreads.posterId,
				status: conversationThreads.status
			})
			.from(conversationThreads)
			.where(eq(conversationThreads.id, params.threadId))
			.get();

		if (!thread) return fail(404, { error: 'Thread not found' });
		if (thread.initiatorId !== userId && thread.posterId !== userId)
			return fail(403, { error: 'Forbidden' });
		if (thread.status !== 'open') return fail(400, { error: 'This thread is closed' });

		const data = await request.formData();
		const body = (data.get('body') as string)?.trim() ?? '';
		const minLength = parseInt(DEFAULT_CONFIG.MESSAGE_MIN_LENGTH);

		if (body.length < minLength)
			return fail(400, { error: `Message must be at least ${minLength} characters` });

		if (CONTACT_INFO_PATTERN.test(body))
			return fail(400, { error: 'Contact information cannot be shared in messages. Use the contact exchange feature instead.' });

		await db.transaction(async (tx) => {
			await tx.insert(messages).values({
				id: crypto.randomUUID(),
				threadId: params.threadId,
				senderId: userId,
				body,
				sentAt: new Date()
			});
			await tx
				.update(conversationThreads)
				.set({ lastActivityAt: new Date() })
				.where(eq(conversationThreads.id, params.threadId));
		});

		return { success: true };
	}
};
