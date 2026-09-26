import { getInstanceConfig } from '$lib/server/instance';
import { isDbblEnabled } from '$lib/server/dbbl';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	const instance = getInstanceConfig(platform?.env);
	return {
		instanceName: instance.name,
		instanceUrl: instance.url,
		legalEmail: instance.legalEmail,
		dbblEnabled: isDbblEnabled(platform?.env ?? {})
	};
};
