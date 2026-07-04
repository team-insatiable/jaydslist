import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { actions } from './+page.server';
import { createTestUser, createTestListing } from '$lib/server/test-helpers/fixtures';

type SendEvent = Parameters<typeof actions.send>[0];

function fakeEvent(opts: { listingId: string; userId: string; body: string }): SendEvent {
	const form = new FormData();
	form.set('body', opts.body);
	const url = new URL(`http://localhost/inbox/new?listing=${opts.listingId}`);
	return {
		url,
		request: new Request(url, { method: 'POST', body: form }),
		locals: { user: { id: opts.userId, email: 'test@example.com' } },
		platform: { env }
	} as unknown as SendEvent;
}

const LONG_MESSAGE =
	"Hi there, I really enjoyed reading your listing and think we'd get along great. Would love to chat more and see where things go from here.";

describe('inbox/new send action', () => {
	let posterId: string;
	let initiatorId: string;
	let listingId: string;

	beforeEach(async () => {
		posterId = await createTestUser(env.DB);
		initiatorId = await createTestUser(env.DB);
		listingId = await createTestListing(env.DB, posterId);
	});

	it('rejects a message under the minimum length', async () => {
		const result = await actions.send(fakeEvent({ listingId, userId: initiatorId, body: 'hey' }));
		expect(result?.status).toBe(400);
		expect(result?.data?.error).toMatch(/100 characters/);
	});

	it('rejects replying to your own listing', async () => {
		const result = await actions.send(
			fakeEvent({ listingId, userId: posterId, body: LONG_MESSAGE })
		);
		expect(result?.status).toBe(400);
		expect(result?.data?.error).toMatch(/own listing/);
	});

	it('creates a thread and redirects on a valid message', async () => {
		await expect(
			actions.send(fakeEvent({ listingId, userId: initiatorId, body: LONG_MESSAGE }))
		).rejects.toMatchObject({ status: 303 });

		const threads = await env.DB.prepare(
			'SELECT * FROM conversation_threads WHERE listing_id = ? AND initiator_id = ?'
		)
			.bind(listingId, initiatorId)
			.all();
		expect(threads.results.length).toBe(1);
	});

	it('redirects to the existing thread instead of creating a duplicate', async () => {
		await expect(
			actions.send(fakeEvent({ listingId, userId: initiatorId, body: LONG_MESSAGE }))
		).rejects.toMatchObject({ status: 303 });
		await expect(
			actions.send(fakeEvent({ listingId, userId: initiatorId, body: LONG_MESSAGE }))
		).rejects.toMatchObject({ status: 303 });

		const threads = await env.DB.prepare(
			'SELECT * FROM conversation_threads WHERE listing_id = ? AND initiator_id = ?'
		)
			.bind(listingId, initiatorId)
			.all();
		expect(threads.results.length).toBe(1);
	});

	it('blocks a new thread once the daily velocity cap for a "new" tier account is hit', async () => {
		// THREAD_VELOCITY_NEW_PER_DAY defaults to 3 — pre-create 3 other threads for this user today
		for (let i = 0; i < 3; i++) {
			const otherPoster = await createTestUser(env.DB);
			const otherListing = await createTestListing(env.DB, otherPoster);
			await env.DB.prepare(
				'INSERT INTO conversation_threads (id, listing_id, initiator_id, poster_id) VALUES (?, ?, ?, ?)'
			)
				.bind(crypto.randomUUID(), otherListing, initiatorId, otherPoster)
				.run();
		}

		const result = await actions.send(
			fakeEvent({ listingId, userId: initiatorId, body: LONG_MESSAGE })
		);
		expect(result?.status).toBe(429);
		expect(result?.data?.error).toMatch(/daily limit/i);

		const profile = await env.DB.prepare('SELECT status FROM user_profiles WHERE id = ?')
			.bind(initiatorId)
			.all();
		expect(profile.results[0]?.status).not.toBe('suspended');
	});

	it('auto-suspends the account once thread count hits 3x the daily cap', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response('{}', { status: 200 }));

		// 3x the default cap of 3 = 9 prior threads today
		for (let i = 0; i < 9; i++) {
			const otherPoster = await createTestUser(env.DB);
			const otherListing = await createTestListing(env.DB, otherPoster);
			await env.DB.prepare(
				'INSERT INTO conversation_threads (id, listing_id, initiator_id, poster_id) VALUES (?, ?, ?, ?)'
			)
				.bind(crypto.randomUUID(), otherListing, initiatorId, otherPoster)
				.run();
		}

		const result = await actions.send(
			fakeEvent({ listingId, userId: initiatorId, body: LONG_MESSAGE })
		);
		expect(result?.status).toBe(429);
		expect(result?.data?.error).toMatch(/suspended/i);

		const profile = await env.DB.prepare('SELECT status FROM user_profiles WHERE id = ?')
			.bind(initiatorId)
			.all();
		expect(profile.results[0]?.status).toBe('suspended');

		fetchSpy.mockRestore();
	});
});
