export type SafetyRule = {
	id: string;
	label: string;
	intent: string;
	falsePositiveRisk: string;
	scope: 'message' | 'listing' | 'both';
	all: string[];
	none?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function terms(value: unknown, min: number): string[] | null {
	if (!Array.isArray(value) || value.length < min || value.length > 8) return null;
	if (
		!value.every((term) => typeof term === 'string' && term.trim().length >= 2 && term.length <= 80)
	)
		return null;
	const normalized = value.map((term: string) => term.trim().toLocaleLowerCase('en-US'));
	return new Set(normalized).size === normalized.length ? normalized : null;
}

export function parseSafetyRules(input: string): SafetyRule[] {
	if (input.length > 50_000) throw new Error('Rule set is too large');
	let parsed: unknown;
	try {
		parsed = JSON.parse(input);
	} catch {
		throw new Error('Rules must be valid JSON');
	}
	if (!Array.isArray(parsed) || parsed.length > 100) throw new Error('Expected up to 100 rules');
	const ids = new Set<string>();
	return parsed.map((item) => {
		if (!isRecord(item)) throw new Error('Each rule must be an object');
		const { id, label, intent, falsePositiveRisk, scope } = item;
		const all = terms(item.all, 2);
		const none = item.none === undefined ? undefined : terms(item.none, 1);
		if (
			typeof id !== 'string' ||
			!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(id) ||
			ids.has(id) ||
			typeof label !== 'string' ||
			!label.trim() ||
			label.length > 120 ||
			typeof intent !== 'string' ||
			!intent.trim() ||
			intent.length > 500 ||
			typeof falsePositiveRisk !== 'string' ||
			!falsePositiveRisk.trim() ||
			falsePositiveRisk.length > 500 ||
			!['message', 'listing', 'both'].includes(String(scope)) ||
			!all ||
			(item.none !== undefined && !none)
		)
			throw new Error('Invalid or duplicate safety rule');
		ids.add(id);
		return {
			id,
			label: label.trim(),
			intent: intent.trim(),
			falsePositiveRisk: falsePositiveRisk.trim(),
			scope: scope as SafetyRule['scope'],
			all,
			...(none && { none })
		};
	});
}

function containsTerm(text: string, term: string): boolean {
	const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
	return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(text);
}

export function matchSafetyRules(
	text: string,
	scope: 'message' | 'listing',
	rules: SafetyRule[]
): SafetyRule[] {
	const normalized = text.normalize('NFKC');
	return rules.filter(
		(rule) =>
			(rule.scope === scope || rule.scope === 'both') &&
			rule.all.every((term) => containsTerm(normalized, term)) &&
			!(rule.none ?? []).some((term) => containsTerm(normalized, term))
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
import { eq } from 'drizzle-orm';
import { safetyRuleRevisions, safetyRuleState } from './db/schema';
import { getDb } from './db';
