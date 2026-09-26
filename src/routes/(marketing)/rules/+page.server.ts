import { getInstanceConfig } from '$lib/server/instance';
import { getInstanceDocument } from '$lib/server/instance-content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	const instance = getInstanceConfig(platform?.env);
	return {
		title: `Community Rules — ${instance.name}`,
		content: getInstanceDocument(platform?.env, 'rules')
	};
};
