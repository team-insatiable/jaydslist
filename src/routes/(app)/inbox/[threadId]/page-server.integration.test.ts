import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { actions } from './+page.server';
import {
	createTestUser,
	createTestListing,
	createTestThread,
	createTestMessage
} from '$lib/server/test-helpers/fixtures';

type SendEvent = Parameters<typeof actions.send>[0];
type DeclineEvent = Parameters<typeof actions.decline>[0];
type PauseEvent = Parameters<typeof actions.pauseListing>[0];
type ReportEvent = Parameters<typeof actions.report>[0];
type BlockEvent = Parameters<typeof actions.blockUser>[0];

function fakeEvent(overrides: { threadId: string; userId: string; body: string }): SendEvent {
	const form = new FormData();
	form.set('body', overrides.body);
	return {
		params: { threadId: overrides.threadId },
		request: new Request('http://localhost/inbox/x', { method: 'POST', body: form }),
		locals: { user: { id: overrides.userId, email: 'test@example.com' } },
		platform: { env }
	} as unknown as SendEvent;
}

function fakeDeclineEvent(overrides: {
	threadId: string;
	userId: string;
	phraseId: string;
}): DeclineEvent {
	const form = new FormData();
	form.set('phraseId', overrides.phraseId);
	return {
		params: { threadId: overrides.threadId },
		request: new Request('http://localhost/inbox/x', { method: 'POST', body: form }),
		locals: { user: { id: overrides.userId, email: 'test@example.com' } },
		platform: { env }
	} as unknown as DeclineEvent;
}

function fakePauseEvent(overrides: { threadId: string; userId: string }): PauseEvent {
	return {
		params: { threadId: overrides.threadId },
		request: new Request('http://localhost/inbox/x', { method: 'POST' }),
		locals: { user: { id: overrides.userId, email: 'test@example.com' } },
		platform: { env }
	} as unknown as PauseEvent;
}

function fakeReportEvent(overrides: {
	threadId: string;
	userId: string;
	targetUserId: string;
	category: string;
}): ReportEvent {
	const form = new FormData();
	form.set('targetUserId', overrides.targetUserId);
	form.set('category', overrides.category);
	form.set('detail', '');
	return {
		params: { threadId: overrides.threadId },
		request: new Request('http://localhost/inbox/x', { method: 'POST', body: form }),
		locals: { user: { id: overrides.userId, email: 'test@example.com' } },
		platform: { env }
	} as unknown as ReportEvent;
}

function fakeBlockEvent(overrides: { threadId: string; userId: string }): BlockEvent {
	return {
		params: { threadId: overrides.threadId },
		request: new Request('http://localhost/inbox/x', { method: 'POST' }),
		locals: { user: { id: overrides.userId, email: 'test@example.com' } },
		platform: { env }
	} as unknown as BlockEvent;
}

describe('inbox/[threadId] send action', () => {
	let posterId: string;
	let initiatorId: string;
	let threadId: string;

	beforeEach(async () => {
		posterId = await createTestUser(env.DB, { alias: 'Poster' });
		initiatorId = await createTestUser(env.DB, { alias: 'Initiator' });
		const listingId = await createTestListing(env.DB, posterId);
		threadId = await createTestThread(env.DB, { listingId, initiatorId, posterId });
	});

	it('allows a normal message to send', async () => {
		const result = await actions.send(
			fakeEvent({ threadId, userId: initiatorId, body: 'hello there' })
		);
		expect(result).toEqual({ success: true });

		const messages = await env.DB.prepare('SELECT * FROM messages WHERE thread_id = ?')
			.bind(threadId)
			.all();
		expect(messages.results.length).toBe(1);
	});

	it('blocks the sender and suspends their account after 10 messages in 10 minutes', async () => {
		for (let i = 0; i < 10; i++) {
			await createTestMessage(env.DB, { threadId, senderId: initiatorId, body: `msg ${i}` });
		}

		const result = await actions.send(
			fakeEvent({ threadId, userId: initiatorId, body: 'one too many' })
		);
		expect(result?.status).toBe(429);
		expect(result?.data?.error).toMatch(/suspended/i);

		const profile = await env.DB.prepare('SELECT status FROM user_profiles WHERE id = ?')
			.bind(initiatorId)
			.all();
		expect(profile.results[0]?.status).toBe('suspended');

		// the blocked message itself must not have been inserted
		const messages = await env.DB.prepare('SELECT * FROM messages WHERE thread_id = ? AND body = ?')
			.bind(threadId, 'one too many')
			.all();
		expect(messages.results.length).toBe(0);
	});

	it('does not count the other participants messages toward the flood limit', async () => {
		for (let i = 0; i < 10; i++) {
			await createTestMessage(env.DB, { threadId, senderId: posterId, body: `poster msg ${i}` });
		}

		const result = await actions.send(
			fakeEvent({ threadId, userId: initiatorId, body: 'still fine' })
		);
		expect(result).toEqual({ success: true });
	});

	it('rejects sending into a thread the user is not part of', async () => {
		const strangerId = await createTestUser(env.DB);
		const result = await actions.send(
			fakeEvent({ threadId, userId: strangerId, body: 'not my thread' })
		);
		expect(result?.status).toBe(403);
	});

	it('rejects sending when the sender is blocked by the other party', async () => {
		await env.DB.prepare(
			'INSERT INTO user_blocks (id, blocker_id, blocked_id, created_at) VALUES (?, ?, ?, ?)'
		)
			.bind(crypto.randomUUID(), posterId, initiatorId, Date.now())
			.run();
		const result = await actions.send(
			fakeEvent({ threadId, userId: initiatorId, body: 'trying to message' })
		);
		expect(result?.status).toBe(403);
		expect(result?.data?.error).toMatch(/cannot send/i);
	});

	it('rejects sending when the sender has blocked the other party', async () => {
		await env.DB.prepare(
			'INSERT INTO user_blocks (id, blocker_id, blocked_id, created_at) VALUES (?, ?, ?, ?)'
		)
			.bind(crypto.randomUUID(), initiatorId, posterId, Date.now())
			.run();
		const result = await actions.send(
			fakeEvent({ threadId, userId: initiatorId, body: 'trying to message' })
		);
		expect(result?.status).toBe(403);
	});
});

describe('inbox/[threadId] decline action', () => {
	let posterId: string;
	let initiatorId: string;
	let threadId: string;

	beforeEach(async () => {
		posterId = await createTestUser(env.DB, { alias: 'Poster' });
		initiatorId = await createTestUser(env.DB, { alias: 'Initiator' });
		const listingId = await createTestListing(env.DB, posterId);
		threadId = await createTestThread(env.DB, { listingId, initiatorId, posterId });
	});

	it('rejects if the caller is not the poster', async () => {
		const result = await actions.decline(
			fakeDeclineEvent({ threadId, userId: initiatorId, phraseId: 'not_looking' })
		);
		expect(result?.status).toBe(403);
	});

	it('rejects an invalid phraseId', async () => {
		const result = await actions.decline(
			fakeDeclineEvent({ threadId, userId: posterId, phraseId: 'garbage' })
		);
		expect(result?.status).toBe(400);
	});

	it('closes the thread and inserts the decline message', async () => {
		const result = await actions.decline(
			fakeDeclineEvent({ threadId, userId: posterId, phraseId: 'not_looking' })
		);
		expect(result).toMatchObject({ declined: true });

		const thread = await env.DB.prepare('SELECT status FROM conversation_threads WHERE id = ?')
			.bind(threadId)
			.first();
		expect(thread?.status).toBe('closed');

		const msgs = await env.DB.prepare(
			'SELECT body FROM messages WHERE thread_id = ? ORDER BY sent_at DESC LIMIT 1'
		)
			.bind(threadId)
			.first();
		expect(msgs?.body).toMatch(/not quite what I'm looking for/i);
	});

	it('returns nudgePause true for found_someone phrase', async () => {
		const result = await actions.decline(
			fakeDeclineEvent({ threadId, userId: posterId, phraseId: 'found_someone' })
		);
		expect(result).toMatchObject({ nudgePause: true });
	});

	it('returns nudgePause false for not_looking phrase', async () => {
		const result = await actions.decline(
			fakeDeclineEvent({ threadId, userId: posterId, phraseId: 'not_looking' })
		);
		expect(result).toMatchObject({ nudgePause: false });
	});

	it('rejects declining an already-closed thread', async () => {
		await env.DB.prepare("UPDATE conversation_threads SET status = 'closed' WHERE id = ?")
			.bind(threadId)
			.run();
		const result = await actions.decline(
			fakeDeclineEvent({ threadId, userId: posterId, phraseId: 'not_looking' })
		);
		expect(result?.status).toBe(400);
	});
});

describe('inbox/[threadId] pauseListing action', () => {
	let posterId: string;
	let initiatorId: string;
	let threadId: string;
	let listingId: string;

	beforeEach(async () => {
		posterId = await createTestUser(env.DB, { alias: 'Poster' });
		initiatorId = await createTestUser(env.DB, { alias: 'Initiator' });
		listingId = await createTestListing(env.DB, posterId);
		threadId = await createTestThread(env.DB, { listingId, initiatorId, posterId });
	});

	it('pauses the listing for the poster', async () => {
		const result = await actions.pauseListing(fakePauseEvent({ threadId, userId: posterId }));
		expect(result).toMatchObject({ paused: true });

		const listing = await env.DB.prepare('SELECT status FROM listings WHERE id = ?')
			.bind(listingId)
			.first();
		expect(listing?.status).toBe('paused');
	});

	it('rejects if the caller is not the poster', async () => {
		const result = await actions.pauseListing(fakePauseEvent({ threadId, userId: initiatorId }));
		expect(result?.status).toBe(403);
	});
});

describe('inbox/[threadId] report action', () => {
	let posterId: string;
	let initiatorId: string;
	let threadId: string;

	beforeEach(async () => {
		posterId = await createTestUser(env.DB, { alias: 'Poster' });
		initiatorId = await createTestUser(env.DB, { alias: 'Initiator' });
		const listingId = await createTestListing(env.DB, posterId);
		threadId = await createTestThread(env.DB, { listingId, initiatorId, posterId });
	});

	it('inserts a report row for a valid category', async () => {
		const result = await actions.report(
			fakeReportEvent({ threadId, userId: initiatorId, targetUserId: posterId, category: 'spam' })
		);
		expect(result).toMatchObject({ reported: true });

		const report = await env.DB.prepare('SELECT * FROM reports WHERE reporter_id = ?')
			.bind(initiatorId)
			.first();
		expect(report?.category).toBe('spam');
	});

	it('rejects an invalid category', async () => {
		const result = await actions.report(
			fakeReportEvent({
				threadId,
				userId: initiatorId,
				targetUserId: posterId,
				category: 'not_a_real_reason'
			})
		);
		expect(result?.status).toBe(400);
	});

	it('rejects reporting yourself', async () => {
		const result = await actions.report(
			fakeReportEvent({
				threadId,
				userId: initiatorId,
				targetUserId: initiatorId,
				category: 'spam'
			})
		);
		expect(result?.status).toBe(400);
	});

	it('rejects a non-participant', async () => {
		const strangerId = await createTestUser(env.DB);
		const result = await actions.report(
			fakeReportEvent({
				threadId,
				userId: strangerId,
				targetUserId: posterId,
				category: 'spam'
			})
		);
		expect(result?.status).toBe(403);
	});
});

describe('inbox/[threadId] blockUser action', () => {
	let posterId: string;
	let initiatorId: string;
	let threadId: string;

	beforeEach(async () => {
		posterId = await createTestUser(env.DB, { alias: 'Poster' });
		initiatorId = await createTestUser(env.DB, { alias: 'Initiator' });
		const listingId = await createTestListing(env.DB, posterId);
		threadId = await createTestThread(env.DB, { listingId, initiatorId, posterId });
	});

	it('inserts a block row and returns blocked: true', async () => {
		const result = await actions.blockUser(fakeBlockEvent({ threadId, userId: posterId }));
		expect(result).toMatchObject({ blocked: true });

		const block = await env.DB.prepare(
			'SELECT * FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?'
		)
			.bind(posterId, initiatorId)
			.first();
		expect(block).toBeTruthy();
	});

	it('closes all open threads between the two users', async () => {
		await actions.blockUser(fakeBlockEvent({ threadId, userId: posterId }));

		const thread = await env.DB.prepare('SELECT status FROM conversation_threads WHERE id = ?')
			.bind(threadId)
			.first();
		expect(thread?.status).toBe('closed');
	});

	it('is idempotent — blocking the same user twice does not error', async () => {
		await actions.blockUser(fakeBlockEvent({ threadId, userId: posterId }));
		const result = await actions.blockUser(fakeBlockEvent({ threadId, userId: posterId }));
		expect(result).toMatchObject({ blocked: true });
	});

	it('rejects a non-participant', async () => {
		const strangerId = await createTestUser(env.DB);
		const result = await actions.blockUser(fakeBlockEvent({ threadId, userId: strangerId }));
		expect(result?.status).toBe(403);
	});

	it('either party can initiate the block', async () => {
		const result = await actions.blockUser(fakeBlockEvent({ threadId, userId: initiatorId }));
		expect(result).toMatchObject({ blocked: true });

		const block = await env.DB.prepare(
			'SELECT * FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?'
		)
			.bind(initiatorId, posterId)
			.first();
		expect(block).toBeTruthy();
	});
});
