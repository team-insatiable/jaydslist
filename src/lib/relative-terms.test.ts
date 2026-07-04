import { describe, it, expect } from 'vitest';
import { scanTerms, RELATIVE_TERMS } from './relative-terms';

describe('scanTerms', () => {
	it('returns an empty array for text with no flagged terms', () => {
		expect(scanTerms('Looking forward to meeting new people this weekend.')).toEqual([]);
	});

	it('flags a single-word term', () => {
		expect(scanTerms("I'm looking for someone cute and fun")).toEqual(['cute']);
	});

	it('flags a multi-word term', () => {
		expect(scanTerms("I'm pretty laid back about most things")).toEqual(['pretty', 'laid back']);
	});

	it('is case-insensitive', () => {
		expect(scanTerms('CUTE and Fit')).toEqual(['cute', 'fit']);
	});

	it('does not flag a term that only appears as a substring of another word', () => {
		expect(scanTerms('I casually mentioned it')).toEqual([]);
	});

	it('does flag a whole-word match adjacent to punctuation', () => {
		expect(scanTerms('Must be fit, athletic.')).toEqual(['fit', 'athletic']);
	});

	it('returns an empty array for empty input', () => {
		expect(scanTerms('')).toEqual([]);
	});

	it('flags every term in the vocabulary when all are present', () => {
		const text = RELATIVE_TERMS.join(' ');
		expect(scanTerms(text)).toEqual(RELATIVE_TERMS);
	});
});
