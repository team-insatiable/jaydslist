import { getInstanceConfig } from '$lib/server/instance';
import { isDbblEnabled } from '$lib/server/dbbl';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	return {
		instanceName: getInstanceConfig(platform?.env).name,
		dbblEnabled: isDbblEnabled(platform?.env ?? {})
	};
};
