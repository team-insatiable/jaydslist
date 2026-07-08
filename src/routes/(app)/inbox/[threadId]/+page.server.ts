import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { imageUrl } from '$lib/server/cloudflare-images';
import {
	conversationThreads,
	listings,
	messages,
	userProfiles,
	keyExchanges,
	reports,
	pushSubscriptions,
	user,
	photoVault,
	photoAlbums
} from '$lib/server/db/schema';
import { eq, and, asc, ne, isNull, desc, gte } from 'drizzle-orm';
import { decryptContact } from '$lib/server/crypto';
import { sendNewMessageEmail, sendAbuseAlertEmail } from '$lib/server/email';
import { sendPushNotification } from '$lib/server/push';
import { isKeyExchangeEligible } from '$lib/server/key-exchange';

const CONTACT_INFO_PATTERN = /(\+?[\d\s\-().]{7,}|\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b)/i;

export const load: PageServerLoad = async ({ params, locals, platform, depends }) => {
	depends('app:thread');
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
		db
			.select({ alias: userProfiles.alias })
			.from(userProfiles)
			.where(eq(userProfiles.id, otherUserId))
			.get(),
		db
			.select({ isSupporter: userProfiles.isSupporter, privacyMode: userProfiles.privacyMode })
			.from(userProfiles)
			.where(eq(userProfiles.id, userId))
			.get(),
		db
			.select({
				id: messages.id,
				senderId: messages.senderId,
				body: messages.body,
				cfImageId: messages.cfImageId,
				isExpiring: messages.isExpiring,
				photoViewedAt: messages.photoViewedAt,
				expiresAt: messages.expiresAt,
				albumId: messages.albumId,
				sentAt: messages.sentAt,
				readAt: messages.readAt
			})
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

	// Check if the other party is currently typing (supporter-only feature)
	// KV minimum TTL is 60s so we store a timestamp and check freshness (8s window)
	let otherIsTyping = false;
	if (currentProfile?.isSupporter) {
		const ts = await env.PHONE_VERIFICATION_KV.get(`typing:${params.threadId}:${otherUserId}`);
		otherIsTyping = ts ? Date.now() - parseInt(ts) < 8000 : false;
	}

	// Mark received unread messages as read (skipped when viewer has privacy mode on)
	const hasUnread = threadMessages.some((m) => m.senderId !== userId && !m.readAt);
	if (hasUnread && !currentProfile?.privacyMode) {
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

	// Eligibility: poster after first message received; responder after sending AND receiving a reply
	const myMessages = threadMessages.filter((m) => m.senderId === userId);
	const theirMessages = threadMessages.filter((m) => m.senderId !== userId);
	const eligible = isKeyExchangeEligible(role, myMessages.length, theirMessages.length);

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
			db
				.select({ encryptedPhone: userProfiles.encryptedPhone })
				.from(userProfiles)
				.where(eq(userProfiles.id, userId))
				.get(),
			db
				.select({ encryptedPhone: userProfiles.encryptedPhone })
				.from(userProfiles)
				.where(eq(userProfiles.id, otherUserId))
				.get(),
			db.select({ email: user.email }).from(user).where(eq(user.id, userId)).get(),
			db.select({ email: user.email }).from(user).where(eq(user.id, otherUserId)).get()
		]);

		const decryptSafe = async (enc: string | null) => {
			if (!enc) return null;
			try {
				const raw = await decryptContact(enc, env.CONTACT_ENCRYPTION_KEY!);
				// Ensure E.164 format with leading +
				if (raw && !raw.startsWith('+')) return `+${raw}`;
				return raw;
			} catch {
				return null;
			}
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

	// Fetch cover photo URL and name for each album referenced in this thread
	const albumIds = [...new Set(threadMessages.map((m) => m.albumId).filter(Boolean))] as string[];
	const albumCovers: Record<string, string> = {};
	const albumNames: Record<string, string> = {};
	if (albumIds.length > 0) {
		const [covers, names] = await Promise.all([
			db
				.select({ albumId: photoVault.albumId, cfImageId: photoVault.cfImageId })
				.from(photoVault)
				.where(and(isNull(photoVault.deletedAt)))
				.all(),
			db.select({ id: photoAlbums.id, name: photoAlbums.name }).from(photoAlbums).all()
		]);
		for (const aid of albumIds) {
			const cover = covers.find((c) => c.albumId === aid);
			if (cover) albumCovers[aid] = imageUrl(env.CF_IMAGES_ACCOUNT_HASH, cover.cfImageId);
			const album = names.find((a) => a.id === aid);
			if (album) albumNames[aid] = album.name;
		}
	}

	return {
		thread: {
			id: thread.id,
			listingId: thread.listingId,
			listingSubject: thread.listingSubject,
			status: thread.status,
			role
		},
		otherUserId,
		otherAlias: otherProfile?.alias ?? 'Anonymous',
		isSupporter: currentProfile?.isSupporter ?? false,
		otherIsTyping,
		messages: threadMessages.map((m) => {
			const isMine = m.senderId === userId;
			const now = new Date();
			const timedExpired = m.expiresAt ? m.expiresAt <= now : false;

			let cfImageUrl: string | null = null;
			let expiringState: 'none' | 'unviewed' | 'expired' = 'none';
			if (m.cfImageId) {
				if (timedExpired) {
					expiringState = 'expired';
				} else if (!m.isExpiring) {
					cfImageUrl = imageUrl(env.CF_IMAGES_ACCOUNT_HASH, m.cfImageId);
				} else if (isMine) {
					cfImageUrl = imageUrl(env.CF_IMAGES_ACCOUNT_HASH, m.cfImageId);
					expiringState = m.photoViewedAt ? 'expired' : 'unviewed';
				} else {
					expiringState = m.photoViewedAt ? 'expired' : 'unviewed';
				}
			}

			const albumExpired = !!m.albumId && timedExpired;
			const resolvedAlbumId = albumExpired ? null : (m.albumId ?? null);

			return {
				id: m.id,
				isMine,
				body: m.body,
				cfImageUrl,
				isExpiring: m.isExpiring,
				expiringState,
				expiresAt: m.expiresAt ?? null,
				albumId: resolvedAlbumId,
				albumCoverUrl: resolvedAlbumId ? (albumCovers[resolvedAlbumId] ?? null) : null,
				albumName: resolvedAlbumId ? (albumNames[resolvedAlbumId] ?? null) : null,
				albumExpired,
				sentAt: m.sentAt,
				readAt: m.readAt
			};
		}),
		minLength: 1,
		exchange: activeExchange
			? {
					id: activeExchange.id,
					status: activeExchange.status,
					iAmOffering: activeExchange.offeringUserId === userId
				}
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
			.select({
				id: conversationThreads.id,
				listingId: conversationThreads.listingId,
				listingSubject: listings.subject,
				initiatorId: conversationThreads.initiatorId,
				posterId: conversationThreads.posterId,
				status: conversationThreads.status,
				lastNotifiedAt: conversationThreads.lastNotifiedAt
			})
			.from(conversationThreads)
			.innerJoin(listings, eq(conversationThreads.listingId, listings.id))
			.where(eq(conversationThreads.id, params.threadId))
			.get();

		if (!thread) return fail(404, { error: 'Thread not found' });
		if (thread.initiatorId !== userId && thread.posterId !== userId)
			return fail(403, { error: 'Forbidden' });
		if (thread.status !== 'open') return fail(400, { error: 'This thread is closed' });

		// Flood detection: >10 messages from sender in this thread in the last 10 minutes
		const floodCutoff = new Date(Date.now() - 10 * 60 * 1000);
		const recentFlood = await db
			.select({ id: messages.id })
			.from(messages)
			.where(
				and(
					eq(messages.threadId, params.threadId),
					eq(messages.senderId, userId),
					gte(messages.sentAt, floodCutoff)
				)
			)
			.all();

		if (recentFlood.length >= 10) {
			const senderProfile = await db
				.select({ alias: userProfiles.alias })
				.from(userProfiles)
				.where(eq(userProfiles.id, userId))
				.get();
			await db.update(userProfiles).set({ status: 'suspended' }).where(eq(userProfiles.id, userId));
			if (env.RESEND_API_KEY && env.ADMIN_EMAILS) {
				const adminEmails = env.ADMIN_EMAILS.split(',')
					.map((e: string) => e.trim())
					.filter(Boolean);
				const origin = env.ORIGIN ?? 'https://jaydslist.com';
				sendAbuseAlertEmail(
					adminEmails,
					{
						alias: senderProfile?.alias ?? userId,
						userId,
						reason: 'Per-thread message flood',
						count: recentFlood.length,
						threadUrl: `${origin}/inbox/${params.threadId}`
					},
					origin,
					env.RESEND_API_KEY
				).catch((err: unknown) => console.error('Abuse alert email failed:', err));
			}
			return fail(429, { error: 'Your account has been suspended due to unusual activity.' });
		}

		const formData = await request.formData();
		const body = (formData.get('body') as string)?.trim() ?? '';
		const cfImageId = (formData.get('cfImageId') as string)?.trim() || null;
		const albumId = (formData.get('albumId') as string)?.trim() || null;
		const expiryType = (formData.get('expiryType') as string) || 'none';

		const hasMedia = !!(cfImageId || albumId);
		const isExpiring = hasMedia && expiryType === 'view_once';
		const EXPIRY_OFFSETS: Record<string, number> = {
			'10min': 10 * 60 * 1000,
			'60min': 60 * 60 * 1000,
			'24hr': 24 * 60 * 60 * 1000
		};
		const expiresAt =
			hasMedia && EXPIRY_OFFSETS[expiryType]
				? new Date(Date.now() + EXPIRY_OFFSETS[expiryType])
				: null;

		if (!cfImageId && !albumId && body.length < 1)
			return fail(400, { error: 'Message cannot be empty' });
		if (body && CONTACT_INFO_PATTERN.test(body))
			return fail(400, {
				error:
					'Contact information cannot be shared in messages. Use the contact exchange feature instead.'
			});

		await db.insert(messages).values({
			id: crypto.randomUUID(),
			threadId: params.threadId,
			senderId: userId,
			body,
			cfImageId,
			albumId,
			isExpiring,
			expiresAt,
			sentAt: new Date()
		});
		await db
			.update(conversationThreads)
			.set({ lastActivityAt: new Date() })
			.where(eq(conversationThreads.id, params.threadId));

		// Clear typing indicator now that the message is sent
		env.PHONE_VERIFICATION_KV.delete(`typing:${params.threadId}:${userId}`).catch(() => {});

		// If the poster is sending their first reply, increment respondedThreads
		if (userId === thread.posterId) {
			const priorPosterMessages = await db
				.select({ id: messages.id })
				.from(messages)
				.where(and(eq(messages.threadId, params.threadId), eq(messages.senderId, userId)))
				.all();
			if (priorPosterMessages.length === 1) {
				const profile = await db
					.select({
						totalThreads: userProfiles.totalThreads,
						respondedThreads: userProfiles.respondedThreads
					})
					.from(userProfiles)
					.where(eq(userProfiles.id, userId))
					.get();
				if (profile) {
					const newResponded = profile.respondedThreads + 1;
					const rate = profile.totalThreads > 0 ? newResponded / profile.totalThreads : 0;
					await db
						.update(userProfiles)
						.set({ respondedThreads: newResponded, responseRate: rate })
						.where(eq(userProfiles.id, userId));
				}
			}
		}

		// Notifications — fire-and-forget, 15-minute cooldown per thread
		const COOLDOWN_MS = 15 * 60 * 1000;
		const shouldNotify =
			!thread.lastNotifiedAt || Date.now() - thread.lastNotifiedAt.getTime() > COOLDOWN_MS;
		if (shouldNotify && (env.RESEND_API_KEY || env.VAPID_PRIVATE_KEY)) {
			const recipientId = thread.initiatorId === userId ? thread.posterId : thread.initiatorId;
			const origin = env.ORIGIN ?? 'https://jaydslist.com';
			const threadUrl = `${origin}/inbox/${params.threadId}`;

			Promise.all([
				db
					.select({ alias: userProfiles.alias })
					.from(userProfiles)
					.where(eq(userProfiles.id, userId))
					.get(),
				db.select({ email: user.email }).from(user).where(eq(user.id, recipientId)).get(),
				db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, recipientId)).all()
			])
				.then(async ([senderProfile, recipientUser, subs]) => {
					await db
						.update(conversationThreads)
						.set({ lastNotifiedAt: new Date() })
						.where(eq(conversationThreads.id, params.threadId));

					const fromAlias = senderProfile?.alias ?? 'Someone';
					const preview = body;

					if (recipientUser?.email && env.RESEND_API_KEY) {
						await sendNewMessageEmail(
							recipientUser.email,
							fromAlias,
							thread.listingSubject,
							preview,
							threadUrl,
							env.RESEND_API_KEY
						);
					}

					if (env.VAPID_PRIVATE_KEY && env.VAPID_PUBLIC_KEY && env.VAPID_CONTACT) {
						for (const sub of subs) {
							const result = await sendPushNotification(
								{ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
								{
									title: `New message from ${fromAlias}`,
									body: preview.slice(0, 100),
									url: threadUrl
								},
								env
							);
							if (result.stale) {
								await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
							}
						}
					}
				})
				.catch((err: unknown) => console.error('Notification failed:', err));
		}

		return { success: true };
	},

	offerExchange: async ({ params, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const userId = locals.user.id;
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

		if (!thread) return fail(404, { error: 'Thread not found' });
		if (thread.initiatorId !== userId && thread.posterId !== userId)
			return fail(403, { error: 'Forbidden' });
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
		const eligible = isKeyExchangeEligible(role, myMsgs, theirMsgs);

		if (!eligible)
			return fail(400, { error: 'You are not yet eligible to share contact info in this thread' });

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

		if (!exchange || exchange.status !== 'offered')
			return fail(400, { error: 'No pending offer to accept' });
		if (exchange.receivingUserId !== userId) return fail(403, { error: 'Forbidden' });

		await db
			.update(keyExchanges)
			.set({ status: 'accepted', resolvedAt: new Date() })
			.where(eq(keyExchanges.id, exchange.id));

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

		if (!exchange || exchange.status !== 'offered')
			return fail(400, { error: 'No pending offer to decline' });
		if (exchange.receivingUserId !== userId) return fail(403, { error: 'Forbidden' });

		await db
			.update(keyExchanges)
			.set({ status: 'declined', resolvedAt: new Date() })
			.where(eq(keyExchanges.id, exchange.id));

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
		if (exchange.offeringUserId !== userId && exchange.receivingUserId !== userId)
			return fail(403, { error: 'Forbidden' });

		await db
			.update(keyExchanges)
			.set({ status: 'revoked', resolvedAt: new Date() })
			.where(eq(keyExchanges.id, exchange.id));

		return { success: true };
	},

	report: async ({ params, request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const userId = locals.user.id;
		const db = getDb(env.DB);

		const thread = await db
			.select({
				initiatorId: conversationThreads.initiatorId,
				posterId: conversationThreads.posterId
			})
			.from(conversationThreads)
			.where(eq(conversationThreads.id, params.threadId))
			.get();

		if (!thread) return fail(404, { error: 'Thread not found' });
		if (thread.initiatorId !== userId && thread.posterId !== userId)
			return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const category = data.get('category') as string;
		const detail = (data.get('detail') as string)?.trim() || null;
		const targetUserId = data.get('targetUserId') as string;

		const VALID_CATEGORIES = [
			'harassment',
			'spam',
			'fake_profile',
			'explicit_content',
			'unsolicited_dm',
			'other'
		];
		if (!VALID_CATEGORIES.includes(category)) return fail(400, { error: 'Invalid category' });
		if (targetUserId === userId) return fail(400, { error: 'Cannot report yourself' });

		const reporter = await db
			.select({ reporterTrustScore: userProfiles.reporterTrustScore })
			.from(userProfiles)
			.where(eq(userProfiles.id, userId))
			.get();

		await db.insert(reports).values({
			id: crypto.randomUUID(),
			reporterId: userId,
			targetType: 'user',
			targetId: targetUserId,
			category,
			detail,
			reporterTrustScoreSnapshot: reporter?.reporterTrustScore ?? 0.5
		});

		return { reported: true };
	}
};
