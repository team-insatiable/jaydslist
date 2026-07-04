import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { actions } from './+page.server';

type ActionEvent = Parameters<typeof actions.create>[0];

function fakeEvent(fields: Record<string, string>): ActionEvent {
	const form = new FormData();
	for (const [key, value] of Object.entries(fields)) form.set(key, value);
	return {
		request: new Request('http://localhost/admin/vocabulary', { method: 'POST', body: form }),
		locals: { user: { id: 'admin-user', email: 'admin@example.com' } },
		platform: { env }
	} as unknown as ActionEvent;
}

describe('admin vocabulary actions', () => {
	it('creates a new term', async () => {
		const result = await actions.create(fakeEvent({ term: 'Zippy', category: 'personality' }));
		expect(result).toEqual({ success: true });

		const row = await env.DB.prepare(
			'SELECT term, category, active FROM relative_terms_vocabulary WHERE term = ?'
		)
			.bind('zippy')
			.first();
		expect(row).toMatchObject({ term: 'zippy', category: 'personality', active: 1 });
	});

	it('rejects a duplicate term', async () => {
		await actions.create(fakeEvent({ term: 'duplicate-test', category: 'other' }));
		const result = await actions.create(fakeEvent({ term: 'duplicate-test', category: 'other' }));
		expect(result?.status).toBe(400);
		expect(result?.data?.error).toMatch(/already exists/i);
	});

	it('rejects an invalid category', async () => {
		const result = await actions.create(
			fakeEvent({ term: 'whatever', category: 'not-a-real-category' })
		);
		expect(result?.status).toBe(400);
	});

	it('toggles a term active/inactive', async () => {
		await actions.create(fakeEvent({ term: 'toggle-test', category: 'other' }));
		const row = await env.DB.prepare('SELECT id FROM relative_terms_vocabulary WHERE term = ?')
			.bind('toggle-test')
			.first<{ id: string }>();

		await actions.toggle(fakeEvent({ id: row!.id }));
		let updated = await env.DB.prepare('SELECT active FROM relative_terms_vocabulary WHERE id = ?')
			.bind(row!.id)
			.first<{ active: number }>();
		expect(updated!.active).toBe(0);

		await actions.toggle(fakeEvent({ id: row!.id }));
		updated = await env.DB.prepare('SELECT active FROM relative_terms_vocabulary WHERE id = ?')
			.bind(row!.id)
			.first<{ active: number }>();
		expect(updated!.active).toBe(1);
	});

	it('deletes a term', async () => {
		await actions.create(fakeEvent({ term: 'delete-test', category: 'other' }));
		const row = await env.DB.prepare('SELECT id FROM relative_terms_vocabulary WHERE term = ?')
			.bind('delete-test')
			.first<{ id: string }>();

		await actions.delete(fakeEvent({ id: row!.id }));
		const gone = await env.DB.prepare('SELECT id FROM relative_terms_vocabulary WHERE id = ?')
			.bind(row!.id)
			.first();
		expect(gone).toBeNull();
	});
});
