export type ThreadRole = 'poster' | 'responder';

export function isKeyExchangeEligible(
	role: ThreadRole,
	myMessageCount: number,
	theirMessageCount: number
): boolean {
	return role === 'poster' ? theirMessageCount > 0 : myMessageCount > 0 && theirMessageCount > 0;
}
