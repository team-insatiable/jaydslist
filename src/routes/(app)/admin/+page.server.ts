import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { reports, moderationActions, userProfiles, listings } from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth.schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { sendEmail } from '$lib/server/email';
import { renderInstanceEmail } from '$lib/server/email-templates';
import { isDbblEnabled, reportBanToDbbl } from '$lib/server/dbbl';
import { isAdminUser } from '$lib/server/admin-auth';

function reportedUserId(report: typeof reports.$inferSelect): string | null {
	if (report.targetType === 'user') return report.targetId;
	if (report.targetType !== 'message' || !report.evidenceSnapshot) return null;
	try {
		const evidence: unknown = JSON.parse(report.evidenceSnapshot);
		return evidence &&
			typeof evidence === 'object' &&
			'senderId' in evidence &&
			typeof evidence.senderId === 'string'
			? evidence.senderId
			: null;
	} catch {
		return null;
	}
}

export const load: PageServerLoad = async ({ url, platform }) => {
	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	const db = getDb(env.DB);
	const status = url.searchParams.get('status') ?? 'pending';

	const rows = await db
		.select({
			id: reports.id,
			targetType: reports.targetType,
			targetId: reports.targetId,
			category: reports.category,
			detail: reports.detail,
			status: reports.status,
			reporterTrustScoreSnapshot: reports.reporterTrustScoreSnapshot,
			createdAt: reports.createdAt,
			resolvedAt: reports.resolvedAt,
			reviewerNotes: reports.reviewerNotes,
			evidenceSnapshot: reports.evidenceSnapshot,
			evidenceCapturedAt: reports.evidenceCapturedAt,
			reporterId: reports.reporterId,
			reporterAlias: userProfiles.alias,
			reporterTier: userProfiles.trustTier
		})
		.from(reports)
		.leftJoin(userProfiles, eq(reports.reporterId, userProfiles.id))
		.where(eq(reports.status, status))
		.orderBy(desc(reports.createdAt))
		.all();

	// Fetch listing subjects for listing-targeted reports
	const listingIds = [
		...new Set(rows.filter((r) => r.targetType === 'listing').map((r) => r.targetId))
	];
	const listingMap: Record<string, string> = {};
	if (listingIds.length > 0) {
		const ls = await db.select({ id: listings.id, subject: listings.subject }).from(listings).all();
		for (const l of ls) listingMap[l.id] = l.subject;
	}

	// Fetch aliases for user-targeted reports
	const evidence = rows.map((report) => {
		try {
			return report.evidenceSnapshot ? JSON.parse(report.evidenceSnapshot) : null;
		} catch {
			return null;
		}
	}) as ({ senderId?: string; body?: string; subject?: string; threadId?: string } | null)[];
	const targetUserIds = [
		...new Set(
			rows
				.map((report, index) =>
					report.targetType === 'user'
						? report.targetId
						: report.targetType === 'message'
							? evidence[index]?.senderId
							: null
				)
				.filter((id): id is string => !!id)
		)
	];
	const targetAliasMap: Record<string, string> = {};
	if (targetUserIds.length > 0) {
		const profiles = await db
			.select({ id: userProfiles.id, alias: userProfiles.alias })
			.from(userProfiles)
			.all();
		for (const p of profiles) targetAliasMap[p.id] = p.alias ?? 'Unknown';
	}

	const actions = rows.length
		? await db
				.select()
				.from(moderationActions)
				.where(
					inArray(
						moderationActions.reportId,
						rows.map((row) => row.id)
					)
				)
				.orderBy(moderationActions.createdAt)
				.all()
		: [];
	return {
		reports: rows.map((r, index) => ({
			...r,
			listingSubject: r.targetType === 'listing' ? (listingMap[r.targetId] ?? null) : null,
			reportedUserId:
				r.targetType === 'user'
					? r.targetId
					: r.targetType === 'message'
						? (evidence[index]?.senderId ?? null)
						: null,
			targetAlias:
				r.targetType === 'user'
					? (targetAliasMap[r.targetId] ?? null)
					: r.targetType === 'message'
						? (targetAliasMap[evidence[index]?.senderId ?? ''] ?? null)
						: null,
			evidence: evidence[index],
			actions: actions.filter((action) => action.reportId === r.id)
		})),
		status
	};
};

export const actions: Actions = {
	dismiss: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });
		if (!(await isAdminUser(env, locals.user.id))) return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const reportId = data.get('reportId') as string;
		const notes = (data.get('notes') as string)?.trim() || null;

		const db = getDb(env.DB);

		const report = await db.select().from(reports).where(eq(reports.id, reportId)).get();
		if (!report) return fail(404, { error: 'Report not found' });
		if (report.status !== 'pending') return fail(409, { error: 'Report already reviewed' });

		await db.batch([
			db
				.update(reports)
				.set({ status: 'dismissed', resolvedAt: new Date(), reviewerNotes: notes })
				.where(eq(reports.id, reportId)),
			db.insert(moderationActions).values({
				id: crypto.randomUUID(),
				actorId: locals.user.id,
				targetType: report.targetType,
				targetId: report.targetId,
				actionType: 'dismiss_report',
				reason: notes ?? 'No reason given',
				reportId
			})
		]);

		return { success: true, action: 'dismissed' };
	},

	ban: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });
		if (!(await isAdminUser(env, locals.user.id))) return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const reportId = data.get('reportId') as string;
		const targetUserId = data.get('targetUserId') as string;
		const notes = (data.get('notes') as string)?.trim() || null;

		const db = getDb(env.DB);

		const report = await db.select().from(reports).where(eq(reports.id, reportId)).get();
		if (!report) return fail(404, { error: 'Report not found' });
		if (report.status !== 'pending') return fail(409, { error: 'Report already reviewed' });
		if (reportedUserId(report) !== targetUserId)
			return fail(400, { error: 'Invalid report target' });

		// Ban the user
		await db.batch([
			db.update(userProfiles).set({ status: 'banned' }).where(eq(userProfiles.id, targetUserId)),

			// Remove their active listings
			db
				.update(listings)
				.set({ status: 'removed' })
				.where(and(eq(listings.userId, targetUserId), eq(listings.status, 'active'))),

			// Resolve the report
			db
				.update(reports)
				.set({ status: 'actioned', resolvedAt: new Date(), reviewerNotes: notes })
				.where(eq(reports.id, reportId)),

			db.insert(moderationActions).values({
				id: crypto.randomUUID(),
				actorId: locals.user.id,
				targetType: 'user',
				targetId: targetUserId,
				actionType: 'ban',
				reason: notes ?? 'No reason given',
				reportId
			})
		]);

		// Fire-and-forget DBBL ban report
		const [bannedProfile, bannedUser] = await Promise.all([
			db
				.select({ encryptedPhone: userProfiles.encryptedPhone })
				.from(userProfiles)
				.where(eq(userProfiles.id, targetUserId))
				.get(),
			db.select({ email: user.email }).from(user).where(eq(user.id, targetUserId)).get()
		]);
		if (isDbblEnabled(env) && bannedProfile?.encryptedPhone && bannedUser?.email) {
			reportBanToDbbl({
				encryptedPhone: bannedProfile.encryptedPhone,
				email: bannedUser.email,
				category: report.category,
				env
			}).catch((e) => console.error('Failed to report ban to DBBL:', e));
		}

		return { success: true, action: 'banned' };
	},

	removeListing: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });
		if (!(await isAdminUser(env, locals.user.id))) return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const reportId = data.get('reportId') as string;
		const listingId = data.get('listingId') as string;
		const notes = (data.get('notes') as string)?.trim() || null;

		const db = getDb(env.DB);

		const report = await db.select().from(reports).where(eq(reports.id, reportId)).get();
		if (!report) return fail(404, { error: 'Report not found' });
		if (report.status !== 'pending') return fail(409, { error: 'Report already reviewed' });
		if (report.targetType !== 'listing' || report.targetId !== listingId)
			return fail(400, { error: 'Invalid report target' });

		await db.batch([
			db.update(listings).set({ status: 'removed' }).where(eq(listings.id, listingId)),

			db
				.update(reports)
				.set({ status: 'actioned', resolvedAt: new Date(), reviewerNotes: notes })
				.where(eq(reports.id, reportId)),

			db.insert(moderationActions).values({
				id: crypto.randomUUID(),
				actorId: locals.user.id,
				targetType: 'listing',
				targetId: listingId,
				actionType: 'remove_listing',
				reason: notes ?? 'No reason given',
				reportId
			})
		]);

		return { success: true, action: 'listing_removed' };
	},

	flagListing: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });
		if (!(await isAdminUser(env, locals.user.id))) return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const reportId = data.get('reportId') as string;
		const listingId = data.get('listingId') as string;
		const notes = (data.get('notes') as string)?.trim() || null;

		const db = getDb(env.DB);

		const report = await db.select().from(reports).where(eq(reports.id, reportId)).get();
		if (!report) return fail(404, { error: 'Report not found' });

		const listing = await db
			.select({ userId: listings.userId, subject: listings.subject })
			.from(listings)
			.where(eq(listings.id, listingId))
			.get();
		if (!listing) return fail(404, { error: 'Listing not found' });
		if (report.status !== 'pending') return fail(409, { error: 'Report already reviewed' });
		if (report.targetType !== 'listing' || report.targetId !== listingId)
			return fail(400, { error: 'Invalid report target' });

		await db.batch([
			db.update(listings).set({ status: 'flagged' }).where(eq(listings.id, listingId)),
			db
				.update(reports)
				.set({ status: 'actioned', resolvedAt: new Date(), reviewerNotes: notes })
				.where(eq(reports.id, reportId)),

			db.insert(moderationActions).values({
				id: crypto.randomUUID(),
				actorId: locals.user.id,
				targetType: 'listing',
				targetId: listingId,
				actionType: 'restrict',
				reason: notes ?? 'No reason given',
				reportId
			})
		]);

		// Notify the listing owner
		const owner = await db
			.select({ email: user.email })
			.from(user)
			.where(eq(user.id, listing.userId))
			.get();
		if (owner?.email) {
			sendEmail(env, {
				to: owner.email,
				...renderInstanceEmail(env, 'listingSuspended', {
					listingSubject: listing.subject,
					reason: notes ?? ''
				})
			}).catch((e) => console.error('Failed to send suspension email:', e));
		}

		return { success: true, action: 'listing_flagged' };
	},

	banUserFromListing: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });
		if (!(await isAdminUser(env, locals.user.id))) return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const reportId = data.get('reportId') as string;
		const listingId = data.get('listingId') as string;
		const notes = (data.get('notes') as string)?.trim() || null;

		const db = getDb(env.DB);

		const report = await db.select().from(reports).where(eq(reports.id, reportId)).get();
		if (!report) return fail(404, { error: 'Report not found' });

		const listing = await db
			.select({ userId: listings.userId })
			.from(listings)
			.where(eq(listings.id, listingId))
			.get();
		if (!listing) return fail(404, { error: 'Listing not found' });
		if (report.status !== 'pending') return fail(409, { error: 'Report already reviewed' });
		if (report.targetType !== 'listing' || report.targetId !== listingId)
			return fail(400, { error: 'Invalid report target' });

		await db.batch([
			db.update(userProfiles).set({ status: 'banned' }).where(eq(userProfiles.id, listing.userId)),
			db
				.update(listings)
				.set({ status: 'removed' })
				.where(and(eq(listings.userId, listing.userId), eq(listings.status, 'active'))),
			db
				.update(reports)
				.set({ status: 'actioned', resolvedAt: new Date(), reviewerNotes: notes })
				.where(eq(reports.id, reportId)),

			db.insert(moderationActions).values({
				id: crypto.randomUUID(),
				actorId: locals.user.id,
				targetType: 'user',
				targetId: listing.userId,
				actionType: 'ban',
				reason: notes ?? 'No reason given',
				reportId
			})
		]);

		// Fire-and-forget DBBL ban report
		const [bannedProfile, bannedUser] = await Promise.all([
			db
				.select({ encryptedPhone: userProfiles.encryptedPhone })
				.from(userProfiles)
				.where(eq(userProfiles.id, listing.userId))
				.get(),
			db.select({ email: user.email }).from(user).where(eq(user.id, listing.userId)).get()
		]);
		if (isDbblEnabled(env) && bannedProfile?.encryptedPhone && bannedUser?.email) {
			reportBanToDbbl({
				encryptedPhone: bannedProfile.encryptedPhone,
				email: bannedUser.email,
				category: report.category,
				env
			}).catch((e) => console.error('Failed to report ban to DBBL:', e));
		}

		return { success: true, action: 'banned' };
	},

	warn: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });
		if (!(await isAdminUser(env, locals.user.id))) return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const reportId = data.get('reportId') as string;
		const targetUserId = data.get('targetUserId') as string;
		const notes = (data.get('notes') as string)?.trim() || null;

		const db = getDb(env.DB);

		const report = await db.select().from(reports).where(eq(reports.id, reportId)).get();
		if (!report) return fail(404, { error: 'Report not found' });

		if (report.status !== 'pending') return fail(409, { error: 'Report already reviewed' });
		if (reportedUserId(report) !== targetUserId)
			return fail(400, { error: 'Invalid report target' });
		await db.batch([
			db
				.update(userProfiles)
				.set({ warningIssued: true, warningIssuedAt: new Date() })
				.where(eq(userProfiles.id, targetUserId)),

			db
				.update(reports)
				.set({ status: 'actioned', resolvedAt: new Date(), reviewerNotes: notes })
				.where(eq(reports.id, reportId)),

			db.insert(moderationActions).values({
				id: crypto.randomUUID(),
				actorId: locals.user.id,
				targetType: 'user',
				targetId: targetUserId,
				actionType: 'warn',
				reason: notes ?? 'No reason given',
				reportId
			})
		]);

		// Notify the warned user
		const warnedUser = await db
			.select({ email: user.email })
			.from(user)
			.where(eq(user.id, targetUserId))
			.get();
		if (warnedUser?.email) {
			sendEmail(env, {
				to: warnedUser.email,
				...renderInstanceEmail(env, 'accountWarning', { reason: notes ?? '' })
			}).catch((e) => console.error('Failed to send warning email:', e));
		}

		return { success: true, action: 'warned' };
	}
};
