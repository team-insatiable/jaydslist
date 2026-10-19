import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { createTestUser } from '$lib/server/test-helpers/fixtures';
import { getDb } from '$lib/server/db';
import { getActiveSafetyRules } from '$lib/server/content-safety/rules';
import { actions, load } from './+page.server';

const sampleRules = JSON.stringify({
	schemaVersion: 2,
	sections: [
		{
			id: 'trafficking_exploitation',
			label: 'Trafficking and exploitation',
			queue: 'urgent',
			rules: [
				{
					id: 'coercion_terms',
					label: 'Coercion combination',
					intent: 'Flag coercion language with payment',
					falsePositiveRisk: 'May match discussion of a third party',
					scope: 'both',
					all: ['forced', 'payment']
				}
			]
		}
	]
});

function event(
	action: 'stage' | 'activate' | 'publish',
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
	it('saves and activates a first rule set with one reason and one audit entry', async () => {
		const adminId = await createTestUser(env.DB);
		const reason = 'Reviewed initial beta rules';
		expect(
			await actions.publish(
				event('publish', adminId, `${adminId}@test.example`, { rules: sampleRules, reason })
			)
		).toMatchObject({ success: true, action: 'published' });
		const revision = await env.DB.prepare(
			'SELECT id, reason FROM safety_rule_revisions ORDER BY version DESC LIMIT 1'
		).first<{ id: string; reason: string }>();
		expect(revision?.reason).toBe(reason);
		expect((await getActiveSafetyRules(getDb(env.DB)))?.revisionId).toBe(revision?.id);
		const logs = await env.DB.prepare(
			"SELECT action_type, reason FROM moderation_actions WHERE target_type = 'safety_rules' AND target_id = ?"
		)
			.bind(revision!.id)
			.all<{ action_type: string; reason: string }>();
		expect(logs.results).toMatchObject([{ action_type: 'publish_revision', reason }]);
	});

	it('turns on a saved first rule set using its existing reason', async () => {
		const adminId = await createTestUser(env.DB);
		const email = `${adminId}@test.example`;
		await env.DB.prepare("DELETE FROM safety_rule_state WHERE id = 'active'").run();
		await actions.stage(
			event('stage', adminId, email, { rules: sampleRules, reason: 'Initial deploy' })
		);
		const revision = await env.DB.prepare(
			'SELECT id FROM safety_rule_revisions ORDER BY version DESC LIMIT 1'
		).first<{ id: string }>();
		expect(
			await actions.activate(event('activate', adminId, email, { revisionId: revision!.id }))
		).toMatchObject({ success: true, action: 'activated' });
		const activation = await env.DB.prepare(
			"SELECT reason FROM moderation_actions WHERE action_type = 'activate_revision' AND target_id = ?"
		)
			.bind(revision!.id)
			.first<{ reason: string }>();
		expect(activation?.reason).toBe('Initial deploy');
	});

	it('requires a fresh reason when switching away from an active rule set', async () => {
		const adminId = await createTestUser(env.DB);
		const email = `${adminId}@test.example`;
		await actions.publish(
			event('publish', adminId, email, { rules: sampleRules, reason: 'First' })
		);
		const active = await env.DB.prepare('SELECT revision_id FROM safety_rule_state WHERE id = ?')
			.bind('active')
			.first<{ revision_id: string }>();
		await actions.stage(event('stage', adminId, email, { rules: sampleRules, reason: 'Second' }));
		const staged = await env.DB.prepare(
			'SELECT id FROM safety_rule_revisions ORDER BY version DESC LIMIT 1'
		).first<{ id: string }>();
		const result = await actions.activate(
			event('activate', adminId, email, { revisionId: staged!.id })
		);
		expect(result?.status).toBe(400);
		expect(
			await env.DB.prepare('SELECT revision_id FROM safety_rule_state WHERE id = ?')
				.bind('active')
				.first<{ revision_id: string }>()
		).toMatchObject({ revision_id: active?.revision_id });
	});

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
		).toMatchObject({ success: true, action: 'staged' });
		const revision = await env.DB.prepare(
			'SELECT id, version FROM safety_rule_revisions ORDER BY version DESC LIMIT 1'
		).first<{ id: string; version: number }>();
		expect(revision?.version).toBeGreaterThan(0);
		const review = await load({ platform: { env } } as Parameters<typeof load>[0]);
		if (!review || !('revisions' in review)) throw new Error('Expected rule revisions');
		expect(review.revisions.find((entry) => entry.id === revision?.id)?.policy).toMatchObject({
			sections: [
				{ label: 'Trafficking and exploitation', rules: [{ label: 'Coercion combination' }] }
			]
		});
		expect(
			await actions.activate(
				event('activate', adminId, adminEmail, {
					revisionId: revision!.id,
					reason: 'Reviewed for beta'
				})
			)
		).toMatchObject({ success: true, action: 'activated' });
		expect(await getActiveSafetyRules(getDb(env.DB))).toMatchObject({
			revisionId: revision!.id,
			rules: [{ id: 'coercion_terms', sectionId: 'trafficking_exploitation', queue: 'urgent' }]
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

	it('keeps the current rules active if publishing cannot write its audit entry', async () => {
		const adminId = await createTestUser(env.DB);
		const email = `${adminId}@test.example`;
		await actions.publish(
			event('publish', adminId, email, { rules: sampleRules, reason: 'Active' })
		);
		const before = await env.DB.prepare('SELECT revision_id FROM safety_rule_state WHERE id = ?')
			.bind('active')
			.first<{ revision_id: string }>();
		const countBefore = await env.DB.prepare(
			'SELECT COUNT(*) AS count FROM safety_rule_revisions'
		).first<{ count: number }>();
		await env.DB.prepare(
			`CREATE TRIGGER reject_publish_audit BEFORE INSERT ON moderation_actions
			WHEN NEW.action_type = 'publish_revision'
			BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END;`
		).run();
		try {
			const result = await actions.publish(
				event('publish', adminId, email, { rules: sampleRules, reason: 'Must fail' })
			);
			expect(result?.status).toBe(500);
			expect(
				await env.DB.prepare('SELECT revision_id FROM safety_rule_state WHERE id = ?')
					.bind('active')
					.first<{ revision_id: string }>()
			).toMatchObject({ revision_id: before?.revision_id });
			const countAfter = await env.DB.prepare(
				'SELECT COUNT(*) AS count FROM safety_rule_revisions'
			).first<{ count: number }>();
			expect(countAfter?.count).toBe(countBefore?.count);
		} finally {
			await env.DB.exec('DROP TRIGGER reject_publish_audit');
		}
	});
});
