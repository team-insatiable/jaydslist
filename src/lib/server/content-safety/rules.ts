import { eq } from 'drizzle-orm';
import { safetyRuleRevisions, safetyRuleState } from '../db/schema';
import { getDb } from '../db';
import { parseSafetyRules, type SafetyRule } from '$lib/content-safety/rules';

export { parseSafetyPolicy, parseSafetyRules } from '$lib/content-safety/rules';
export type {
	ReviewQueue,
	ConfiguredQueue,
	RuleDefinition,
	SafetySection,
	SafetyPolicy,
	SafetyRule
} from '$lib/content-safety/rules';

type Hit = { start: number; end: number };

function tokenize(text: string): string[] {
	return (
		text
			.normalize('NFKC')
			.toLocaleLowerCase('en-US')
			.match(/[\p{L}\p{N}]+/gu) ?? []
	);
}

function termHits(tokens: string[], term: string): Hit[] {
	const words = tokenize(term);
	if (words.length === 0) return [];
	const hits: Hit[] = [];
	for (let index = 0; index <= tokens.length - words.length; index++) {
		if (words.every((word, offset) => tokens[index + offset] === word))
			hits.push({ start: index, end: index + words.length });
	}
	return hits;
}

function matchesRule(rule: SafetyRule, hits: (term: string) => Hit[]): boolean {
	if ((rule.none ?? []).some((term) => hits(term).length > 0)) return false;
	const groups = rule.all.map((term) => hits(term));
	if (rule.any) groups.push(rule.any.flatMap((term) => hits(term)));
	if (groups.some((group) => group.length === 0)) return false;
	if (!rule.withinWords) return true;
	return groups
		.flat()
		.some(({ start }) =>
			groups.every((group) =>
				group.some((hit) => hit.start >= start && hit.end - start <= rule.withinWords!)
			)
		);
}

export function matchSafetyRules(
	text: string,
	scope: 'message' | 'listing',
	rules: SafetyRule[]
): SafetyRule[] {
	const tokens = tokenize(text);
	const cache = new Map<string, Hit[]>();
	const hits = (term: string): Hit[] => {
		let found = cache.get(term);
		if (!found) {
			found = termHits(tokens, term);
			cache.set(term, found);
		}
		return found;
	};
	return rules.filter(
		(rule) => (rule.scope === scope || rule.scope === 'both') && matchesRule(rule, hits)
	);
}

export async function getActiveSafetyRules(db: ReturnType<typeof getDb>): Promise<{
	revisionId: string;
	rules: SafetyRule[];
} | null> {
	const state = await db
		.select()
		.from(safetyRuleState)
		.where(eq(safetyRuleState.id, 'active'))
		.get();
	if (!state) return null;
	const revision = await db
		.select()
		.from(safetyRuleRevisions)
		.where(eq(safetyRuleRevisions.id, state.revisionId))
		.get();
	if (!revision) throw new Error('Active safety rule revision is missing');
	return { revisionId: revision.id, rules: parseSafetyRules(revision.rulesJson) };
}
