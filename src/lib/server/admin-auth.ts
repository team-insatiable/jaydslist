import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { user } from './db/auth.schema';

export async function isAdminUser(env: Env, userId: string): Promise<boolean> {
	const allowed = (env.ADMIN_EMAILS ?? '')
		.split(',')
		.map((email) => email.trim().toLowerCase())
		.filter(Boolean);
	if (allowed.length === 0) return false;
	const account = await getDb(env.DB)
		.select({ email: user.email })
		.from(user)
		.where(eq(user.id, userId))
		.get();
	return !!account && allowed.includes(account.email.toLowerCase());
}
