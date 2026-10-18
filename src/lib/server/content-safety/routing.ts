import type { ReviewQueue, SafetyRule } from './rules';

const queueOrder: ReviewQueue[] = ['urgent', 'solicitation', 'general', 'system'];

/** One held submission gets one case, even when several sections match. */
export function routeMatches(matches: SafetyRule[]): {
	queue: ReviewQueue | null;
	sections: string[];
} {
	if (matches.length === 0) return { queue: null, sections: [] };
	const sections = [...new Set(matches.map((rule) => rule.sectionId))];
	const queue = queueOrder.find((candidate) => matches.some((rule) => rule.queue === candidate));
	return { queue: queue ?? 'general', sections };
}
