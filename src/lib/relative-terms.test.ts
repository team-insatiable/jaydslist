import { describe, it, expect } from 'vitest';
import { scanTerms, findTermMatches, areAllTermsDefined, RELATIVE_TERMS } from './relative-terms';

describe('scanTerms', () => {
	it('returns an empty array for text with no flagged terms', () => {
		expect(
			scanTerms('Looking forward to meeting new people this weekend.', RELATIVE_TERMS)
		).toEqual([]);
	});

	it('flags a single-word term', () => {
		expect(scanTerms("I'm looking for someone cute and fun", RELATIVE_TERMS)).toEqual(['cute']);
	});

	it('flags a multi-word term', () => {
		expect(scanTerms("I'm pretty laid back about most things", RELATIVE_TERMS)).toEqual([
			'pretty',
			'laid back'
		]);
	});

	it('is case-insensitive', () => {
		expect(scanTerms('CUTE and Fit', RELATIVE_TERMS)).toEqual(['cute', 'fit']);
	});

	it('does not flag a term that only appears as a substring of another word', () => {
		expect(scanTerms('I casually mentioned it', RELATIVE_TERMS)).toEqual([]);
	});

	it('does flag a whole-word match adjacent to punctuation', () => {
		expect(scanTerms('Must be fit, athletic.', RELATIVE_TERMS)).toEqual(['fit', 'athletic']);
	});

	it('returns an empty array for empty input', () => {
		expect(scanTerms('', RELATIVE_TERMS)).toEqual([]);
	});

	it('flags every term in the vocabulary when all are present', () => {
		const text = RELATIVE_TERMS.join(' ');
		expect(scanTerms(text, RELATIVE_TERMS)).toEqual(RELATIVE_TERMS);
	});

	it('only scans against the passed-in vocabulary, not a hardcoded list', () => {
		expect(scanTerms('cute and fit', ['cute'])).toEqual(['cute']);
		expect(scanTerms('cute and fit', [])).toEqual([]);
	});

	it('does not repeat a term that appears multiple times in the text', () => {
		expect(scanTerms('cute, so cute, very cute', RELATIVE_TERMS)).toEqual(['cute']);
	});
});

describe('findTermMatches', () => {
	it('returns correct start/end offsets for a single match', () => {
		expect(findTermMatches('I am cute today', ['cute'])).toEqual([
			{ term: 'cute', start: 5, end: 9 }
		]);
	});

	it('returns every occurrence of a repeated term', () => {
		const matches = findTermMatches('cute, so cute', ['cute']);
		expect(matches).toEqual([
			{ term: 'cute', start: 0, end: 4 },
			{ term: 'cute', start: 9, end: 13 }
		]);
	});

	it('handles multi-word terms with correct offsets', () => {
		expect(findTermMatches("I'm pretty laid back", ['laid back'])).toEqual([
			{ term: 'laid back', start: 11, end: 20 }
		]);
	});

	it('excludes substring-only matches', () => {
		expect(findTermMatches('I casually mentioned it', ['casual'])).toEqual([]);
	});

	it('returns no matches for an empty vocabulary', () => {
		expect(findTermMatches('cute and fit', [])).toEqual([]);
	});

	it('agrees with scanTerms on which terms are found', () => {
		const text = "I'm pretty laid back, cute, and athletic — nearby is fine too";
		const fromMatches = [...new Set(findTermMatches(text, RELATIVE_TERMS).map((m) => m.term))];
		const fromScan = scanTerms(text, RELATIVE_TERMS);
		expect(new Set(fromMatches)).toEqual(new Set(fromScan));
	});
});

describe('areAllTermsDefined', () => {
	it('is true when there are no found terms', () => {
		expect(areAllTermsDefined([], {})).toBe(true);
	});

	it('is true when every found term has a non-empty definition', () => {
		expect(areAllTermsDefined(['cute', 'fit'], { cute: 'adorable', fit: 'in shape' })).toBe(true);
	});

	it('is false when a found term has no definition', () => {
		expect(areAllTermsDefined(['cute', 'fit'], { cute: 'adorable' })).toBe(false);
	});

	it('is false when a definition is only whitespace', () => {
		expect(areAllTermsDefined(['cute'], { cute: '   ' })).toBe(false);
	});

	it('ignores extra definitions for terms not currently found', () => {
		expect(areAllTermsDefined(['cute'], { cute: 'adorable', fit: 'in shape' })).toBe(true);
	});
});
