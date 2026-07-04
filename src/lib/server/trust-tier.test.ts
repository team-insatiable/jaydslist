import { describe, it, expect } from 'vitest';
import { nextTrustTier } from './trust-tier';

const BASE = { establishedDays: 14, trustedDays: 60 };

describe('nextTrustTier', () => {
	it('promotes new -> established once age meets the threshold', () => {
		expect(
			nextTrustTier({ currentTier: 'new', accountAgeDays: 14, responseRate: 0, ...BASE })
		).toBe('established');
	});

	it('does not promote new -> established before the threshold', () => {
		expect(
			nextTrustTier({ currentTier: 'new', accountAgeDays: 13.9, responseRate: 1, ...BASE })
		).toBeNull();
	});

	it('promotes established -> trusted once age and response rate both qualify', () => {
		expect(
			nextTrustTier({ currentTier: 'established', accountAgeDays: 60, responseRate: 0.5, ...BASE })
		).toBe('trusted');
	});

	it('does not promote established -> trusted if response rate is below 0.5', () => {
		expect(
			nextTrustTier({ currentTier: 'established', accountAgeDays: 90, responseRate: 0.49, ...BASE })
		).toBeNull();
	});

	it('does not promote established -> trusted if age is under the threshold', () => {
		expect(
			nextTrustTier({ currentTier: 'established', accountAgeDays: 59, responseRate: 1, ...BASE })
		).toBeNull();
	});

	it('is a no-op once already trusted', () => {
		expect(
			nextTrustTier({ currentTier: 'trusted', accountAgeDays: 1000, responseRate: 1, ...BASE })
		).toBeNull();
	});
});
