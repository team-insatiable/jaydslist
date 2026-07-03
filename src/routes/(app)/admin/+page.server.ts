import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { reports, moderationActions, userProfiles, listings } from '$lib/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';

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
	const listingIds = [...new Set(rows.filter((r) => r.targetType === 'listing').map((r) => r.targetId))];
	const listingMap: Record<string, string> = {};
	if (listingIds.length > 0) {
		const ls = await db.select({ id: listings.id, subject: listings.subject }).from(listings).all();
		for (const l of ls) listingMap[l.id] = l.subject;
	}

	// Fetch aliases for user-targeted reports
	const targetUserIds = [...new Set(rows.filter((r) => r.targetType === 'user').map((r) => r.targetId))];
	const targetAliasMap: Record<string, string> = {};
	if (targetUserIds.length > 0) {
		const profiles = await db.select({ id: userProfiles.id, alias: userProfiles.alias }).from(userProfiles).all();
		for (const p of profiles) targetAliasMap[p.id] = p.alias ?? 'Unknown';
	}

	return {
		reports: rows.map((r) => ({
			...r,
			listingSubject: r.targetType === 'listing' ? (listingMap[r.targetId] ?? null) : null,
			targetAlias: r.targetType === 'user' ? (targetAliasMap[r.targetId] ?? null) : null
		})),
		status
	};
};

export const actions: Actions = {
	dismiss: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const reportId = data.get('reportId') as string;
		const notes = (data.get('notes') as string)?.trim() || null;

		const db = getDb(env.DB);

		const report = await db.select().from(reports).where(eq(reports.id, reportId)).get();
		if (!report) return fail(404, { error: 'Report not found' });

		await db.update(reports).set({ status: 'dismissed', resolvedAt: new Date(), reviewerNotes: notes }).where(eq(reports.id, reportId));

		await db.insert(moderationActions).values({
			id: crypto.randomUUID(),
			actorId: locals.user.id,
			targetType: report.targetType,
			targetId: report.targetId,
			actionType: 'dismiss_report',
			reason: notes ?? 'No reason given',
			reportId
		});

		return { success: true, action: 'dismissed' };
	},

	ban: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const reportId = data.get('reportId') as string;
		const targetUserId = data.get('targetUserId') as string;
		const notes = (data.get('notes') as string)?.trim() || null;

		const db = getDb(env.DB);

		const report = await db.select().from(reports).where(eq(reports.id, reportId)).get();
		if (!report) return fail(404, { error: 'Report not found' });

		// Ban the user
		await db.update(userProfiles).set({ status: 'banned' }).where(eq(userProfiles.id, targetUserId));

		// Remove their active listings
		await db.update(listings).set({ status: 'removed' }).where(and(eq(listings.userId, targetUserId), eq(listings.status, 'active')));

		// Resolve the report
		await db.update(reports).set({ status: 'actioned', resolvedAt: new Date(), reviewerNotes: notes }).where(eq(reports.id, reportId));

		await db.insert(moderationActions).values({
			id: crypto.randomUUID(),
			actorId: locals.user.id,
			targetType: 'user',
			targetId: targetUserId,
			actionType: 'ban',
			reason: notes ?? 'No reason given',
			reportId
		});

		return { success: true, action: 'banned' };
	},

	removeListing: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const reportId = data.get('reportId') as string;
		const listingId = data.get('listingId') as string;
		const notes = (data.get('notes') as string)?.trim() || null;

		const db = getDb(env.DB);

		const report = await db.select().from(reports).where(eq(reports.id, reportId)).get();
		if (!report) return fail(404, { error: 'Report not found' });

		await db.update(listings).set({ status: 'removed' }).where(eq(listings.id, listingId));

		await db.update(reports).set({ status: 'actioned', resolvedAt: new Date(), reviewerNotes: notes }).where(eq(reports.id, reportId));

		await db.insert(moderationActions).values({
			id: crypto.randomUUID(),
			actorId: locals.user.id,
			targetType: 'listing',
			targetId: listingId,
			actionType: 'remove_listing',
			reason: notes ?? 'No reason given',
			reportId
		});

		return { success: true, action: 'listing_removed' };
	}
};
