import { describe, expect, it } from 'vitest';
import { getInstanceDocument } from './instance-content';

describe('getInstanceDocument', () => {
	it('interpolates instance identity into the default templates', () => {
		const content = getInstanceDocument(
			{
				INSTANCE_NAME: 'Example Personals',
				INSTANCE_URL: 'https://example.test',
				INSTANCE_LEGAL_EMAIL: 'operator@example.test'
			} as Partial<Env>,
			'about'
		);

		expect(content).toContain('Example Personals');
		expect(content).toContain('operator@example.test');
		expect(content).not.toContain('{{INSTANCE_');
		expect(content).not.toContain('{{LEGAL_EMAIL}}');
	});
});
