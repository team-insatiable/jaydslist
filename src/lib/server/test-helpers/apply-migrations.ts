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

// Integration suites model a configured operator with an active empty rule set.
// Tests for missing configuration can delete the state row explicitly.
await env.DB.prepare(
	"INSERT OR IGNORE INTO user (id, name, email) VALUES ('test-safety-operator', 'Test Safety Operator', 'safety-operator@test.example')"
).run();
await env.DB.prepare(
	"INSERT OR IGNORE INTO user_profiles (id, alias) VALUES ('test-safety-operator', 'Test Safety Operator')"
).run();
await env.DB.prepare(
	"INSERT OR IGNORE INTO safety_rule_revisions (id, version, rules_json, reason, created_by) VALUES ('test-empty-rules', 0, '[]', 'Integration test default', 'test-safety-operator')"
).run();
await env.DB.prepare(
	"INSERT OR IGNORE INTO safety_rule_state (id, revision_id, updated_by) VALUES ('active', 'test-empty-rules', 'test-safety-operator')"
).run();
