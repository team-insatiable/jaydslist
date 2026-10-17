import { describe, expect, it } from 'vitest';
import { matchSafetyRules, parseSafetyRules } from './safety-rules';

const rules = parseSafetyRules(
	JSON.stringify([
		{
			id: 'coercive_offer',
			label: 'Coercive offer',
			intent: 'Flag coercion with payment language',
			falsePositiveRisk: 'Could match discussion of news or fiction',
			scope: 'both',
			all: ['forced', 'payment']
		},
		{
			id: 'context_example',
			label: 'Context example',
			intent: 'Flag offer and transport context',
			falsePositiveRisk: 'Could match harmless travel planning',
			scope: 'message',
			all: ['offer', 'transport'],
			none: ['fiction']
		}
	])
);

describe('versioned safety rule syntax', () => {
	it('accepts an operator file and rejects unknown file or rule fields', () => {
		const rule = {
			id: 'review_1',
			label: 'Review combination',
			intent: 'Surface a concern for review',
			falsePositiveRisk: 'Could match harmless discussion',
			scope: 'both',
			all: ['first', 'second']
		};
		expect(parseSafetyRules(JSON.stringify({ schemaVersion: 1, rules: [rule] }))).toEqual([rule]);
		expect(() => parseSafetyRules(JSON.stringify({ schemaVersion: 2, rules: [rule] }))).toThrow(
			'Unsupported safety rule file format'
		);
		expect(() =>
			parseSafetyRules(JSON.stringify({ schemaVersion: 1, rules: [{ ...rule, typo: true }] }))
		).toThrow('Unsupported safety rule field');
	});

	it('matches combinations in scope without partial-word matches', () => {
		expect(matchSafetyRules('Forced payment', 'listing', rules).map((r) => r.id)).toEqual([
			'coercive_offer'
		]);
		expect(matchSafetyRules('unforced payment', 'message', rules)).toEqual([]);
		expect(matchSafetyRules('Offer transport in fiction', 'message', rules)).toEqual([]);
		expect(matchSafetyRules('Offer transport', 'listing', rules)).toEqual([]);
	});

	it('rejects duplicate IDs, weak single-term rules, and malformed exclusions', () => {
		const base = { intent: 'Detect context', falsePositiveRisk: 'May match harmless context' };
		expect(() =>
			parseSafetyRules(
				JSON.stringify([{ ...base, id: 'x1', label: 'X', scope: 'both', all: ['one'] }])
			)
		).toThrow();
		expect(() =>
			parseSafetyRules(
				JSON.stringify([
					{ ...base, id: 'x1', label: 'X', scope: 'both', all: ['one', 'two'] },
					{ ...base, id: 'x1', label: 'Y', scope: 'both', all: ['three', 'four'] }
				])
			)
		).toThrow();
		expect(() =>
			parseSafetyRules(
				JSON.stringify([
					{ ...base, id: 'x1', label: 'X', scope: 'both', all: ['one', 'two'], none: [] }
				])
			)
		).toThrow();
	});
});
