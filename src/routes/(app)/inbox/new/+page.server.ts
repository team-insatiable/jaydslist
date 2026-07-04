import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import {
	conversationThreads,
	listings,
	messages,
	userProfiles,
	pushSubscriptions,
	user,
	DEFAULT_CONFIG
} from '$lib/server/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { queryDbblScore, isBlockedByDbbl } from '$lib/server/dbbl';
import { hashPhoneForDbbl, hashEmailForDbbl } from '$lib/server/phone';
import { decryptContact } from '$lib/server/crypto';
import { sendNewMessageEmail, sendAbuseAlertEmail } from '$lib/server/email';
import { sendPushNotification } from '$lib/server/push';

const CONTACT_INFO_PATTERN = /(\+?[\d\s\-().]{7,}|\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b)/i;

export const load: PageServerLoad = async ({ url, locals, platform }) => {
	if (!locals.user) throw redirect(302, '/login');

	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	const listingId = url.searchParams.get('listing');
	if (!listingId) throw redirect(302, '/browse');

	const userId = locals.user.id;
	const db = getDb(env.DB);

	const listing = await db
		.select({
			id: listings.id,
			userId: listings.userId,
			subject: listings.subject,
			status: listings.status,
			posterAlias: userProfiles.alias
		})
		.from(listings)
		.innerJoin(userProfiles, eq(listings.userId, userProfiles.id))
		.where(eq(listings.id, listingId))
		.get();

	if (!listing) throw error(404, 'Listing not found');
	if (listing.userId === userId) throw redirect(302, `/listings/${listingId}`);
	if (listing.status !== 'active') throw error(410, 'This listing is no longer active');

	// Redirect to existing thread if one exists
	const existing = await db
		.select({ id: conversationThreads.id })
		.from(conversationThreads)
		.where(
			and(
				eq(conversationThreads.listingId, listingId),
				eq(conversationThreads.initiatorId, userId)
			)
		)
		.get();

	if (existing) throw redirect(302, `/inbox/${existing.id}`);

	return {
		listing: {
			id: listing.id,
			subject: listing.subject,
			posterAlias: listing.posterAlias ?? 'Anonymous'
		},
		minLength: parseInt(DEFAULT_CONFIG.MESSAGE_MIN_LENGTH)
	};
};

export const actions: Actions = {
	send: async ({ url, request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const listingId = url.searchParams.get('listing');
		if (!listingId) return fail(400, { error: 'Missing listing' });

		const userId = locals.user.id;
		const db = getDb(env.DB);

		const listing = await db
			.select({ id: listings.id, userId: listings.userId, status: listings.status, subject: listings.subject })
			.from(listings)
			.where(eq(listings.id, listingId))
			.get();

		if (!listing) return fail(404, { error: 'Listing not found' });
		if (listing.userId === userId) return fail(400, { error: 'You cannot reply to your own listing' });
		if (listing.status !== 'active') return fail(400, { error: 'This listing is no longer active' });

		// Prevent duplicate threads
		const existing = await db
			.select({ id: conversationThreads.id })
			.from(conversationThreads)
			.where(
				and(
					eq(conversationThreads.listingId, listingId),
					eq(conversationThreads.initiatorId, userId)
				)
			)
			.get();

		if (existing) throw redirect(303, `/inbox/${existing.id}`);

		// DBBL re-check before opening a new thread
		const initiatorProfile = await db
			.select({
				encryptedPhone: userProfiles.encryptedPhone,
				dbblRiskRating: userProfiles.dbblRiskRating
			})
			.from(userProfiles)
			.where(eq(userProfiles.id, userId))
			.get();

		if (isBlockedByDbbl(initiatorProfile?.dbblRiskRating)) {
			return fail(403, { error: 'Your account is not permitted to send messages at this time.' });
		}

		if (initiatorProfile?.encryptedPhone) {
			try {
				const phone = await decryptContact(initiatorProfile.encryptedPhone, env.CONTACT_ENCRYPTION_KEY);
				const phoneHash = await hashPhoneForDbbl(phone);
				const emailHash = await hashEmailForDbbl(locals.user.email);
				const dbblResult = await queryDbblScore(phoneHash, emailHash, env);

				if (dbblResult) {
					await db
						.update(userProfiles)
						.set({
							dbblRiskScore: dbblResult.score,
							dbblRiskRating: dbblResult.rating,
							dbblConfidence: dbblResult.confidence,
							dbblLastCheckedAt: new Date()
						})
						.where(eq(userProfiles.id, userId));

					if (isBlockedByDbbl(dbblResult.rating)) {
						return fail(403, { error: 'Your account is not permitted to send messages at this time.' });
					}
				}
			} catch (err) {
				console.error('DBBL check failed at first message, failing open:', err);
			}
		}

		// Velocity check — compare daily thread limit against trust tier cap
		const initiatorTier = await db
			.select({ trustTier: userProfiles.trustTier, alias: userProfiles.alias })
			.from(userProfiles)
			.where(eq(userProfiles.id, userId))
			.get();

		const dailyLimitByTier: Record<string, number> = {
			new: parseInt(DEFAULT_CONFIG.THREAD_VELOCITY_NEW_PER_DAY),
			established: parseInt(DEFAULT_CONFIG.THREAD_VELOCITY_ESTABLISHED_PER_DAY),
			trusted: parseInt(DEFAULT_CONFIG.THREAD_VELOCITY_TRUSTED_PER_DAY)
		};
		const tier = initiatorTier?.trustTier ?? 'new';
		const dailyLimit = dailyLimitByTier[tier] ?? 3;

		const dayCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const recentThreads = await db
			.select({ id: conversationThreads.id })
			.from(conversationThreads)
			.where(and(eq(conversationThreads.initiatorId, userId), gte(conversationThreads.createdAt, dayCutoff)))
			.all();

		if (recentThreads.length >= dailyLimit) {
			if (recentThreads.length >= dailyLimit * 3 && env.RESEND_API_KEY && env.ADMIN_EMAILS) {
				const origin = env.ORIGIN ?? 'https://jaydslist.com';
				await db.update(userProfiles).set({ status: 'suspended' }).where(eq(userProfiles.id, userId));
				const adminEmails = env.ADMIN_EMAILS.split(',').map((e: string) => e.trim()).filter(Boolean);
				sendAbuseAlertEmail(
					adminEmails,
					{ alias: initiatorTier?.alias ?? userId, userId, reason: 'Daily thread velocity exceeded 3x cap', count: recentThreads.length },
					origin,
					env.RESEND_API_KEY
				).catch((err: unknown) => console.error('Abuse alert email failed:', err));
				return fail(429, { error: 'Your account has been suspended due to unusual activity.' });
			}
			return fail(429, { error: `You've reached your daily limit of ${dailyLimit} new conversations. Try again tomorrow.` });
		}

		const data = await request.formData();
		const body = (data.get('body') as string)?.trim() ?? '';
		const minLength = parseInt(DEFAULT_CONFIG.MESSAGE_MIN_LENGTH);

		if (body.length < minLength)
			return fail(400, { error: `Your message must be at least ${minLength} characters` });

		if (CONTACT_INFO_PATTERN.test(body))
			return fail(400, { error: 'Contact information cannot be included in your first message. Introduce yourself instead.' });

		const threadId = crypto.randomUUID();

		await db.insert(conversationThreads).values({
			id: threadId,
			listingId,
			initiatorId: userId,
			posterId: listing.userId,
			status: 'open',
			lastActivityAt: new Date()
		});
		await db.insert(messages).values({
			id: crypto.randomUUID(),
			threadId,
			senderId: userId,
			body,
			sentAt: new Date()
		});

		// Increment poster's total thread count and recalculate response rate
		const posterProfile = await db
			.select({ totalThreads: userProfiles.totalThreads, respondedThreads: userProfiles.respondedThreads })
			.from(userProfiles)
			.where(eq(userProfiles.id, listing.userId))
			.get();
		if (posterProfile) {
			const newTotal = posterProfile.totalThreads + 1;
			const rate = newTotal > 0 ? posterProfile.respondedThreads / newTotal : 0;
			await db.update(userProfiles)
				.set({ totalThreads: newTotal, responseRate: rate })
				.where(eq(userProfiles.id, listing.userId));
		}

		// Notify poster — first message in a new thread, no cooldown needed
		if (env.RESEND_API_KEY || env.VAPID_PRIVATE_KEY) {
			const origin = env.ORIGIN ?? 'https://jaydslist.com';
			const threadUrl = `${origin}/inbox/${threadId}`;
			Promise.all([
				db.select({ alias: userProfiles.alias }).from(userProfiles).where(eq(userProfiles.id, userId)).get(),
				db.select({ email: user.email }).from(user).where(eq(user.id, listing.userId)).get(),
				db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, listing.userId)).all()
			]).then(async ([senderProfile, posterUser, subs]) => {
				await db.update(conversationThreads).set({ lastNotifiedAt: new Date() }).where(eq(conversationThreads.id, threadId));

				const fromAlias = senderProfile?.alias ?? 'Someone';
				if (posterUser?.email && env.RESEND_API_KEY) {
					await sendNewMessageEmail(posterUser.email, fromAlias, listing.subject, body, threadUrl, env.RESEND_API_KEY);
				}
				if (env.VAPID_PRIVATE_KEY && env.VAPID_PUBLIC_KEY && env.VAPID_CONTACT) {
					for (const sub of subs) {
						const result = await sendPushNotification(
							{ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
							{ title: `New message from ${fromAlias}`, body: body.slice(0, 100), url: threadUrl },
							env
						);
						if (result.stale) {
							await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
						}
					}
				}
			}).catch((err: unknown) => console.error('Notification failed:', err));
		}

		throw redirect(303, `/inbox/${threadId}`);
	}
};
