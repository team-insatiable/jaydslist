import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { userProfiles, listings, moderationActions } from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth.schema';
import { eq, desc, like, or, count } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url, platform }) => {
	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	const db = getDb(env.DB);
	const q = url.searchParams.get('q')?.trim() ?? '';

	let rows: {
		id: string;
		alias: string | null;
		email: string;
		status: string;
		trustTier: string;
		phoneVerified: boolean;
		isSupporter: boolean;
		createdAt: Date | null;
		activeListings: number;
	}[] = [];

	if (q.length >= 3) {
		const users = await db
			.select({
				id: user.id,
				email: user.email,
				createdAt: user.createdAt,
				alias: userProfiles.alias,
				status: userProfiles.status,
				trustTier: userProfiles.trustTier,
				phoneVerified: userProfiles.phoneVerified,
				isSupporter: userProfiles.isSupporter
			})
			.from(user)
			.leftJoin(userProfiles, eq(user.id, userProfiles.id))
			.where(
				or(
					like(user.email, `%${q}%`),
					like(userProfiles.alias, `%${q}%`)
				)
			)
			.orderBy(desc(user.createdAt))
			.limit(50)
			.all();

		// Get active listing counts
		const listingCounts = await db
			.select({ userId: listings.userId, cnt: count() })
			.from(listings)
			.where(eq(listings.status, 'active'))
			.groupBy(listings.userId)
			.all();

		const countMap = Object.fromEntries(listingCounts.map((r) => [r.userId, r.cnt]));

		rows = users.map((u) => ({
			id: u.id,
			email: u.email,
			alias: u.alias,
			status: u.status ?? 'active',
			trustTier: u.trustTier ?? 'new',
			phoneVerified: u.phoneVerified ?? false,
			isSupporter: u.isSupporter ?? false,
			createdAt: u.createdAt,
			activeListings: countMap[u.id] ?? 0
		}));
	}

	return { users: rows, q };
};

export const actions: Actions = {
	ban: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const targetUserId = data.get('targetUserId') as string;
		const reason = (data.get('reason') as string)?.trim() || 'Admin ban';

		const db = getDb(env.DB);
		await db.update(userProfiles).set({ status: 'banned' }).where(eq(userProfiles.id, targetUserId));
		await db.update(listings).set({ status: 'removed' }).where(eq(listings.userId, targetUserId));
		await db.insert(moderationActions).values({
			id: crypto.randomUUID(),
			actorId: locals.user.id,
			targetType: 'user',
			targetId: targetUserId,
			actionType: 'ban',
			reason
		});

		return { success: true };
	},

	unban: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const targetUserId = data.get('targetUserId') as string;

		const db = getDb(env.DB);
		await db.update(userProfiles).set({ status: 'active' }).where(eq(userProfiles.id, targetUserId));
		await db.insert(moderationActions).values({
			id: crypto.randomUUID(),
			actorId: locals.user.id,
			targetType: 'user',
			targetId: targetUserId,
			actionType: 'unban',
			reason: 'Admin unban'
		});

		return { success: true };
	}
};
