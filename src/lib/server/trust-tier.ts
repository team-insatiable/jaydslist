export type TrustTier = 'new' | 'established' | 'trusted';

export function nextTrustTier(opts: {
	currentTier: TrustTier;
	accountAgeDays: number;
	responseRate: number;
	establishedDays: number;
	trustedDays: number;
}): TrustTier | null {
	const { currentTier, accountAgeDays, responseRate, establishedDays, trustedDays } = opts;

	if (currentTier === 'new' && accountAgeDays >= establishedDays) {
		return 'established';
	}
	if (currentTier === 'established' && accountAgeDays >= trustedDays && responseRate >= 0.5) {
		return 'trusted';
	}
	return null;
}
