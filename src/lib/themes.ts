export type ThemeName =
	| 'default'
	| 'rouge'
	| 'violet'
	| 'jade'
	| 'amber'
	| 'rose'
	| 'teal'
	| 'slate';

type ThemeConfig = {
	label: string;
	primary: string;
	primaryHover: string;
	primaryFocus: string;
	primaryInverse: string;
};

export const THEMES: Record<ThemeName, ThemeConfig> = {
	default: {
		label: 'Default',
		primary: '#2563eb',
		primaryHover: '#1d4ed8',
		primaryFocus: 'rgba(37,99,235,0.25)',
		primaryInverse: '#fff'
	},
	rouge: {
		label: 'Rouge',
		primary: '#dc2626',
		primaryHover: '#b91c1c',
		primaryFocus: 'rgba(220,38,38,0.25)',
		primaryInverse: '#fff'
	},
	violet: {
		label: 'Violet',
		primary: '#7c3aed',
		primaryHover: '#6d28d9',
		primaryFocus: 'rgba(124,58,237,0.25)',
		primaryInverse: '#fff'
	},
	jade: {
		label: 'Jade',
		primary: '#059669',
		primaryHover: '#047857',
		primaryFocus: 'rgba(5,150,105,0.25)',
		primaryInverse: '#fff'
	},
	amber: {
		label: 'Amber',
		primary: '#d97706',
		primaryHover: '#b45309',
		primaryFocus: 'rgba(217,119,6,0.25)',
		primaryInverse: '#000'
	},
	rose: {
		label: 'Rose',
		primary: '#e11d48',
		primaryHover: '#be123c',
		primaryFocus: 'rgba(225,29,72,0.25)',
		primaryInverse: '#fff'
	},
	teal: {
		label: 'Teal',
		primary: '#0891b2',
		primaryHover: '#0e7490',
		primaryFocus: 'rgba(8,145,178,0.25)',
		primaryInverse: '#fff'
	},
	slate: {
		label: 'Slate',
		primary: '#475569',
		primaryHover: '#334155',
		primaryFocus: 'rgba(71,85,105,0.25)',
		primaryInverse: '#fff'
	}
};

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];

/** Returns inline CSS custom properties to set on a root wrapper element, or '' for the default theme. */
export function getThemeStyle(name: string): string {
	if (name === 'default') return '';
	const theme = THEMES[name as ThemeName] ?? THEMES.default;
	if (!theme) return '';
	return `--pico-primary:${theme.primary};--pico-primary-hover:${theme.primaryHover};--pico-primary-focus:${theme.primaryFocus};--pico-primary-inverse:${theme.primaryInverse}`;
}
