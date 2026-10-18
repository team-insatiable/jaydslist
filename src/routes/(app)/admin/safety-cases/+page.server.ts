import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { and, desc, eq, inArray, ne, or } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import {
	safetyCases,
	safetyScanEvents,
	moderationActions,
	messages,
	listings,
	conversationThreads,
	userProfiles,
	pushSubscriptions,
	userBlocks
} from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth.schema';
import { isAdminUser } from '$lib/server/admin-auth';
import { emailIsConfigured, sendNewMessageEmail } from '$lib/server/email';
import { sendPushNotification } from '$lib/server/push';
import { getInstanceConfig } from '$lib/server/instance';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const env = platform?.env;
	if (!env || !(await isAdminUser(env, locals.user.id))) throw error(403, 'Forbidden');
	const db = getDb(env.DB);
	const status = url.searchParams.get('status') === 'resolved' ? 'resolved' : 'pending';
	const requestedCaseId = url.searchParams.get('case');
	const cases = await db
		.select()
		.from(safetyCases)
		.where(
			and(
				status === 'pending'
					? eq(safetyCases.status, 'pending')
					: ne(safetyCases.status, 'pending'),
				...(requestedCaseId ? [eq(safetyCases.id, requestedCaseId)] : [])
			)
		)
		.orderBy(desc(safetyCases.createdAt))
		.limit(100)
		.all();
	const caseIds = cases.map((entry) => entry.id);
	const actions = caseIds.length
		? await db
				.select()
				.from(moderationActions)
				.where(
					and(
						eq(moderationActions.targetType, 'safety_case'),
						inArray(moderationActions.targetId, caseIds)
					)
				)
				.orderBy(desc(moderationActions.createdAt))
				.all()
		: [];
	const scans = caseIds.length
		? await db
				.select()
				.from(safetyScanEvents)
				.where(
					inArray(
						safetyScanEvents.targetId,
						cases.map((entry) => entry.targetId)
					)
				)
				.orderBy(desc(safetyScanEvents.checkedAt))
				.all()
		: [];
	return {
		status,
		cases: cases.map((entry) => ({
			...entry,
			evidence: JSON.parse(entry.evidenceSnapshot) as {
				subject?: string;
				body?: string;
				cfImageId?: string;
				albumId?: string;
				threadId?: string;
			},
			matchedRuleIds: JSON.parse(entry.matchedRuleIds) as string[],
			matchedSections: JSON.parse(entry.matchedSections) as string[],
			actions: actions.filter((action) => action.targetId === entry.id),
			scan:
				scans.find(
					(scan) => scan.targetType === entry.targetType && scan.targetId === entry.targetId
				) ?? null
		}))
	};
};

async function notifyReleasedMessage(env: Env, messageId: string): Promise<void> {
	const db = getDb(env.DB);
	const message = await db
		.select({
			body: messages.body,
			threadId: messages.threadId,
			senderId: messages.senderId,
			initiatorId: conversationThreads.initiatorId,
			posterId: conversationThreads.posterId,
			listingSubject: listings.subject
		})
		.from(messages)
		.innerJoin(conversationThreads, eq(messages.threadId, conversationThreads.id))
		.innerJoin(listings, eq(conversationThreads.listingId, listings.id))
		.where(eq(messages.id, messageId))
		.get();
	if (!message) return;
	const recipientId =
		message.senderId === message.initiatorId ? message.posterId : message.initiatorId;
	const [sender, recipient, subscriptions] = await Promise.all([
		db
			.select({ alias: userProfiles.alias })
			.from(userProfiles)
			.where(eq(userProfiles.id, message.senderId))
			.get(),
		db.select({ email: user.email }).from(user).where(eq(user.id, recipientId)).get(),
		db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, recipientId)).all()
	]);
	const fromAlias = sender?.alias ?? 'Someone';
	const threadUrl = `${env.ORIGIN ?? getInstanceConfig(env).url}/inbox/${message.threadId}`;
	if (recipient?.email && emailIsConfigured(env)) {
		await sendNewMessageEmail(
			env,
			recipient.email,
			fromAlias,
			message.listingSubject,
			message.body,
			threadUrl
		);
	}
	if (env.VAPID_PRIVATE_KEY && env.VAPID_PUBLIC_KEY && env.VAPID_CONTACT) {
		for (const sub of subscriptions) {
			const result = await sendPushNotification(
				{ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
				{
					title: `New message from ${fromAlias}`,
					body: message.body.slice(0, 100),
					url: threadUrl
				},
				env
			);
			if (result.stale) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
		}
	}
	await db
		.update(conversationThreads)
		.set({ lastNotifiedAt: new Date() })
		.where(eq(conversationThreads.id, message.threadId));
}

async function decide(event: Parameters<Actions['release']>[0], decision: 'release' | 'reject') {
	const { locals, platform, request } = event;
	if (!locals.user) return fail(401, { error: 'Unauthorized' });
	const env = platform?.env;
	if (!env || !(await isAdminUser(env, locals.user.id))) return fail(403, { error: 'Forbidden' });
	const data = await request.formData();
	const caseId = String(data.get('caseId') ?? '');
	const notes = String(data.get('notes') ?? '').trim();
	if (!notes || notes.length > 1000) return fail(400, { error: 'Review reason required' });
	const db = getDb(env.DB);
	const safetyCase = await db.select().from(safetyCases).where(eq(safetyCases.id, caseId)).get();
	if (!safetyCase) return fail(404, { error: 'Case not found' });
	if (safetyCase.status !== 'pending') return fail(409, { error: 'Case already reviewed' });
	const resolvedAt = new Date();
	const caseUpdate = db
		.update(safetyCases)
		.set({
			status: decision === 'release' ? 'released' : 'rejected',
			reviewerId: locals.user.id,
			reviewerNotes: notes,
			resolvedAt
		})
		.where(and(eq(safetyCases.id, caseId), eq(safetyCases.status, 'pending')));
	const audit = db.insert(moderationActions).values({
		id: crypto.randomUUID(),
		actorId: locals.user.id,
		targetType: 'safety_case',
		targetId: caseId,
		actionType: decision,
		reason: notes
	});
	try {
		if (safetyCase.targetType === 'message') {
			const message = await db
				.select({
					scanStatus: messages.scanStatus,
					threadId: messages.threadId,
					senderId: messages.senderId,
					initiatorId: conversationThreads.initiatorId,
					posterId: conversationThreads.posterId,
					threadStatus: conversationThreads.status
				})
				.from(messages)
				.innerJoin(conversationThreads, eq(messages.threadId, conversationThreads.id))
				.where(eq(messages.id, safetyCase.targetId))
				.get();
			if (!message || message.scanStatus !== 'flagged')
				return fail(409, { error: 'Message state changed' });
			if (decision === 'release') {
				if (message.threadStatus !== 'open') return fail(409, { error: 'Thread is closed' });
				const sender = await db
					.select({ status: userProfiles.status })
					.from(userProfiles)
					.where(eq(userProfiles.id, message.senderId))
					.get();
				if (sender?.status !== 'active') return fail(409, { error: 'Sender account is inactive' });
				const recipientId =
					message.senderId === message.initiatorId ? message.posterId : message.initiatorId;
				const blocked = await db
					.select({ id: userBlocks.id })
					.from(userBlocks)
					.where(
						or(
							and(
								eq(userBlocks.blockerId, message.senderId),
								eq(userBlocks.blockedId, recipientId)
							),
							and(eq(userBlocks.blockerId, recipientId), eq(userBlocks.blockedId, message.senderId))
						)
					)
					.get();
				if (blocked) return fail(409, { error: 'Participants have blocked each other' });
			}
			await db.batch([
				db
					.update(messages)
					.set({ scanStatus: decision === 'release' ? 'cleared' : 'blocked' })
					.where(and(eq(messages.id, safetyCase.targetId), eq(messages.scanStatus, 'flagged'))),
				...(decision === 'release'
					? [
							db
								.update(conversationThreads)
								.set({ lastActivityAt: resolvedAt })
								.where(eq(conversationThreads.id, message.threadId))
						]
					: []),
				caseUpdate,
				audit
			]);
		} else if (safetyCase.targetType === 'listing') {
			const listing = await db
				.select({ status: listings.status, expiresAt: listings.expiresAt })
				.from(listings)
				.where(eq(listings.id, safetyCase.targetId))
				.get();
			if (!listing) return fail(409, { error: 'Listing no longer exists' });
			if (decision === 'release') {
				const owner = await db
					.select({ status: userProfiles.status })
					.from(userProfiles)
					.where(eq(userProfiles.id, safetyCase.submitterId))
					.get();
				if (owner?.status !== 'active')
					return fail(409, { error: 'Listing owner account is inactive' });
			}
			if (listing.status === 'removed' && decision === 'reject') {
				await db.batch([caseUpdate, audit]);
			} else if (listing.status !== 'pending_review')
				return fail(409, { error: 'Listing state changed' });
			else {
				const releaseStatus =
					listing.expiresAt <= resolvedAt ? 'expired' : (safetyCase.releaseStatus ?? 'active');
				await db.batch([
					db
						.update(listings)
						.set({
							status: decision === 'release' ? releaseStatus : 'removed'
						})
						.where(
							and(eq(listings.id, safetyCase.targetId), eq(listings.status, 'pending_review'))
						),
					caseUpdate,
					audit
				]);
			}
		} else return fail(400, { error: 'Unknown case target' });
	} catch {
		return fail(409, { error: 'Case changed during review; reload the queue' });
	}
	if (decision === 'release' && safetyCase.targetType === 'message') {
		try {
			await notifyReleasedMessage(env, safetyCase.targetId);
		} catch (cause) {
			console.error('Released-message notification failed:', cause);
		}
	}
	return { success: true, decision };
}

export const actions: Actions = {
	release: (event) => decide(event, 'release'),
	reject: (event) => decide(event, 'reject')
};
