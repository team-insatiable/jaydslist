import { env } from 'cloudflare:test';

const migrationModules = import.meta.glob('/drizzle/*.sql', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const migrationFiles = Object.keys(migrationModules).sort();

for (const file of migrationFiles) {
	const sql = migrationModules[file];
	const statements = sql
		.split('--> statement-breakpoint')
		.map((s) => s.trim())
		.filter(Boolean);
	for (const statement of statements) {
		await env.DB.prepare(statement).run();
	}
}
