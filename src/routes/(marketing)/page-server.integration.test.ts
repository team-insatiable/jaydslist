import { describe, it, expect } from 'vitest';
import { load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];

function fakeEvent(user: { id: string; email: string } | undefined): LoadEvent {
	return { locals: { user } } as unknown as LoadEvent;
}

describe('marketing page load', () => {
	it('redirects a logged-in visitor to /browse', async () => {
		await expect(
			load(fakeEvent({ id: 'user-1', email: 'test@example.com' }))
		).rejects.toMatchObject({ status: 302, location: '/browse' });
	});

	it('returns instance data for a logged-out visitor instead of redirecting', async () => {
		const result = await load(fakeEvent(undefined));
		expect(result).toEqual({
			instanceName: 'Jaydslist',
			instanceTagline: 'Real connections, real people'
		});
	});
});
