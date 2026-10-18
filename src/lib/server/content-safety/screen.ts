import { getDb } from '../db';
import { getActiveSafetyRules, matchSafetyRules } from './rules';
import type { ReviewQueue } from './rules';
import { routeMatches } from './routing';

export type ScreeningResult = {
	outcome: 'cleared' | 'held';
	revisionId: string | null;
	matchedRuleIds: string[];
	matchedSections: string[];
	queue: ReviewQueue | null;
	reason: 'no_match' | 'rule_match' | 'scanner_unavailable';
};

/** Every submission is screened before it can be delivered or published. */
export async function screenContent(
	db: ReturnType<typeof getDb>,
	text: string,
	scope: 'message' | 'listing'
): Promise<ScreeningResult> {
	try {
		const active = await getActiveSafetyRules(db);
		if (!active) {
			return {
				outcome: 'held',
				revisionId: null,
				matchedRuleIds: [],
				matchedSections: [],
				queue: 'system',
				reason: 'scanner_unavailable'
			};
		}
		const matches = matchSafetyRules(text, scope, active.rules);
		const matchedRuleIds = matches.map((rule) => rule.id);
		const route = routeMatches(matches);
		return {
			outcome: matchedRuleIds.length ? 'held' : 'cleared',
			revisionId: active.revisionId,
			matchedRuleIds,
			matchedSections: route.sections,
			queue: route.queue,
			reason: matchedRuleIds.length ? 'rule_match' : 'no_match'
		};
	} catch (cause) {
		console.error(
			'Safety screening unavailable:',
			cause instanceof Error ? cause.message : 'unknown'
		);
		return {
			outcome: 'held',
			revisionId: null,
			matchedRuleIds: [],
			matchedSections: [],
			queue: 'system',
			reason: 'scanner_unavailable'
		};
	}
}

export function screeningRecords(
	result: ScreeningResult,
	targetType: 'message' | 'listing',
	targetId: string,
	submitterId: string,
	evidence: object,
	releaseStatus?: string
) {
	return {
		scan: {
			id: crypto.randomUUID(),
			targetType,
			targetId,
			ruleRevisionId: result.revisionId,
			outcome: result.outcome,
			matchedRuleIds: JSON.stringify(result.matchedRuleIds),
			matchedSections: JSON.stringify(result.matchedSections),
			queue: result.queue,
			reason: result.reason
		},
		case:
			result.outcome === 'held'
				? {
						id: crypto.randomUUID(),
						targetType,
						targetId,
						submitterId,
						ruleRevisionId: result.revisionId,
						matchedRuleIds: JSON.stringify(result.matchedRuleIds),
						matchedSections: JSON.stringify(result.matchedSections),
						queue: result.queue ?? 'general',
						reason: result.reason,
						evidenceSnapshot: JSON.stringify(evidence),
						releaseStatus: releaseStatus ?? null
					}
				: null
	};
}
