import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { actions } from './+page.server';
import { createTestUser, createTestVaultPhoto } from '$lib/server/test-helpers/fixtures';

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

describe('post action photo attachments', () => {
	let supporterId: string;
	let freeUserId: string;

	beforeEach(async () => {
		supporterId = await createTestUser(env.DB, {
			identity: 'man',
			lat: 38.5816,
			lng: -121.4944,
			isSupporter: true
		});
		freeUserId = await createTestUser(env.DB, {
			identity: 'man',
			lat: 38.5816,
			lng: -121.4944,
			isSupporter: false
		});
	});

	it('attaches valid own vault photos in submitted order', async () => {
		const photo1 = await createTestVaultPhoto(env.DB, supporterId);
		const photo2 = await createTestVaultPhoto(env.DB, supporterId);

		await expect(
			actions.post(fakeEvent(supporterId, { ...VALID_FIELDS, photoId: [photo1, photo2] }))
		).rejects.toMatchObject({ status: 303 });

		const listing = await env.DB.prepare('SELECT id FROM listings WHERE user_id = ?')
			.bind(supporterId)
			.first<{ id: string }>();

		const rows = await env.DB.prepare(
			'SELECT vault_photo_id, display_order FROM listing_photos WHERE listing_id = ? ORDER BY display_order'
		)
			.bind(listing!.id)
			.all();
		expect(rows.results).toEqual([
			{ vault_photo_id: photo1, display_order: 0 },
			{ vault_photo_id: photo2, display_order: 1 }
		]);
	});

	it('silently drops a photo id belonging to another user', async () => {
		const otherUserId = await createTestUser(env.DB, { isSupporter: true });
		const foreignPhoto = await createTestVaultPhoto(env.DB, otherUserId);
		const ownPhoto = await createTestVaultPhoto(env.DB, supporterId);

		await expect(
			actions.post(fakeEvent(supporterId, { ...VALID_FIELDS, photoId: [foreignPhoto, ownPhoto] }))
		).rejects.toMatchObject({ status: 303 });

		const listing = await env.DB.prepare('SELECT id FROM listings WHERE user_id = ?')
			.bind(supporterId)
			.first<{ id: string }>();

		const rows = await env.DB.prepare(
			'SELECT vault_photo_id FROM listing_photos WHERE listing_id = ?'
		)
			.bind(listing!.id)
			.all();
		expect(rows.results).toEqual([{ vault_photo_id: ownPhoto }]);
	});

	it('silently drops all photo ids for a non-supporter, listing still posts', async () => {
		const photo = await createTestVaultPhoto(env.DB, freeUserId);

		await expect(
			actions.post(fakeEvent(freeUserId, { ...VALID_FIELDS, photoId: [photo] }))
		).rejects.toMatchObject({ status: 303 });

		const listing = await env.DB.prepare('SELECT id FROM listings WHERE user_id = ?')
			.bind(freeUserId)
			.first<{ id: string }>();

		const rows = await env.DB.prepare('SELECT id FROM listing_photos WHERE listing_id = ?')
			.bind(listing!.id)
			.all();
		expect(rows.results.length).toBe(0);
	});

	it('caps attached photos at LISTING_MAX_PHOTOS', async () => {
		const photos = await Promise.all([
			createTestVaultPhoto(env.DB, supporterId),
			createTestVaultPhoto(env.DB, supporterId),
			createTestVaultPhoto(env.DB, supporterId),
			createTestVaultPhoto(env.DB, supporterId)
		]);

		await expect(
			actions.post(fakeEvent(supporterId, { ...VALID_FIELDS, photoId: photos }))
		).rejects.toMatchObject({ status: 303 });

		const listing = await env.DB.prepare('SELECT id FROM listings WHERE user_id = ?')
			.bind(supporterId)
			.first<{ id: string }>();

		const rows = await env.DB.prepare('SELECT id FROM listing_photos WHERE listing_id = ?')
			.bind(listing!.id)
			.all();
		expect(rows.results.length).toBe(3);
	});
});
