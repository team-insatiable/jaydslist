import { describe, expect, it } from 'vitest';
import { matchSafetyRules, parseSafetyPolicy, parseSafetyRules } from './rules';
import { routeMatches } from './routing';

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
		expect(parseSafetyRules(JSON.stringify({ schemaVersion: 1, rules: [rule] }))).toEqual([
			{ ...rule, sectionId: 'general_safety', sectionLabel: 'General safety', queue: 'general' }
		]);
		expect(() => parseSafetyRules(JSON.stringify({ schemaVersion: 2, rules: [rule] }))).toThrow(
			'Unsupported safety rule file format'
		);
		expect(() =>
			parseSafetyRules(JSON.stringify({ schemaVersion: 1, rules: [{ ...rule, typo: true }] }))
		).toThrow('Unsupported safety rule field');
	});

	it('routes versioned sections to one highest-priority case', () => {
		const policy = {
			schemaVersion: 2,
			sections: [
				{
					id: 'solicitation',
					label: 'Commercial sex solicitation',
					queue: 'solicitation',
					rules: [
						{
							id: 'coded_exchange',
							label: 'Coded exchange',
							intent: 'Review a possible offer',
							falsePositiveRisk: 'Flowers may be meant literally',
							scope: 'both',
							all: ['roses'],
							any: ['rate', 'tokens'],
							withinWords: 8
						}
					]
				},
				{
					id: 'exploitation',
					label: 'Trafficking and exploitation',
					queue: 'urgent',
					rules: [
						{
							id: 'coercion',
							label: 'Coercion',
							intent: 'Review coercion',
							falsePositiveRisk: 'Could be a disclosure',
							scope: 'both',
							all: ['forced', 'payment']
						}
					]
				}
			]
		};
		const rules = parseSafetyRules(JSON.stringify(policy));
		expect(parseSafetyPolicy(JSON.stringify(policy)).sections).toHaveLength(2);
		expect(matchSafetyRules('I brought roses to our picnic', 'listing', rules)).toEqual([]);
		expect(
			matchSafetyRules('Offering roses at this rate', 'listing', rules).map((rule) => rule.id)
		).toEqual(['coded_exchange']);
		expect(
			matchSafetyRules(
				"Roses arrived. We talked for a long time about hiking trails and tomorrow's weather. The insurance rate changed.",
				'listing',
				rules
			)
		).toEqual([]);
		expect(routeMatches(matchSafetyRules('Forced payment; roses rate', 'message', rules))).toEqual({
			queue: 'urgent',
			sections: ['solicitation', 'exploitation']
		});
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
