import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { reports, safetyCases } from '$lib/server/db/schema';
import { isAdminUser } from '$lib/server/admin-auth';
import type { ReviewQueue } from '$lib/server/content-safety/rules';

type InboxView = 'all' | ReviewQueue | 'reports';
const views: InboxView[] = ['all', 'urgent', 'solicitation', 'general', 'system', 'reports'];

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const env = platform?.env;
	if (!env || !(await isAdminUser(env, locals.user.id))) throw error(403, 'Forbidden');
	const requested = url.searchParams.get('view');
	const view: InboxView = views.includes(requested as InboxView) ? (requested as InboxView) : 'all';
	const db = getDb(env.DB);
	const [cases, userReports] = await Promise.all([
		view === 'reports'
			? Promise.resolve([])
			: db
					.select({
						id: safetyCases.id,
						targetType: safetyCases.targetType,
						queue: safetyCases.queue,
						matchedSections: safetyCases.matchedSections,
						reason: safetyCases.reason,
						createdAt: safetyCases.createdAt
					})
					.from(safetyCases)
					.where(
						view === 'all'
							? eq(safetyCases.status, 'pending')
							: and(eq(safetyCases.status, 'pending'), eq(safetyCases.queue, view))
					)
					.orderBy(desc(safetyCases.createdAt))
					.limit(100)
					.all(),
		view === 'all' || view === 'reports'
			? db
					.select({
						id: reports.id,
						targetType: reports.targetType,
						category: reports.category,
						createdAt: reports.createdAt
					})
					.from(reports)
					.where(eq(reports.status, 'pending'))
					.orderBy(desc(reports.createdAt))
					.limit(100)
					.all()
			: Promise.resolve([])
	]);
	const entries = [
		...cases.map((entry) => ({
			id: entry.id,
			source: 'automated' as const,
			targetType: entry.targetType,
			queue: entry.queue,
			sections: JSON.parse(entry.matchedSections) as string[],
			reason: entry.reason,
			createdAt: entry.createdAt
		})),
		...userReports.map((entry) => ({
			id: entry.id,
			source: 'user report' as const,
			targetType: entry.targetType,
			queue: 'reports',
			sections: [entry.category],
			reason: entry.category,
			createdAt: entry.createdAt
		}))
	].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	return { view, entries };
};
