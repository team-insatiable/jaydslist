import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('brand assets', () => {
	it('keeps downloadable and favicon artwork aligned with the shared app mark', () => {
		const mark = readFileSync(new URL('./assets/logo.svg', import.meta.url), 'utf8').trim();
		for (const asset of ['logo.svg', 'favicon.svg']) {
			expect(readFileSync(new URL(`../../static/${asset}`, import.meta.url), 'utf8').trim()).toBe(
				mark
			);
		}
	});
});
