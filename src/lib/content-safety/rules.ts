export type ReviewQueue = 'urgent' | 'solicitation' | 'general' | 'system';
export type ConfiguredQueue = Exclude<ReviewQueue, 'system'>;

export type RuleDefinition = {
	id: string;
	label: string;
	intent: string;
	falsePositiveRisk: string;
	scope: 'message' | 'listing' | 'both';
	all: string[];
	any?: string[];
	none?: string[];
	withinWords?: number;
};

export type SafetySection = {
	id: string;
	label: string;
	queue: ConfiguredQueue;
	rules: RuleDefinition[];
};

export type SafetyPolicy = { schemaVersion: 2; sections: SafetySection[] };
export type SafetyRule = RuleDefinition & {
	sectionId: string;
	sectionLabel: string;
	queue: ConfiguredQueue;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function terms(value: unknown, min: number): string[] | null {
	if (!Array.isArray(value) || value.length < min || value.length > 8) return null;
	if (
		!value.every(
			(term) =>
				typeof term === 'string' &&
				term.trim().length >= 2 &&
				term.length <= 80 &&
				/[\p{L}\p{N}]/u.test(term)
		)
	)
		return null;
	const normalized = value.map((term: string) => term.trim().toLocaleLowerCase('en-US'));
	return new Set(normalized).size === normalized.length ? normalized : null;
}

function parseRule(item: unknown, ids: Set<string>): RuleDefinition {
	if (!isRecord(item)) throw new Error('Each rule must be an object');
	if (
		Object.keys(item).some(
			(key) =>
				![
					'id',
					'label',
					'intent',
					'falsePositiveRisk',
					'scope',
					'all',
					'any',
					'none',
					'withinWords'
				].includes(key)
		)
	)
		throw new Error('Unsupported safety rule field');
	const { id, label, intent, falsePositiveRisk, scope } = item;
	const any = item.any === undefined ? undefined : terms(item.any, 1);
	const all = terms(item.all, any ? 1 : 2);
	const none = item.none === undefined ? undefined : terms(item.none, 1);
	const withinWords = item.withinWords;
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
		(item.any !== undefined && !any) ||
		(!!all && !!any && any.some((term) => all.includes(term))) ||
		(item.none !== undefined && !none) ||
		(withinWords !== undefined &&
			(!Number.isInteger(withinWords) || Number(withinWords) < 2 || Number(withinWords) > 100))
	)
		throw new Error('Invalid or duplicate safety rule');
	ids.add(id);
	return {
		id,
		label: label.trim(),
		intent: intent.trim(),
		falsePositiveRisk: falsePositiveRisk.trim(),
		scope: scope as RuleDefinition['scope'],
		all,
		...(any && { any }),
		...(none && { none }),
		...(withinWords !== undefined && { withinWords: Number(withinWords) })
	};
}

/** Older flat revisions remain readable as a general safety section. */
export function parseSafetyPolicy(input: string): SafetyPolicy {
	if (input.length > 50_000) throw new Error('Rule set is too large');
	let parsed: unknown;
	try {
		parsed = JSON.parse(input);
	} catch {
		throw new Error('Rules must be valid JSON');
	}
	if (isRecord(parsed) && parsed.schemaVersion === 1) {
		if (Object.keys(parsed).some((key) => !['schemaVersion', 'rules'].includes(key)))
			throw new Error('Unsupported safety rule file format');
		parsed = parsed.rules;
	}
	const ids = new Set<string>();
	if (Array.isArray(parsed)) {
		if (parsed.length > 100) throw new Error('Expected up to 100 rules');
		return {
			schemaVersion: 2,
			sections: [
				{
					id: 'general_safety',
					label: 'General safety',
					queue: 'general',
					rules: parsed.map((item) => parseRule(item, ids))
				}
			]
		};
	}
	if (
		!isRecord(parsed) ||
		parsed.schemaVersion !== 2 ||
		Object.keys(parsed).some((key) => !['schemaVersion', 'sections'].includes(key)) ||
		!Array.isArray(parsed.sections) ||
		parsed.sections.length > 20
	)
		throw new Error('Unsupported safety rule file format');
	const sectionIds = new Set<string>();
	const sections = parsed.sections.map((section): SafetySection => {
		if (
			!isRecord(section) ||
			Object.keys(section).some((key) => !['id', 'label', 'queue', 'rules'].includes(key)) ||
			typeof section.id !== 'string' ||
			!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(section.id) ||
			sectionIds.has(section.id) ||
			typeof section.label !== 'string' ||
			!section.label.trim() ||
			section.label.length > 120 ||
			!['urgent', 'solicitation', 'general'].includes(String(section.queue)) ||
			!Array.isArray(section.rules)
		)
			throw new Error('Invalid or duplicate safety section');
		sectionIds.add(section.id);
		return {
			id: section.id,
			label: section.label.trim(),
			queue: section.queue as ConfiguredQueue,
			rules: section.rules.map((item) => parseRule(item, ids))
		};
	});
	if (ids.size > 100) throw new Error('Expected up to 100 rules');
	return { schemaVersion: 2, sections };
}

export function parseSafetyRules(input: string): SafetyRule[] {
	return parseSafetyPolicy(input).sections.flatMap((section) =>
		section.rules.map((rule) => ({
			...rule,
			sectionId: section.id,
			sectionLabel: section.label,
			queue: section.queue
		}))
	);
}
