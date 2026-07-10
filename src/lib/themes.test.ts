import { describe, it, expect } from 'vitest';
import { getThemeStyle, THEMES, THEME_NAMES } from './themes';

describe('getThemeStyle', () => {
	it('returns empty string for the default theme', () => {
		expect(getThemeStyle('default')).toBe('');
	});

	it('returns empty string for an unknown theme name', () => {
		expect(getThemeStyle('nonexistent')).toBe('');
		expect(getThemeStyle('')).toBe('');
	});

	it('returns all four CSS custom properties for each non-default theme', () => {
		for (const name of THEME_NAMES) {
			if (name === 'default') continue;
			const css = getThemeStyle(name);
			expect(css).toContain('--pico-primary:');
			expect(css).toContain('--pico-primary-hover:');
			expect(css).toContain('--pico-primary-focus:');
			expect(css).toContain('--pico-primary-inverse:');
		}
	});

	it('inlines the correct primary color for rouge', () => {
		expect(getThemeStyle('rouge')).toContain(THEMES.rouge.primary);
	});

	it('each theme has a unique primary color', () => {
		const primaries = Object.values(THEMES).map((t) => t.primary);
		expect(new Set(primaries).size).toBe(primaries.length);
	});
});
