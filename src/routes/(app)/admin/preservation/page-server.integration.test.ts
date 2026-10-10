import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { getDb } from '$lib/server/db';
import { safetyCases } from '$lib/server/db/schema';
import { createTestUser } from '$lib/server/test-helpers/fixtures';
import { actions, load } from './+page.server';

async function setup() {
	const adminId = await createTestUser(env.DB);
	const caseId = crypto.randomUUID();
	await getDb(env.DB)
		.insert(safetyCases)
		.values({
			id: caseId,
			targetType: 'message',
			targetId: crypto.randomUUID(),
			submitterId: adminId,
			reason: 'Test review',
			evidenceSnapshot: JSON.stringify({ body: 'test' })
		});
	return { adminId, caseId };
}

function event(actorId: string, adminId: string, fields: Record<string, string>) {
	const form = new FormData();
	for (const [key, value] of Object.entries(fields)) form.set(key, value);
	return {
		request: new Request('http://localhost/admin/preservation', { method: 'POST', body: form }),
		locals: { user: { id: actorId } },
		platform: { env: { ...env, ADMIN_EMAILS: `${adminId}@test.example` } }
	} as Parameters<typeof actions.place>[0];
}

describe('preservation holds', () => {
	it('places and releases a case hold with an audit entry for each decision', async () => {
		const { adminId, caseId } = await setup();
		const placeFields = {
			targetType: 'safety_case',
			targetId: caseId,
			reason: 'Preservation request reference 123'
		};
		expect(await actions.place(event(adminId, adminId, placeFields))).toEqual({
			success: 'placed'
		});
		const hold = await env.DB.prepare(
			'SELECT id, released_at FROM preservation_holds WHERE target_id = ?'
		)
			.bind(caseId)
			.first<{ id: string; released_at: number | null }>();
		expect(hold?.released_at).toBeNull();
		expect(await actions.place(event(adminId, adminId, placeFields))).toMatchObject({
			status: 409
		});
		const releaseEvent = event(adminId, adminId, {
			holdId: hold!.id,
			reason: 'Request withdrawn after review'
		});
		expect(await actions.release(releaseEvent)).toEqual({ success: 'released' });
		const released = await env.DB.prepare(
			'SELECT released_by, released_at, release_reason FROM preservation_holds WHERE id = ?'
		)
			.bind(hold!.id)
			.first<{ released_by: string; released_at: number; release_reason: string }>();
		expect(released).toMatchObject({
			released_by: adminId,
			release_reason: 'Request withdrawn after review'
		});
		expect(released!.released_at).toBeGreaterThan(0);
		const audit = await env.DB.prepare(
			'SELECT action_type, actor_id FROM moderation_actions WHERE target_type = ? AND target_id = ?'
		)
			.bind('preservation_hold', hold!.id)
			.all<{ action_type: string; actor_id: string }>();
		expect(audit.results).toEqual([
			{ action_type: 'placed', actor_id: adminId },
			{ action_type: 'released', actor_id: adminId }
		]);
	});

	it('rejects a non-admin before exposing holds or changing them', async () => {
		const { adminId, caseId } = await setup();
		const otherId = await createTestUser(env.DB);
		const unauthorized = event(otherId, adminId, {
			targetType: 'safety_case',
			targetId: caseId,
			reason: 'Unauthorized hold'
		});
		await expect(actions.place(unauthorized)).rejects.toMatchObject({ status: 403 });
		await expect(
			load({
				locals: { user: { id: otherId } },
				platform: unauthorized.platform,
				url: new URL('http://localhost/admin/preservation')
			} as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 403 });
	});

	it('rolls back a hold if its audit entry cannot be written', async () => {
		const { adminId, caseId } = await setup();
		await env.DB.prepare(
			`CREATE TRIGGER reject_preservation_audit BEFORE INSERT ON moderation_actions
			 WHEN NEW.target_type = 'preservation_hold' BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END`
		).run();
		try {
			expect(
				await actions.place(
					event(adminId, adminId, {
						targetType: 'safety_case',
						targetId: caseId,
						reason: 'Preservation request reference 456'
					})
				)
			).toMatchObject({ status: 409 });
			const holds = await env.DB.prepare(
				'SELECT id FROM preservation_holds WHERE target_type = ? AND target_id = ?'
			)
				.bind('safety_case', caseId)
				.all();
			expect(holds.results).toEqual([]);
		} finally {
			await env.DB.prepare('DROP TRIGGER reject_preservation_audit').run();
		}
	});
});
