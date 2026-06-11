import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import {
	conversationThreads,
	listings,
	messages,
	userProfiles,
	keyExchanges,
	user,
	DEFAULT_CONFIG
} from '$lib/server/db/schema';
import { eq, and, asc, ne, isNull, desc } from 'drizzle-orm';
import { decryptContact } from '$lib/server/crypto';

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
	const role = thread.posterId === userId ? 'poster' : 'responder';

	const [otherProfile, currentProfile, threadMessages, latestExchange] = await Promise.all([
		db.select({ alias: userProfiles.alias }).from(userProfiles).where(eq(userProfiles.id, otherUserId)).get(),
		db.select({ isSupporter: userProfiles.isSupporter }).from(userProfiles).where(eq(userProfiles.id, userId)).get(),
		db
			.select({ id: messages.id, senderId: messages.senderId, body: messages.body, sentAt: messages.sentAt, readAt: messages.readAt })
			.from(messages)
			.where(eq(messages.threadId, params.threadId))
			.orderBy(asc(messages.sentAt))
			.all(),
		db
			.select()
			.from(keyExchanges)
			.where(eq(keyExchanges.threadId, params.threadId))
			.orderBy(desc(keyExchanges.offeredAt))
			.get()
	]);

	// Mark received unread messages as read
	const hasUnread = threadMessages.some((m) => m.senderId !== userId && !m.readAt);
	if (hasUnread) {
		await db
			.update(messages)
			.set({ readAt: new Date() })
			.where(and(eq(messages.threadId, params.threadId), ne(messages.senderId, userId), isNull(messages.readAt)));
	}

	// Eligibility: poster after first message received; responder after sending AND receiving a reply
	const myMessages = threadMessages.filter((m) => m.senderId === userId);
	const theirMessages = threadMessages.filter((m) => m.senderId !== userId);
	const eligible =
		role === 'poster' ? theirMessages.length > 0 : myMessages.length > 0 && theirMessages.length > 0;

	// Only show active exchanges (offered or accepted)
	const activeExchange =
		latestExchange && (latestExchange.status === 'offered' || latestExchange.status === 'accepted')
			? latestExchange
			: null;

	// Decrypt contact info when exchange is accepted
	let myContact: { phone: string | null; email: string } | null = null;
	let theirContact: { phone: string | null; email: string } | null = null;

	if (activeExchange?.status === 'accepted' && env.CONTACT_ENCRYPTION_KEY) {
		const [myProfileData, theirProfileData, myUserData, theirUserData] = await Promise.all([
			db.select({ encryptedPhone: userProfiles.encryptedPhone }).from(userProfiles).where(eq(userProfiles.id, userId)).get(),
			db.select({ encryptedPhone: userProfiles.encryptedPhone }).from(userProfiles).where(eq(userProfiles.id, otherUserId)).get(),
			db.select({ email: user.email }).from(user).where(eq(user.id, userId)).get(),
			db.select({ email: user.email }).from(user).where(eq(user.id, otherUserId)).get()
		]);

		const decryptSafe = async (enc: string | null) => {
			if (!enc) return null;
			try { return await decryptContact(enc, env.CONTACT_ENCRYPTION_KEY!); } catch { return null; }
		};

		myContact = {
			phone: await decryptSafe(myProfileData?.encryptedPhone ?? null),
			email: myUserData?.email ?? ''
		};
		theirContact = {
			phone: await decryptSafe(theirProfileData?.encryptedPhone ?? null),
			email: theirUserData?.email ?? ''
		};
	}

	return {
		thread: {
			id: thread.id,
			listingId: thread.listingId,
			listingSubject: thread.listingSubject,
			status: thread.status,
			role
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
		minLength: parseInt(DEFAULT_CONFIG.MESSAGE_MIN_LENGTH),
		exchange: activeExchange
			? { id: activeExchange.id, status: activeExchange.status, iAmOffering: activeExchange.offeringUserId === userId }
			: null,
		eligible,
		myContact,
		theirContact
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
			.select({ id: conversationThreads.id, initiatorId: conversationThreads.initiatorId, posterId: conversationThreads.posterId, status: conversationThreads.status })
			.from(conversationThreads)
			.where(eq(conversationThreads.id, params.threadId))
			.get();

		if (!thread) return fail(404, { error: 'Thread not found' });
		if (thread.initiatorId !== userId && thread.posterId !== userId) return fail(403, { error: 'Forbidden' });
		if (thread.status !== 'open') return fail(400, { error: 'This thread is closed' });

		const data = await request.formData();
		const body = (data.get('body') as string)?.trim() ?? '';
		const minLength = parseInt(DEFAULT_CONFIG.MESSAGE_MIN_LENGTH);

		if (body.length < minLength) return fail(400, { error: `Message must be at least ${minLength} characters` });
		if (CONTACT_INFO_PATTERN.test(body))
			return fail(400, { error: 'Contact information cannot be shared in messages. Use the contact exchange feature instead.' });

		await db.transaction(async (tx) => {
			await tx.insert(messages).values({ id: crypto.randomUUID(), threadId: params.threadId, senderId: userId, body, sentAt: new Date() });
			await tx.update(conversationThreads).set({ lastActivityAt: new Date() }).where(eq(conversationThreads.id, params.threadId));
		});

		return { success: true };
	},

	offerExchange: async ({ params, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const userId = locals.user.id;
		const db = getDb(env.DB);

		const thread = await db
			.select({ initiatorId: conversationThreads.initiatorId, posterId: conversationThreads.posterId, status: conversationThreads.status })
			.from(conversationThreads)
			.where(eq(conversationThreads.id, params.threadId))
			.get();

		if (!thread) return fail(404, { error: 'Thread not found' });
		if (thread.initiatorId !== userId && thread.posterId !== userId) return fail(403, { error: 'Forbidden' });
		if (thread.status !== 'open') return fail(400, { error: 'Thread is closed' });

		const otherUserId = thread.initiatorId === userId ? thread.posterId : thread.initiatorId;
		const role = thread.posterId === userId ? 'poster' : 'responder';

		// Re-check eligibility
		const threadMessages = await db
			.select({ senderId: messages.senderId })
			.from(messages)
			.where(eq(messages.threadId, params.threadId))
			.all();

		const myMsgs = threadMessages.filter((m) => m.senderId === userId).length;
		const theirMsgs = threadMessages.filter((m) => m.senderId !== userId).length;
		const eligible = role === 'poster' ? theirMsgs > 0 : myMsgs > 0 && theirMsgs > 0;

		if (!eligible) return fail(400, { error: 'You are not yet eligible to share contact info in this thread' });

		// Check no active offer/accepted exchange exists
		const existing = await db
			.select({ id: keyExchanges.id, status: keyExchanges.status })
			.from(keyExchanges)
			.where(eq(keyExchanges.threadId, params.threadId))
			.orderBy(desc(keyExchanges.offeredAt))
			.get();

		if (existing && (existing.status === 'offered' || existing.status === 'accepted')) {
			return fail(400, { error: 'A contact exchange is already active for this thread' });
		}

		await db.insert(keyExchanges).values({
			id: crypto.randomUUID(),
			threadId: params.threadId,
			offeringUserId: userId,
			receivingUserId: otherUserId,
			status: 'offered',
			offeredAt: new Date()
		});

		return { success: true };
	},

	acceptExchange: async ({ params, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const userId = locals.user.id;
		const db = getDb(env.DB);

		const exchange = await db
			.select()
			.from(keyExchanges)
			.where(eq(keyExchanges.threadId, params.threadId))
			.orderBy(desc(keyExchanges.offeredAt))
			.get();

		if (!exchange || exchange.status !== 'offered') return fail(400, { error: 'No pending offer to accept' });
		if (exchange.receivingUserId !== userId) return fail(403, { error: 'Forbidden' });

		await db.update(keyExchanges).set({ status: 'accepted', resolvedAt: new Date() }).where(eq(keyExchanges.id, exchange.id));

		return { success: true };
	},

	declineExchange: async ({ params, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const userId = locals.user.id;
		const db = getDb(env.DB);

		const exchange = await db
			.select()
			.from(keyExchanges)
			.where(eq(keyExchanges.threadId, params.threadId))
			.orderBy(desc(keyExchanges.offeredAt))
			.get();

		if (!exchange || exchange.status !== 'offered') return fail(400, { error: 'No pending offer to decline' });
		if (exchange.receivingUserId !== userId) return fail(403, { error: 'Forbidden' });

		await db.update(keyExchanges).set({ status: 'declined', resolvedAt: new Date() }).where(eq(keyExchanges.id, exchange.id));

		return { success: true };
	},

	revokeExchange: async ({ params, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const userId = locals.user.id;
		const db = getDb(env.DB);

		const exchange = await db
			.select()
			.from(keyExchanges)
			.where(eq(keyExchanges.threadId, params.threadId))
			.orderBy(desc(keyExchanges.offeredAt))
			.get();

		if (!exchange || (exchange.status !== 'offered' && exchange.status !== 'accepted'))
			return fail(400, { error: 'Nothing to revoke' });
		if (exchange.offeringUserId !== userId) return fail(403, { error: 'Forbidden' });

		await db.update(keyExchanges).set({ status: 'revoked', resolvedAt: new Date() }).where(eq(keyExchanges.id, exchange.id));

		return { success: true };
	}
};
