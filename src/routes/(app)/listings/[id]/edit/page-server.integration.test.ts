import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { actions } from './+page.server';
import { createTestUser, createTestListing } from '$lib/server/test-helpers/fixtures';

type SaveEvent = Parameters<typeof actions.save>[0];

function fakeEvent(
	listingId: string,
	userId: string,
	fields: Record<string, string | string[]>
): SaveEvent {
	const form = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		for (const v of Array.isArray(value) ? value : [value]) form.append(key, v);
	}
	return {
		params: { id: listingId },
		request: new Request(`http://localhost/listings/${listingId}/edit`, {
			method: 'POST',
			body: form
		}),
		locals: { user: { id: userId, email: 'test@example.com' } },
		platform: { env }
	} as unknown as SaveEvent;
}

const VALID_FIELDS = {
	nature: 'dating',
	subject: 'A perfectly valid subject line'
};

describe('save action', () => {
	let userId: string;
	let listingId: string;

	beforeEach(async () => {
		userId = await createTestUser(env.DB);
		listingId = await createTestListing(env.DB, userId);
	});

	it('rejects a submission with a flagged term left undefined', async () => {
		const result = await actions.save(
			fakeEvent(listingId, userId, {
				...VALID_FIELDS,
				body: 'Must be fit and mature, serious inquiries only please and thank you.'
			})
		);
		expect(result?.status).toBe(400);
		expect(result?.data?.error).toMatch(/fit/i);
		expect(result?.data?.error).toMatch(/mature/i);
		expect(result?.data?.error).toMatch(/serious/i);
	});

	it('accepts a submission once every flagged term is defined', async () => {
		await expect(
			actions.save(
				fakeEvent(listingId, userId, {
					...VALID_FIELDS,
					body: 'Must be fit, serious inquiries only please and thank you.',
					termKey: ['fit', 'serious'],
					termValue: ['in shape', 'not just messing around']
				})
			)
		).rejects.toMatchObject({ status: 303 });

		const defs = await env.DB.prepare(
			'SELECT term, definition FROM relative_term_definitions WHERE listing_id = ? ORDER BY term'
		)
			.bind(listingId)
			.all();
		expect(defs.results).toEqual([
			{ term: 'fit', definition: 'in shape' },
			{ term: 'serious', definition: 'not just messing around' }
		]);
	});

	it('replaces previous term definitions rather than appending to them', async () => {
		// first save with one flagged term
		await expect(
			actions.save(
				fakeEvent(listingId, userId, {
					...VALID_FIELDS,
					body: 'Must be fit and active, love spending time outdoors on the weekends.',
					termKey: 'fit',
					termValue: 'in shape'
				})
			)
		).rejects.toMatchObject({ status: 303 });

		// second save with a body that no longer flags "fit"
		await expect(
			actions.save(
				fakeEvent(listingId, userId, {
					...VALID_FIELDS,
					body: 'Looking for someone active and outgoing, love hiking on weekends.',
					termKey: 'outgoing',
					termValue: 'enjoys meeting new people'
				})
			)
		).rejects.toMatchObject({ status: 303 });

		const defs = await env.DB.prepare(
			'SELECT term FROM relative_term_definitions WHERE listing_id = ?'
		)
			.bind(listingId)
			.all();
		expect(defs.results).toEqual([{ term: 'outgoing' }]);
	});

	it('rejects saving to a listing owned by someone else', async () => {
		const otherUserId = await createTestUser(env.DB);
		const result = await actions.save(
			fakeEvent(listingId, otherUserId, {
				...VALID_FIELDS,
				body: 'A perfectly ordinary listing body with no flagged terms at all in it.'
			})
		);
		expect(result?.status).toBe(403);
	});
});
