import { getDb } from '$lib/server/db';
import { userProfiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function isProfileComplete(userId: string, db: D1Database): Promise<boolean> {
	const profile = await getDb(db)
		.select({ identity: userProfiles.identity, physicalType: userProfiles.physicalType, age: userProfiles.age })
		.from(userProfiles)
		.where(eq(userProfiles.id, userId))
		.get();

	return !!(profile?.identity && profile?.physicalType && profile?.age);
}
