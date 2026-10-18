import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { createTestUser } from '$lib/server/test-helpers/fixtures';
import { load } from './+page.server';

describe('admin email previews', () => {
	it('renders every deployed template with sample details for an admin', async () => {
		const adminId = await createTestUser(env.DB);
		const platform = { env: { ...env, ADMIN_EMAILS: `${adminId}@test.example` } };
		const event = {
			locals: { user: { id: adminId } },
			platform,
			url: new URL('http://localhost/admin/email-previews')
		} as Parameters<typeof load>[0];
		const first = await load(event);
		if (!first || !('examples' in first)) throw new Error('Expected email examples');
		expect(first.examples).toHaveLength(7);
		for (const example of first.examples) {
			const result = await load({
				...event,
				url: new URL(`http://localhost/admin/email-previews?template=${example.id}`)
			});
			if (!result || !('preview' in result)) throw new Error(`Expected ${example.id} preview`);
			expect(result.preview.subject).toBeTruthy();
			expect(result.preview.html).toContain('<!doctype html>');
			expect(result.preview.html).not.toMatch(/{{\w+}}/);
		}
	});

	it('does not render previews for a non-admin', async () => {
		const accountId = await createTestUser(env.DB);
		await expect(
			load({
				locals: { user: { id: accountId } },
				platform: { env: { ...env, ADMIN_EMAILS: 'other@test.example' } },
				url: new URL('http://localhost/admin/email-previews')
			} as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 403 });
	});
});
