import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';

describe('cloudflare test pool smoke', () => {
	it('applies real drizzle migrations before tests run', async () => {
		const result = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
		const tableNames = result.results.map((r) => (r as { name: string }).name);
		expect(tableNames).toContain('user_profiles');
		expect(tableNames).toContain('listings');
		expect(tableNames).toContain('conversation_threads');
	});

	it('seeds the default relative terms vocabulary via migration', async () => {
		const result = await env.DB.prepare(
			'SELECT category, COUNT(*) as cnt FROM relative_terms_vocabulary GROUP BY category ORDER BY category'
		).all();
		expect(result.results).toEqual([
			{ category: 'age', cnt: 4 },
			{ category: 'distance', cnt: 4 },
			{ category: 'personality', cnt: 5 },
			{ category: 'physical', cnt: 13 },
			{ category: 'timing', cnt: 5 }
		]);

		const total = await env.DB.prepare(
			'SELECT COUNT(*) as cnt FROM relative_terms_vocabulary'
		).first<{
			cnt: number;
		}>();
		expect(total?.cnt).toBe(31);

		const active = await env.DB.prepare(
			'SELECT COUNT(*) as cnt FROM relative_terms_vocabulary WHERE active = 1'
		).first<{ cnt: number }>();
		expect(active?.cnt).toBe(31);
	});
});
