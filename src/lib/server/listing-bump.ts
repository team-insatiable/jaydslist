export function isBumpCooldownActive(
	lastBumpedAt: Date | string | number | null,
	cooldownHours: number,
	now: number = Date.now()
): boolean {
	const lastBumped = lastBumpedAt ? new Date(lastBumpedAt).getTime() : 0;
	return now - lastBumped < cooldownHours * 60 * 60 * 1000;
}

export function getNextBumpAt(
	lastBumpedAt: Date | string | number | null,
	cooldownHours: number
): Date {
	const lastBumped = lastBumpedAt ? new Date(lastBumpedAt).getTime() : 0;
	return new Date(lastBumped + cooldownHours * 60 * 60 * 1000);
}
