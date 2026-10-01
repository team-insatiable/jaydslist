import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { createTestUser } from '$lib/server/test-helpers/fixtures';
import { getDb } from '$lib/server/db';
import { reports, userProfiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { actions } from './+page.server';

function warnEvent(adminId: string, targetUserId: string, reportId: string, adminEmail: string) {
	const form = new FormData();
	form.set('reportId', reportId);
	form.set('targetUserId', targetUserId);
	form.set('notes', 'Reviewed evidence');
	return {
		request: new Request('http://localhost/admin?/warn', { method: 'POST', body: form }),
		locals: { user: { id: adminId } },
		platform: { env: { ...env, ADMIN_EMAILS: adminEmail } }
	} as Parameters<typeof actions.warn>[0];
}

describe('admin moderation decisions', () => {
	it('records a warning and report resolution together', async () => {
		const adminId = await createTestUser(env.DB);
		const reporterId = await createTestUser(env.DB);
		const targetUserId = await createTestUser(env.DB);
		const reportId = crypto.randomUUID();
		const db = getDb(env.DB);
		await db.insert(reports).values({
			id: reportId,
			reporterId,
			targetType: 'user',
			targetId: targetUserId,
			category: 'harassment',
			reporterTrustScoreSnapshot: 0.5
		});
		expect(
			await actions.warn(warnEvent(adminId, targetUserId, reportId, `${adminId}@test.example`))
		).toMatchObject({ success: true });
		const report = await db.select().from(reports).where(eq(reports.id, reportId)).get();
		const target = await db
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.id, targetUserId))
			.get();
		const audit = await env.DB.prepare('SELECT * FROM moderation_actions WHERE report_id = ?')
			.bind(reportId)
			.first();
		expect(report?.status).toBe('actioned');
		expect(target?.warningIssued).toBe(true);
		expect(audit?.action_type).toBe('warn');
	});

	it('rejects a substituted target and a signed-in non-admin', async () => {
		const adminId = await createTestUser(env.DB);
		const reporterId = await createTestUser(env.DB);
		const targetUserId = await createTestUser(env.DB);
		const otherUserId = await createTestUser(env.DB);
		const reportId = crypto.randomUUID();
		await getDb(env.DB).insert(reports).values({
			id: reportId,
			reporterId,
			targetType: 'user',
			targetId: targetUserId,
			category: 'spam',
			reporterTrustScoreSnapshot: 0.5
		});
		expect(
			(await actions.warn(warnEvent(adminId, otherUserId, reportId, `${adminId}@test.example`)))
				?.status
		).toBe(400);
		expect(
			(await actions.warn(warnEvent(adminId, targetUserId, reportId, 'other@test.example')))?.status
		).toBe(403);
		const report = await getDb(env.DB).select().from(reports).where(eq(reports.id, reportId)).get();
		expect(report?.status).toBe('pending');
	});

	it('rolls back a warning when its audit insert fails', async () => {
		const adminId = await createTestUser(env.DB);
		const reporterId = await createTestUser(env.DB);
		const targetUserId = await createTestUser(env.DB);
		const reportId = crypto.randomUUID();
		const db = getDb(env.DB);
		await db.insert(reports).values({
			id: reportId,
			reporterId,
			targetType: 'user',
			targetId: targetUserId,
			category: 'spam',
			reporterTrustScoreSnapshot: 0.5
		});
		await env.DB.prepare(
			`CREATE TRIGGER reject_warning_audit BEFORE INSERT ON moderation_actions
			WHEN NEW.action_type = 'warn' BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END;`
		).run();
		try {
			await expect(
				actions.warn(warnEvent(adminId, targetUserId, reportId, `${adminId}@test.example`))
			).rejects.toThrow();
			const report = await db.select().from(reports).where(eq(reports.id, reportId)).get();
			const target = await db
				.select()
				.from(userProfiles)
				.where(eq(userProfiles.id, targetUserId))
				.get();
			expect(report?.status).toBe('pending');
			expect(target?.warningIssued).toBe(false);
		} finally {
			await env.DB.exec('DROP TRIGGER reject_warning_audit');
		}
	});
});
