import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isAdminUser } from '$lib/server/admin-auth';
import { renderInstanceEmail, type EmailTemplateName } from '$lib/server/email-templates';

const examples: {
	id: EmailTemplateName;
	label: string;
	description: string;
	fields: Record<string, string>;
}[] = [
	{
		id: 'passwordReset',
		label: 'Password reset',
		description: 'Sent when an account holder requests a password reset.',
		fields: { resetUrl: 'https://example.invalid/reset-password?token=sample' }
	},
	{
		id: 'betaConfirm',
		label: 'Beta signup confirmation',
		description: 'Sent to confirm an address on the beta list.',
		fields: { confirmUrl: 'https://example.invalid/beta/confirm?token=sample' }
	},
	{
		id: 'betaWelcome',
		label: 'Beta welcome',
		description: 'Sent after a beta signup is confirmed.',
		fields: {}
	},
	{
		id: 'newMessage',
		label: 'New message',
		description: 'Sent when a cleared message becomes available.',
		fields: {
			fromAlias: 'River',
			listingSubject: 'Coffee and conversation',
			preview: 'Hi! I would like to learn more about your listing.',
			threadUrl: 'https://example.invalid/inbox/sample-thread'
		}
	},
	{
		id: 'listingSuspended',
		label: 'Listing suspended',
		description: 'Sent when a moderator suspends a listing.',
		fields: {
			listingSubject: 'Coffee and conversation',
			reason: 'Please update the listing to follow the community rules.'
		}
	},
	{
		id: 'accountWarning',
		label: 'Account warning',
		description: 'Sent when a moderator warns an account holder.',
		fields: { reason: 'Please review the community rules before posting again.' }
	},
	{
		id: 'abuseAlert',
		label: 'Abuse alert',
		description: 'Sent to an operator after an automatic account suspension.',
		fields: {
			alias: 'Example member',
			userId: 'sample-user-id',
			reason: 'Repeated reports crossed the configured threshold.',
			count: '3',
			threadUrl: 'https://example.invalid/inbox/sample-thread',
			adminUrl: 'https://example.invalid/admin'
		}
	}
];

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const env = platform?.env;
	if (!env || !(await isAdminUser(env, locals.user.id))) throw error(403, 'Forbidden');
	const requested = url.searchParams.get('template');
	const selected = examples.find((example) => example.id === requested) ?? examples[0];
	return {
		examples: examples.map(({ id, label }) => ({ id, label })),
		selected: { id: selected.id, label: selected.label, description: selected.description },
		preview: renderInstanceEmail(env, selected.id, selected.fields)
	};
};
