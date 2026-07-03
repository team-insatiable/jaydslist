import type { LayoutServerLoad } from './$types';
import { requirePhoneVerifiedRedirect } from '$lib/server/guards/requirePhoneVerified';
import { getDb } from '$lib/server/db';
import { messages, conversationThreads, userProfiles, DEFAULT_CONFIG } from '$lib/server/db/schema';
import { user as authUser } from '$lib/server/db/auth.schema';
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

		// Lazy trust tier promotion
		const profile = await db
			.select({ trustTier: userProfiles.trustTier, warningIssued: userProfiles.warningIssued, status: userProfiles.status, responseRate: userProfiles.responseRate })
			.from(userProfiles)
			.where(eq(userProfiles.id, locals.user.id))
			.get();

		if (profile && profile.status === 'active' && !profile.warningIssued) {
			const userRow = await db.select({ createdAt: authUser.createdAt }).from(authUser).where(eq(authUser.id, locals.user.id)).get();
			if (userRow?.createdAt) {
				const ageDays = (Date.now() - new Date(userRow.createdAt).getTime()) / 86400000;
				const establishedDays = parseInt(DEFAULT_CONFIG.TRUST_TIER_ESTABLISHED_DAYS);
				const trustedDays = parseInt(DEFAULT_CONFIG.TRUST_TIER_TRUSTED_DAYS);

				if (profile.trustTier === 'new' && ageDays >= establishedDays) {
					await db.update(userProfiles).set({ trustTier: 'established' }).where(eq(userProfiles.id, locals.user.id));
				} else if (profile.trustTier === 'established' && ageDays >= trustedDays && profile.responseRate >= 0.5) {
					await db.update(userProfiles).set({ trustTier: 'trusted' }).where(eq(userProfiles.id, locals.user.id));
				}
			}
		}
	}

	return { user: locals.user, unreadCount };
};
