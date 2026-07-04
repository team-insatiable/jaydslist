import { describe, it, expect } from 'vitest';
import { isBumpCooldownActive, getNextBumpAt } from './listing-bump';

const HOUR = 60 * 60 * 1000;

describe('isBumpCooldownActive', () => {
	it('is active immediately after bumping', () => {
		const now = 1_000_000;
		expect(isBumpCooldownActive(now, 24, now)).toBe(true);
	});

	it('is active just under the cooldown window', () => {
		const now = 1_000_000;
		const lastBumped = now - 24 * HOUR + 1;
		expect(isBumpCooldownActive(lastBumped, 24, now)).toBe(true);
	});

	it('is inactive exactly at the cooldown boundary', () => {
		const now = 1_000_000;
		const lastBumped = now - 24 * HOUR;
		expect(isBumpCooldownActive(lastBumped, 24, now)).toBe(false);
	});

	it('is inactive well past the cooldown window', () => {
		const now = 1_000_000;
		const lastBumped = now - 25 * HOUR;
		expect(isBumpCooldownActive(lastBumped, 24, now)).toBe(false);
	});

	it('is inactive when the listing has never been bumped', () => {
		expect(isBumpCooldownActive(null, 24, Date.now())).toBe(false);
	});

	it('respects a shorter cooldown (e.g. supporter tier)', () => {
		const now = 1_000_000;
		const lastBumped = now - 13 * HOUR;
		expect(isBumpCooldownActive(lastBumped, 12, now)).toBe(false);
	});
});

describe('getNextBumpAt', () => {
	it('adds the cooldown window to the last bump time', () => {
		const lastBumped = new Date(1_000_000);
		expect(getNextBumpAt(lastBumped, 24).getTime()).toBe(1_000_000 + 24 * HOUR);
	});

	it('treats never-bumped as bumped at epoch', () => {
		expect(getNextBumpAt(null, 24).getTime()).toBe(24 * HOUR);
	});
});
