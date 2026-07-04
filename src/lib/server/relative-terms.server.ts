import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { relativeTermsVocabulary } from '$lib/server/db/schema';
import { RELATIVE_TERMS } from '$lib/relative-terms';

/**
 * The active scannable vocabulary, read from the DB so admins can customize
 * it per-instance. Falls back to the hardcoded default list if the table is
 * empty (e.g. a fresh DB before the seed migration lands, or an operator who
 * deactivated everything).
 */
export async function getActiveVocabulary(db: D1Database): Promise<string[]> {
	const rows = await getDb(db)
		.select({ term: relativeTermsVocabulary.term })
		.from(relativeTermsVocabulary)
		.where(eq(relativeTermsVocabulary.active, true))
		.all();

	if (rows.length === 0) return RELATIVE_TERMS;
	return rows.map((r) => r.term);
}
