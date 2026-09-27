import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { load, actions } from './+page.server';
import { createTestUser, createTestListing } from '$lib/server/test-helpers/fixtures';
import { getDb } from '$lib/server/db';
import { userProfiles, listings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

type LoadEvent = Parameters<typeof load>[0];
type ActionEvent = Parameters<typeof actions.savePreference>[0];
function loadEvent(userId?: string, search = ''): LoadEvent {
	return {
		locals: userId ? { user: { id: userId } } : {},
		platform: { env },
		url: new URL(`http://localhost/browse${search}`)
	} as unknown as LoadEvent;
}
function actionEvent(userId: string | undefined, key: string, value: string): ActionEvent {
	return {
		...loadEvent(userId),
		request: new Request('http://localhost/browse?/savePreference', {
			method: 'POST',
			body: new URLSearchParams({ key, value })
		})
	} as unknown as ActionEvent;
}
async function browseUser() {
	return createTestUser(env.DB, { identity: 'man', lat: 38.58, lng: -121.49 });
}

describe('remembered browse preferences', () => {
	it('restores saved filters and view on a new login without URL parameters', async () => {
		const userId = await browseUser();
		for (const [key, value] of [
			['radius', '50'],
			['nature', 'dating'],
			['view', 'list']
		]) {
			expect(await actions.savePreference(actionEvent(userId, key, value))).toEqual({
				saved: true
			});
		}
		expect(await load(loadEvent(userId))).toMatchObject({
			radius: 50,
			natureFilter: 'dating',
			viewMode: 'list'
		});
	});
	it('remembers switching back to all connections', async () => {
		const userId = await browseUser();
		await actions.savePreference(actionEvent(userId, 'nature', 'dating'));
		await actions.savePreference(actionEvent(userId, 'nature', 'all'));
		expect(await load(loadEvent(userId))).toMatchObject({ natureFilter: null });
	});
	it('keeps preferences isolated between accounts', async () => {
		const first = await browseUser();
		const second = await browseUser();
		await actions.savePreference(actionEvent(first, 'radius', '100'));
		await actions.savePreference(actionEvent(first, 'nature', 'fwb'));
		await actions.savePreference(actionEvent(first, 'view', 'list'));
		expect(await load(loadEvent(second))).toMatchObject({
			radius: 25,
			natureFilter: null,
			viewMode: 'card'
		});
	});
	it('permits temporary URL overrides without changing saved defaults', async () => {
		const userId = await browseUser();
		await actions.savePreference(actionEvent(userId, 'radius', '50'));
		await actions.savePreference(actionEvent(userId, 'nature', 'dating'));
		expect(await load(loadEvent(userId, '?radius=5&nature=platonic'))).toMatchObject({
			radius: 5,
			natureFilter: 'platonic'
		});
		expect(await load(loadEvent(userId, '?nature=all'))).toMatchObject({ natureFilter: null });
		expect(await load(loadEvent(userId))).toMatchObject({ radius: 50, natureFilter: 'dating' });
	});
	it('ignores malformed URL values and stored preferences', async () => {
		const userId = await browseUser();
		await actions.savePreference(actionEvent(userId, 'radius', '50'));
		await actions.savePreference(actionEvent(userId, 'nature', 'dating'));
		expect(await load(loadEvent(userId, '?radius=5junk&nature=invalid'))).toMatchObject({
			radius: 50,
			natureFilter: 'dating'
		});
		await env.PHONE_VERIFICATION_KV.put(`browse:nature:${userId}`, 'invalid');
		await env.PHONE_VERIFICATION_KV.put(`browse:view:${userId}`, 'invalid');
		expect(await load(loadEvent(userId))).toMatchObject({ natureFilter: null, viewMode: 'card' });
	});
	it('rejects unsupported values without overwriting saved settings', async () => {
		const userId = await browseUser();
		for (const [key, value] of [
			['radius', '50x'],
			['radius', '500'],
			['nature', 'invalid'],
			['view', 'invalid'],
			['userId', 'someone-else']
		]) {
			expect(await actions.savePreference(actionEvent(userId, key, value))).toMatchObject({
				status: 400
			});
		}
		expect(await load(loadEvent(userId))).toMatchObject({
			radius: 25,
			natureFilter: null,
			viewMode: 'card'
		});
	});
	it('requires authentication for reads and writes', async () => {
		await expect(load(loadEvent())).rejects.toMatchObject({ status: 302 });
		await expect(
			actions.savePreference(actionEvent(undefined, 'nature', 'dating'))
		).rejects.toMatchObject({ status: 303 });
	});
	it('does not overwrite the profile’s multi-select preferences', async () => {
		const userId = await browseUser();
		await getDb(env.DB)
			.update(userProfiles)
			.set({ seekingNatureOfConnection: '["dating","fwb"]' })
			.where(eq(userProfiles.id, userId));
		await actions.savePreference(actionEvent(userId, 'nature', 'fwb'));
		const profile = await getDb(env.DB)
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.id, userId))
			.get();
		expect(profile?.seekingNatureOfConnection).toBe('["dating","fwb"]');
	});
	it('applies the remembered connection filter to returned listings', async () => {
		const userId = await browseUser();
		const poster = await createTestUser(env.DB, { identity: 'woman' });
		const dating = await createTestListing(env.DB, poster);
		const platonic = await createTestListing(env.DB, poster);
		await getDb(env.DB)
			.update(listings)
			.set({ lat: 38.58, lng: -121.49, natureOfConnection: '["dating"]' })
			.where(eq(listings.id, dating));
		await getDb(env.DB)
			.update(listings)
			.set({ lat: 38.58, lng: -121.49, natureOfConnection: '["platonic"]' })
			.where(eq(listings.id, platonic));
		await actions.savePreference(actionEvent(userId, 'nature', 'dating'));
		expect((await load(loadEvent(userId))).listings.map((l) => l.id)).toEqual([dating]);
	});
});
