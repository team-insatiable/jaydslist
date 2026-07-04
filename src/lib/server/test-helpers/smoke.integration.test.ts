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
});
