import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { createTestUser } from '$lib/server/test-helpers/fixtures';
import { load } from './+page.server';

function event(adminId: string, view: string) {
	return {
		locals: { user: { id: adminId } },
		platform: { env: { ...env, ADMIN_EMAILS: `${adminId}@test.example` } },
		url: new URL(`http://localhost/admin/review?view=${view}`)
	} as Parameters<typeof load>[0];
}

describe('Content Safety review inbox', () => {
	it('shows one categorized automated case beside user reports and filters by queue', async () => {
		const adminId = await createTestUser(env.DB);
		const submitterId = await createTestUser(env.DB);
		const caseId = crypto.randomUUID();
		const reportId = crypto.randomUUID();
		await env.DB.prepare(
			`INSERT INTO safety_cases (id, target_type, target_id, submitter_id, matched_rule_ids,
			 matched_sections, queue, reason, evidence_snapshot)
			 VALUES (?, 'listing', ?, ?, '["child_rule","coercion_rule"]',
			 '["child_exploitation","trafficking_exploitation"]', 'urgent', 'rule_match', '{}')`
		)
			.bind(caseId, crypto.randomUUID(), submitterId)
			.run();
		await env.DB.prepare(
			`INSERT INTO reports (id, reporter_id, target_type, target_id, category, reporter_trust_score_snapshot)
			 VALUES (?, ?, 'listing', ?, 'spam', 0)`
		)
			.bind(reportId, submitterId, crypto.randomUUID())
			.run();
		const all = await load(event(adminId, 'all'));
		if (!all || !('entries' in all)) throw new Error('Expected inbox data');
		expect(all.entries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: caseId,
					queue: 'urgent',
					sections: ['child_exploitation', 'trafficking_exploitation']
				}),
				expect.objectContaining({ id: reportId, source: 'user report' })
			])
		);
		const urgent = await load(event(adminId, 'urgent'));
		if (!urgent || !('entries' in urgent)) throw new Error('Expected urgent inbox data');
		expect(urgent.entries.map((entry) => entry.id)).toContain(caseId);
		expect(urgent.entries.map((entry) => entry.id)).not.toContain(reportId);
	});
});
