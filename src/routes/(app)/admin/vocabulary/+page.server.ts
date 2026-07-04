import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { relativeTermsVocabulary } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { VALID_CATEGORIES } from '$lib/relative-terms';

export const load: PageServerLoad = async ({ platform }) => {
	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	const db = getDb(env.DB);
	const terms = await db
		.select()
		.from(relativeTermsVocabulary)
		.orderBy(asc(relativeTermsVocabulary.category), asc(relativeTermsVocabulary.term))
		.all();

	return { terms };
};

export const actions: Actions = {
	create: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const term = (data.get('term') as string)?.trim().toLowerCase();
		const category = data.get('category') as string;

		if (!term) return fail(400, { error: 'Term is required' });
		if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
			return fail(400, { error: 'Invalid category' });
		}

		const db = getDb(env.DB);
		try {
			await db.insert(relativeTermsVocabulary).values({
				id: crypto.randomUUID(),
				term,
				category
			});
		} catch {
			return fail(400, { error: 'That term already exists' });
		}

		return { success: true };
	},

	toggle: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const id = data.get('id') as string;

		const db = getDb(env.DB);
		const row = await db
			.select({ active: relativeTermsVocabulary.active })
			.from(relativeTermsVocabulary)
			.where(eq(relativeTermsVocabulary.id, id))
			.get();
		if (!row) return fail(404, { error: 'Term not found' });

		await db
			.update(relativeTermsVocabulary)
			.set({ active: !row.active })
			.where(eq(relativeTermsVocabulary.id, id));

		return { success: true };
	},

	delete: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const id = data.get('id') as string;

		await getDb(env.DB).delete(relativeTermsVocabulary).where(eq(relativeTermsVocabulary.id, id));

		return { success: true };
	}
};
