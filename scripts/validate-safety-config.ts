import { readFileSync } from 'node:fs';
import { parseSafetyRules } from '../src/lib/server/safety-rules';

const file = new URL('../src/lib/instance-content/safety-rules.json', import.meta.url);
const rules = parseSafetyRules(readFileSync(file, 'utf8'));
console.log(`Validated instance safety rule file (${rules.length} rules).`);
