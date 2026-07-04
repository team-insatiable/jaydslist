export const VALID_CATEGORIES = [
	'physical',
	'distance',
	'age',
	'personality',
	'timing',
	'other'
] as const;
export type TermCategory = (typeof VALID_CATEGORIES)[number];

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

export type TermMatch = { term: string; start: number; end: number };

/**
 * Every occurrence of every vocabulary term in `text`, with character offsets.
 * The single source of truth for term-matching semantics — scanTerms and the
 * inline highlight overlay both build on this so they can never disagree.
 */
export function findTermMatches(text: string, vocabulary: string[]): TermMatch[] {
	const matches: TermMatch[] = [];
	for (const term of vocabulary) {
		const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
		let match: RegExpExecArray | null;
		while ((match = regex.exec(text)) !== null) {
			matches.push({ term, start: match.index, end: match.index + match[0].length });
		}
	}
	return matches;
}

export function scanTerms(text: string, vocabulary: string[]): string[] {
	const found = new Set(findTermMatches(text, vocabulary).map((m) => m.term));
	return vocabulary.filter((term) => found.has(term));
}

export function areAllTermsDefined(
	foundTerms: string[],
	definitions: Record<string, string>
): boolean {
	return foundTerms.every((t) => (definitions[t] ?? '').trim().length > 0);
}
