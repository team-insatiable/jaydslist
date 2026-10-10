import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { isAdminUser } from '$lib/server/admin-auth';
import { getDb } from '$lib/server/db';
import { moderationActions, preservationHolds, reports, safetyCases } from '$lib/server/db/schema';

type HoldTarget = 'report' | 'safety_case';

function targetType(value: FormDataEntryValue | null): HoldTarget | null {
	return value === 'report' || value === 'safety_case' ? value : null;
}

async function requireAdmin(locals: App.Locals, env: Env | undefined) {
	if (!locals.user) throw error(401, 'Unauthorized');
	if (!env || !(await isAdminUser(env, locals.user.id))) throw error(403, 'Forbidden');
	return { env, actorId: locals.user.id };
}

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	const { env } = await requireAdmin(locals, platform?.env);
	const db = getDb(env.DB);
	const holds = await db
		.select()
		.from(preservationHolds)
		.orderBy(desc(preservationHolds.placedAt))
		.limit(100)
		.all();
	return {
		holds,
		targetType: url.searchParams.get('type') ?? '',
		targetId: url.searchParams.get('id') ?? ''
	};
};

export const actions: Actions = {
	place: async ({ locals, platform, request }) => {
		const { env, actorId } = await requireAdmin(locals, platform?.env);
		const data = await request.formData();
		const type = targetType(data.get('targetType'));
		const targetId = String(data.get('targetId') ?? '').trim();
		const reason = String(data.get('reason') ?? '').trim();
		if (!type || !targetId || targetId.length > 128 || !reason || reason.length > 1000)
			return fail(400, { error: 'A valid case and reason are required.' });
		const db = getDb(env.DB);
		const target =
			type === 'report'
				? await db.select({ id: reports.id }).from(reports).where(eq(reports.id, targetId)).get()
				: await db
						.select({ id: safetyCases.id })
						.from(safetyCases)
						.where(eq(safetyCases.id, targetId))
						.get();
		if (!target) return fail(404, { error: 'Case not found.' });
		const id = crypto.randomUUID();
		try {
			await db.batch([
				db.insert(preservationHolds).values({
					id,
					targetType: type,
					targetId,
					reason,
					placedBy: actorId
				}),
				db.insert(moderationActions).values({
					id: crypto.randomUUID(),
					actorId,
					targetType: 'preservation_hold',
					targetId: id,
					actionType: 'placed',
					reason,
					reportId: type === 'report' ? targetId : null
				})
			]);
		} catch {
			return fail(409, { error: 'An active hold already exists or the hold could not be saved.' });
		}
		return { success: 'placed' };
	},
	release: async ({ locals, platform, request }) => {
		const { env, actorId } = await requireAdmin(locals, platform?.env);
		const data = await request.formData();
		const id = String(data.get('holdId') ?? '');
		const reason = String(data.get('reason') ?? '').trim();
		if (!id || !reason || reason.length > 1000)
			return fail(400, { error: 'A hold and release reason are required.' });
		const db = getDb(env.DB);
		const hold = await db
			.select()
			.from(preservationHolds)
			.where(and(eq(preservationHolds.id, id), isNull(preservationHolds.releasedAt)))
			.get();
		if (!hold) return fail(404, { error: 'Active hold not found.' });
		try {
			await db.batch([
				db
					.update(preservationHolds)
					.set({ releasedBy: actorId, releasedAt: new Date(), releaseReason: reason })
					.where(and(eq(preservationHolds.id, id), isNull(preservationHolds.releasedAt))),
				db.insert(moderationActions).values({
					id: crypto.randomUUID(),
					actorId,
					targetType: 'preservation_hold',
					targetId: id,
					actionType: 'released',
					reason,
					reportId: hold.targetType === 'report' ? hold.targetId : null
				})
			]);
		} catch {
			return fail(409, { error: 'The hold could not be released.' });
		}
		return { success: 'released' };
	}
};
