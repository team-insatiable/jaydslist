import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { createTestUser } from '$lib/server/test-helpers/fixtures';
import { getDb } from '$lib/server/db';
import { getActiveSafetyRules } from '$lib/server/safety-rules';
import { actions } from './+page.server';

const sampleRules = JSON.stringify([
	{
		id: 'coercion_terms',
		label: 'Coercion combination',
		intent: 'Flag coercion language with payment',
		falsePositiveRisk: 'May match discussion of a third party',
		scope: 'both',
		all: ['forced', 'payment']
	}
]);

function event(
	action: 'stage' | 'activate',
	userId: string,
	adminEmail: string,
	fields: Record<string, string>
) {
	const form = new FormData();
	for (const [key, value] of Object.entries(fields)) form.set(key, value);
	return {
		request: new Request(`http://localhost/admin/safety-rules?/${action}`, {
			method: 'POST',
			body: form
		}),
		locals: { user: { id: userId } },
		platform: { env: { ...env, ADMIN_EMAILS: adminEmail } }
	} as Parameters<typeof actions.stage>[0];
}

describe('admin safety rules', () => {
	it('stages and activates a version with an audit history', async () => {
		const adminId = await createTestUser(env.DB);
		const adminEmail = `${adminId}@test.example`;
		expect(
			await actions.stage(
				event('stage', adminId, adminEmail, {
					rules: sampleRules,
					reason: 'Initial screening rules'
				})
			)
		).toMatchObject({ success: true });
		const revision = await env.DB.prepare(
			'SELECT id, version FROM safety_rule_revisions ORDER BY version DESC LIMIT 1'
		).first<{ id: string; version: number }>();
		expect(revision?.version).toBeGreaterThan(0);
		expect(
			await actions.activate(
				event('activate', adminId, adminEmail, {
					revisionId: revision!.id,
					reason: 'Reviewed for beta'
				})
			)
		).toMatchObject({ success: true });
		expect(await getActiveSafetyRules(getDb(env.DB))).toMatchObject({
			revisionId: revision!.id,
			rules: [{ id: 'coercion_terms' }]
		});
		const logs = await env.DB.prepare(
			"SELECT action_type FROM moderation_actions WHERE target_type = 'safety_rules' AND target_id = ?"
		)
			.bind(revision!.id)
			.all<{ action_type: string }>();
		expect(logs.results.map((entry) => entry.action_type)).toEqual([
			'stage_revision',
			'activate_revision'
		]);
	});

	it('rejects a signed-in non-admin before changing rules', async () => {
		const userId = await createTestUser(env.DB);
		const result = await actions.stage(
			event('stage', userId, 'someone-else@test.example', {
				rules: sampleRules,
				reason: 'Unauthorized'
			})
		);
		expect(result?.status).toBe(403);
	});

	it('rolls back a staged revision when the audit entry cannot be written', async () => {
		const adminId = await createTestUser(env.DB);
		const before = await env.DB.prepare(
			'SELECT COUNT(*) AS count FROM safety_rule_revisions'
		).first<{ count: number }>();
		await env.DB.prepare(
			`CREATE TRIGGER reject_safety_audit BEFORE INSERT ON moderation_actions
			WHEN NEW.action_type = 'stage_revision'
			BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END;`
		).run();
		try {
			const result = await actions.stage(
				event('stage', adminId, `${adminId}@test.example`, {
					rules: sampleRules,
					reason: 'Should roll back'
				})
			);
			expect(result?.status).toBe(500);
			const after = await env.DB.prepare(
				'SELECT COUNT(*) AS count FROM safety_rule_revisions'
			).first<{ count: number }>();
			expect(after?.count).toBe(before?.count);
		} finally {
			await env.DB.exec('DROP TRIGGER reject_safety_audit');
		}
	});
});
