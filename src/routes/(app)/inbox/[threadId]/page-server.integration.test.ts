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
});
