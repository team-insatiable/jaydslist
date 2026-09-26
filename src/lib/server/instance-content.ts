import about from '$lib/instance-content/about.md?raw';
import privacy from '$lib/instance-content/privacy.md?raw';
import rules from '$lib/instance-content/rules.md?raw';
import terms from '$lib/instance-content/terms.md?raw';
import { getInstanceConfig } from './instance';

export type InstanceDocument = 'about' | 'privacy' | 'rules' | 'terms';

const documents: Record<InstanceDocument, string> = { about, privacy, rules, terms };

/**
 * Deployment repositories may overlay these Markdown files at build time. Keep
 * legal and community content out of upstream application configuration.
 */
export function getInstanceDocument(env: Partial<Env> | undefined, document: InstanceDocument) {
	const instance = getInstanceConfig(env);
	return documents[document]
		.replaceAll('{{INSTANCE_NAME}}', instance.name)
		.replaceAll('{{INSTANCE_URL}}', instance.url)
		.replaceAll('{{LEGAL_EMAIL}}', instance.legalEmail);
}
