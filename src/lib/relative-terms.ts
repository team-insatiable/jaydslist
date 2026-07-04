export const RELATIVE_TERMS = [
	'cute',
	'pretty',
	'attractive',
	'hot',
	'fit',
	'athletic',
	'slim',
	'thick',
	'large',
	'small',
	'tall',
	'short',
	'average',
	'nearby',
	'close',
	'local',
	'far',
	'young',
	'older',
	'mature',
	'younger',
	'serious',
	'casual',
	'laid back',
	'intense',
	'outgoing',
	'soon',
	'later',
	'regular',
	'occasional',
	'often'
];

export function scanTerms(text: string): string[] {
	return RELATIVE_TERMS.filter((term) => {
		const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
	});
}
