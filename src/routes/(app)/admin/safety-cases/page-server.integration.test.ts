import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { getDb } from '$lib/server/db';
import { safetyRuleRevisions, safetyRuleState } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	createTestListing,
	createTestThread,
	createTestUser
} from '$lib/server/test-helpers/fixtures';
import { actions as threadActions, load as loadThread } from '../../inbox/[threadId]/+page.server';
import { actions as newThreadActions } from '../../inbox/new/+page.server';
import { load as loadInbox } from '../../inbox/+page.server';
import { actions as listingActions, load as loadListing } from '../../listings/[id]/+page.server';
import { actions as postActions } from '../../post/+page.server';
import { actions as caseActions } from './+page.server';

const safeEnv = { ...env, RESEND_API_KEY: undefined, VAPID_PRIVATE_KEY: undefined } as Env;

function sendEvent(threadId: string, userId: string, body: string) {
	const form = new FormData();
	form.set('body', body);
	return {
		params: { threadId },
		request: new Request('http://localhost/inbox/x', { method: 'POST', body: form }),
		locals: { user: { id: userId } },
		platform: { env: safeEnv }
	} as Parameters<typeof threadActions.send>[0];
}

function reviewEvent(caseId: string, actorId: string, adminId = actorId) {
	const form = new FormData();
	form.set('caseId', caseId);
	form.set('notes', 'Reviewed captured evidence');
	return {
		request: new Request('http://localhost/admin/safety-cases', { method: 'POST', body: form }),
		locals: { user: { id: actorId } },
		platform: { env: { ...safeEnv, ADMIN_EMAILS: `${adminId}@test.example` } }
	} as Parameters<typeof caseActions.release>[0];
}

async function activateRule(adminId: string, scope: 'message' | 'listing') {
	const db = getDb(env.DB);
	const latest = await db
		.select({ version: safetyRuleRevisions.version })
		.from(safetyRuleRevisions)
		.orderBy(safetyRuleRevisions.version)
		.all();
	const id = crypto.randomUUID();
	await db.insert(safetyRuleRevisions).values({
		id,
		version: Math.max(...latest.map((row) => row.version)) + 1,
		rulesJson: JSON.stringify({
			schemaVersion: 2,
			sections: [
				{
					id: 'trafficking_exploitation',
					label: 'Trafficking and exploitation',
					queue: 'urgent',
					rules: [
						{
							id: 'risk_combo',
							label: 'Test combination',
							intent: 'Test hold',
							falsePositiveRisk: 'Harmless context could match',
							scope,
							all: ['forced', 'payment']
						}
					]
				}
			]
		}),
		reason: 'Integration test',
		createdBy: adminId
	});
	await db
		.update(safetyRuleState)
		.set({ revisionId: id, updatedBy: adminId })
		.where(eq(safetyRuleState.id, 'active'));
	return id;
}

describe('safety screening and review', () => {
	beforeEach(async () => {
		await getDb(env.DB)
			.update(safetyRuleState)
			.set({
				revisionId: 'test-empty-rules',
				updatedBy: 'test-safety-operator'
			})
			.where(eq(safetyRuleState.id, 'active'));
	});

	it('holds a matched private message until an admin releases it', async () => {
		const adminId = await createTestUser(env.DB);
		const senderId = await createTestUser(env.DB);
		const recipientId = await createTestUser(env.DB);
		const listingId = await createTestListing(env.DB, recipientId);
		const threadId = await createTestThread(env.DB, {
			listingId,
			initiatorId: senderId,
			posterId: recipientId
		});
		const revisionId = await activateRule(adminId, 'message');
		expect(await threadActions.send(sendEvent(threadId, senderId, 'forced payment'))).toEqual({
			success: true,
			held: true
		});
		const message = await env.DB.prepare(
			'SELECT id, scan_status, scan_revision_id FROM messages WHERE thread_id = ?'
		)
			.bind(threadId)
			.first<{ id: string; scan_status: string; scan_revision_id: string }>();
		expect(message).toMatchObject({ scan_status: 'flagged', scan_revision_id: revisionId });
		const safetyCase = await env.DB.prepare(
			'SELECT id, evidence_snapshot, queue, matched_sections FROM safety_cases WHERE target_id = ?'
		)
			.bind(message!.id)
			.first<{ id: string; evidence_snapshot: string; queue: string; matched_sections: string }>();
		expect(safetyCase?.queue).toBe('urgent');
		expect(JSON.parse(safetyCase!.matched_sections)).toEqual(['trafficking_exploitation']);
		expect(JSON.parse(safetyCase!.evidence_snapshot)).toMatchObject({ body: 'forced payment' });

		const recipientView = await loadThread({
			params: { threadId },
			locals: { user: { id: recipientId } },
			platform: { env: safeEnv },
			depends: () => {}
		} as Parameters<typeof loadThread>[0]);
		expect(recipientView.messages).toEqual([]);
		const recipientInbox = await loadInbox({
			locals: { user: { id: recipientId } },
			platform: { env: safeEnv }
		} as Parameters<typeof loadInbox>[0]);
		expect(recipientInbox.threads).toEqual([]);

		expect(await caseActions.release(reviewEvent(safetyCase!.id, adminId))).toMatchObject({
			success: true,
			decision: 'release'
		});
		const delivered = await env.DB.prepare('SELECT scan_status FROM messages WHERE id = ?')
			.bind(message!.id)
			.first<{ scan_status: string }>();
		expect(delivered?.scan_status).toBe('cleared');
		const recipientAfter = await loadThread({
			params: { threadId },
			locals: { user: { id: recipientId } },
			platform: { env: safeEnv },
			depends: () => {}
		} as Parameters<typeof loadThread>[0]);
		expect(recipientAfter.messages[0].body).toBe('forced payment');
		const audit = await env.DB.prepare(
			'SELECT action_type, actor_id FROM moderation_actions WHERE target_id = ?'
		)
			.bind(safetyCase!.id)
			.first<{ action_type: string; actor_id: string }>();
		expect(audit).toMatchObject({ action_type: 'release', actor_id: adminId });
	});

	it('hides a new conversation when its first message is held', async () => {
		const adminId = await createTestUser(env.DB);
		const senderId = await createTestUser(env.DB);
		const recipientId = await createTestUser(env.DB);
		const listingId = await createTestListing(env.DB, recipientId);
		await activateRule(adminId, 'message');
		const form = new FormData();
		form.set(
			'body',
			'Hello, I would like to talk about your listing. I have time this weekend and can chat here first. forced payment'
		);
		const url = new URL(`http://localhost/inbox/new?listing=${listingId}`);
		await expect(
			newThreadActions.send({
				url,
				request: new Request(url, { method: 'POST', body: form }),
				locals: { user: { id: senderId, email: `${senderId}@test.example` } },
				platform: { env: safeEnv }
			} as Parameters<typeof newThreadActions.send>[0])
		).rejects.toMatchObject({ status: 303 });
		const recipientInbox = await loadInbox({
			locals: { user: { id: recipientId } },
			platform: { env: safeEnv }
		} as Parameters<typeof loadInbox>[0]);
		expect(recipientInbox.threads).toEqual([]);
		const senderInbox = await loadInbox({
			locals: { user: { id: senderId } },
			platform: { env: safeEnv }
		} as Parameters<typeof loadInbox>[0]);
		expect(senderInbox.threads).toHaveLength(1);
	});

	it('holds a listing on resume and only an admin can publish it', async () => {
		const adminId = await createTestUser(env.DB);
		const ownerId = await createTestUser(env.DB);
		const listingId = await createTestListing(env.DB, ownerId, {
			status: 'paused',
			subject: 'forced payment listing'
		});
		await activateRule(adminId, 'listing');
		const result = await listingActions.resume({
			params: { id: listingId },
			locals: { user: { id: ownerId } },
			platform: { env: safeEnv }
		} as Parameters<typeof listingActions.resume>[0]);
		expect(result).toMatchObject({ success: true, held: true });
		const listing = await env.DB.prepare('SELECT status FROM listings WHERE id = ?')
			.bind(listingId)
			.first<{ status: string }>();
		expect(listing?.status).toBe('pending_review');
		const safetyCase = await env.DB.prepare(
			'SELECT id FROM safety_cases WHERE target_type = ? AND target_id = ?'
		)
			.bind('listing', listingId)
			.first<{ id: string }>();
		expect((await caseActions.release(reviewEvent(safetyCase!.id, ownerId, adminId)))?.status).toBe(
			403
		);
		expect(await caseActions.release(reviewEvent(safetyCase!.id, adminId))).toMatchObject({
			success: true
		});
		const released = await env.DB.prepare('SELECT status FROM listings WHERE id = ?')
			.bind(listingId)
			.first<{ status: string }>();
		expect(released?.status).toBe('active');
	});

	it('holds a newly posted matching listing before it becomes public', async () => {
		const adminId = await createTestUser(env.DB);
		const ownerId = await createTestUser(env.DB, { lat: 40, lng: -75 });
		await activateRule(adminId, 'listing');
		const form = new FormData();
		form.set('subject', 'forced payment listing');
		form.set(
			'body',
			'This is a long enough listing body for the ordinary listing validation to accept it.'
		);
		form.set('nature', 'dating');
		await expect(
			postActions.post({
				request: new Request('http://localhost/post', { method: 'POST', body: form }),
				locals: { user: { id: ownerId } },
				platform: { env: safeEnv }
			} as Parameters<typeof postActions.post>[0])
		).rejects.toMatchObject({ status: 303 });
		const listing = await env.DB.prepare(
			'SELECT id, status, scan_revision_id FROM listings WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
		)
			.bind(ownerId)
			.first<{ id: string; status: string; scan_revision_id: string }>();
		expect(listing?.status).toBe('pending_review');
		expect(listing?.scan_revision_id).toBeTruthy();
		const viewerId = await createTestUser(env.DB);
		await expect(
			loadListing({
				params: { id: listing!.id },
				locals: { user: { id: viewerId } },
				platform: { env: safeEnv }
			} as Parameters<typeof loadListing>[0])
		).rejects.toMatchObject({ status: 404 });
	});

	it('holds submissions when the active rule set is unavailable', async () => {
		const senderId = await createTestUser(env.DB);
		const recipientId = await createTestUser(env.DB);
		const listingId = await createTestListing(env.DB, recipientId);
		const threadId = await createTestThread(env.DB, {
			listingId,
			initiatorId: senderId,
			posterId: recipientId
		});
		await getDb(env.DB).delete(safetyRuleState).where(eq(safetyRuleState.id, 'active'));
		try {
			expect(await threadActions.send(sendEvent(threadId, senderId, 'ordinary hello'))).toEqual({
				success: true,
				held: true
			});
			const scan = await env.DB.prepare(
				'SELECT s.reason FROM safety_scan_events s JOIN messages m ON m.id = s.target_id WHERE s.target_type = ? AND m.thread_id = ? LIMIT 1'
			)
				.bind('message', threadId)
				.first<{ reason: string }>();
			expect(scan?.reason).toBe('scanner_unavailable');
		} finally {
			await getDb(env.DB).insert(safetyRuleState).values({
				id: 'active',
				revisionId: 'test-empty-rules',
				updatedBy: 'test-safety-operator'
			});
		}
	});

	it('keeps a held message held if the review audit write fails', async () => {
		const adminId = await createTestUser(env.DB);
		const senderId = await createTestUser(env.DB);
		const recipientId = await createTestUser(env.DB);
		const listingId = await createTestListing(env.DB, recipientId);
		const threadId = await createTestThread(env.DB, {
			listingId,
			initiatorId: senderId,
			posterId: recipientId
		});
		await activateRule(adminId, 'message');
		await threadActions.send(sendEvent(threadId, senderId, 'forced payment'));
		const safetyCase = await env.DB.prepare(
			'SELECT c.id, c.target_id FROM safety_cases c JOIN messages m ON m.id = c.target_id WHERE c.target_type = ? AND m.thread_id = ? LIMIT 1'
		)
			.bind('message', threadId)
			.first<{ id: string; target_id: string }>();
		await env.DB.prepare(
			`CREATE TRIGGER reject_case_audit BEFORE INSERT ON moderation_actions
			WHEN NEW.target_type = 'safety_case' BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END;`
		).run();
		try {
			const result = await caseActions.release(reviewEvent(safetyCase!.id, adminId));
			expect(result?.status).toBe(409);
			const message = await env.DB.prepare('SELECT scan_status FROM messages WHERE id = ?')
				.bind(safetyCase!.target_id)
				.first<{ scan_status: string }>();
			const pending = await env.DB.prepare('SELECT status FROM safety_cases WHERE id = ?')
				.bind(safetyCase!.id)
				.first<{ status: string }>();
			expect(message?.scan_status).toBe('flagged');
			expect(pending?.status).toBe('pending');
		} finally {
			await env.DB.exec('DROP TRIGGER reject_case_audit');
		}
	});
});
