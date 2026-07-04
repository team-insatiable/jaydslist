import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { actions } from './+page.server';
import { createTestUser } from '$lib/server/test-helpers/fixtures';

type PostEvent = Parameters<typeof actions.post>[0];

function fakeEvent(userId: string, fields: Record<string, string | string[]>): PostEvent {
	const form = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		for (const v of Array.isArray(value) ? value : [value]) form.append(key, v);
	}
	return {
		request: new Request('http://localhost/post', { method: 'POST', body: form }),
		locals: { user: { id: userId, email: 'test@example.com' } },
		platform: { env }
	} as unknown as PostEvent;
}

const VALID_FIELDS = {
	nature: 'dating',
	subject: 'A perfectly valid subject line',
	body: 'Looking for someone to grab coffee with and see where things go from there, no pressure.'
};

describe('post action', () => {
	let userId: string;

	beforeEach(async () => {
		userId = await createTestUser(env.DB, { identity: 'man', lat: 38.5816, lng: -121.4944 });
	});

	it('rejects a submission with a flagged term left undefined', async () => {
		const result = await actions.post(
			fakeEvent(userId, {
				...VALID_FIELDS,
				body: 'Looking for someone cute and down to earth, must love long walks on the beach.'
			})
		);
		expect(result?.status).toBe(400);
		expect(result?.data?.error).toMatch(/cute/i);
	});

	it('accepts a submission once the flagged term is defined', async () => {
		await expect(
			actions.post(
				fakeEvent(userId, {
					...VALID_FIELDS,
					body: 'Looking for someone cute and down to earth, must love long walks.',
					termKey: 'cute',
					termValue: 'takes care of themselves'
				})
			)
		).rejects.toMatchObject({ status: 303 });

		const rows = await env.DB.prepare('SELECT * FROM listings WHERE user_id = ?')
			.bind(userId)
			.all();
		expect(rows.results.length).toBe(1);

		const defs = await env.DB.prepare(
			'SELECT term, definition FROM relative_term_definitions WHERE listing_id = ?'
		)
			.bind(rows.results[0].id)
			.all();
		expect(defs.results).toEqual([{ term: 'cute', definition: 'takes care of themselves' }]);
	});

	it('accepts a submission with no flagged terms at all', async () => {
		await expect(actions.post(fakeEvent(userId, VALID_FIELDS))).rejects.toMatchObject({
			status: 303
		});
	});

	it('rejects even when some but not all flagged terms are defined', async () => {
		const result = await actions.post(
			fakeEvent(userId, {
				...VALID_FIELDS,
				body: 'Looking for someone cute and fit, must be mature about things.',
				termKey: 'cute',
				termValue: 'nice smile'
			})
		);
		expect(result?.status).toBe(400);
		expect(result?.data?.error).toMatch(/fit/i);
		expect(result?.data?.error).toMatch(/mature/i);
		expect(result?.data?.error).not.toMatch(/\bcute\b/i);
	});
});
