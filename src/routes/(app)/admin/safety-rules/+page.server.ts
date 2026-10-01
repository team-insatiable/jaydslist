import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { moderationActions, safetyRuleRevisions, safetyRuleState } from '$lib/server/db/schema';
import { parseSafetyRules } from '$lib/server/safety-rules';
import { isAdminUser } from '$lib/server/admin-auth';

export const load: PageServerLoad = async ({ platform }) => {
	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');
	const db = getDb(env.DB);
	const [revisions, state, history] = await Promise.all([
		db.select().from(safetyRuleRevisions).orderBy(desc(safetyRuleRevisions.version)).all(),
		db.select().from(safetyRuleState).where(eq(safetyRuleState.id, 'active')).get(),
		db
			.select()
			.from(moderationActions)
			.where(eq(moderationActions.targetType, 'safety_rules'))
			.orderBy(desc(moderationActions.createdAt))
			.all()
	]);
	return { revisions, activeRevisionId: state?.revisionId ?? null, history };
};

export const actions: Actions = {
	stage: async ({ request, locals, platform }) => {
		const env = platform?.env;
		if (!env || !locals.user || !(await isAdminUser(env, locals.user.id)))
			return fail(403, { error: 'Forbidden' });
		const data = await request.formData();
		const reason = String(data.get('reason') ?? '').trim();
		const input = String(data.get('rules') ?? '');
		if (!reason || reason.length > 500) return fail(400, { error: 'A reason is required' });
		let rules;
		try {
			rules = parseSafetyRules(input);
		} catch (cause) {
			return fail(400, { error: cause instanceof Error ? cause.message : 'Invalid rules' });
		}
		const db = getDb(env.DB);
		const latest = await db
			.select({ version: safetyRuleRevisions.version })
			.from(safetyRuleRevisions)
			.orderBy(desc(safetyRuleRevisions.version))
			.get();
		const revisionId = crypto.randomUUID();
		try {
			await db.batch([
				db.insert(safetyRuleRevisions).values({
					id: revisionId,
					version: (latest?.version ?? 0) + 1,
					rulesJson: JSON.stringify(rules),
					reason,
					createdBy: locals.user.id
				}),
				db.insert(moderationActions).values({
					id: crypto.randomUUID(),
					actorId: locals.user.id,
					targetType: 'safety_rules',
					targetId: revisionId,
					actionType: 'stage_revision',
					reason
				})
			]);
		} catch (cause) {
			if (String(cause).includes('UNIQUE'))
				return fail(409, { error: 'The rule set changed; retry with the latest revision' });
			return fail(500, { error: 'Unable to save revision and audit entry' });
		}
		return { success: true };
	},
	activate: async ({ request, locals, platform }) => {
		const env = platform?.env;
		if (!env || !locals.user || !(await isAdminUser(env, locals.user.id)))
			return fail(403, { error: 'Forbidden' });
		const data = await request.formData();
		const revisionId = String(data.get('revisionId') ?? '');
		const reason = String(data.get('reason') ?? '').trim();
		if (!reason || reason.length > 500) return fail(400, { error: 'A reason is required' });
		const db = getDb(env.DB);
		const revision = await db
			.select({ id: safetyRuleRevisions.id })
			.from(safetyRuleRevisions)
			.where(eq(safetyRuleRevisions.id, revisionId))
			.get();
		if (!revision) return fail(404, { error: 'Revision not found' });
		await db.batch([
			db
				.insert(safetyRuleState)
				.values({ id: 'active', revisionId, updatedBy: locals.user.id, updatedAt: new Date() })
				.onConflictDoUpdate({
					target: safetyRuleState.id,
					set: { revisionId, updatedBy: locals.user.id, updatedAt: new Date() }
				}),
			db.insert(moderationActions).values({
				id: crypto.randomUUID(),
				actorId: locals.user.id,
				targetType: 'safety_rules',
				targetId: revisionId,
				actionType: 'activate_revision',
				reason
			})
		]);
		return { success: true };
	}
};
