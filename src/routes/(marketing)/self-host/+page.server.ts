import { getInstanceConfig } from '$lib/server/instance';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => ({
	instanceName: getInstanceConfig(platform?.env).name,
	sourceUrl: getInstanceConfig(platform?.env).sourceUrl
});
