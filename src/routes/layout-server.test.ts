import { describe, expect, it } from 'vitest';
import { load } from './+layout.server';

describe('shared layout prelaunch mode', () => {
	it('exposes the operator identity on every route', async () => {
		const result = await load({
			locals: {},
			platform: {
				env: { INSTANCE_NAME: '  Local Connections  ', INSTANCE_TAGLINE: 'Your community' }
			}
		} as Parameters<typeof load>[0]);
		expect(result).toMatchObject({
			instanceName: 'Local Connections',
			instanceTagline: 'Your community'
		});
	});

	it('keeps defaults usable without operator configuration', async () => {
		const result = await load({ locals: {} } as Parameters<typeof load>[0]);
		expect(result).toMatchObject({ instanceName: 'Jaydslist', prelaunchMode: false });
	});
	for (const [flag, expected] of [
		['true', true],
		['false', false],
		[undefined, false]
	] as const) {
		it(`exposes ${String(flag)} as ${expected}`, async () => {
			const result = await load({
				locals: {},
				platform: { env: { INSTANCE_PRELAUNCH_MODE: flag } }
			} as Parameters<typeof load>[0]);
			expect(result).toMatchObject({ prelaunchMode: expected, user: null });
		});
	}
});
