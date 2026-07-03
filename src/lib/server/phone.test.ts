import { describe, it, expect } from 'vitest';
import { normalizeE164, hashPhoneLocal, hashPhoneForDbbl, hashEmailForDbbl } from './phone';

describe('normalizeE164', () => {
	it('prepends +1 for 10-digit US numbers', () => {
		expect(normalizeE164('5550001234')).toBe('+15550001234');
	});

	it('accepts formatted US numbers', () => {
		expect(normalizeE164('(555) 000-1234')).toBe('+15550001234');
		expect(normalizeE164('555-000-1234')).toBe('+15550001234');
	});

	it('prepends + for 11-digit numbers starting with 1', () => {
		expect(normalizeE164('15550001234')).toBe('+15550001234');
	});

	it('prepends + for international numbers', () => {
		expect(normalizeE164('+447911123456')).toBe('+447911123456');
		expect(normalizeE164('447911123456')).toBe('+447911123456');
	});

	it('returns null for numbers too short to normalize', () => {
		expect(normalizeE164('555')).toBeNull();
		expect(normalizeE164('')).toBeNull();
	});
});

describe('hashPhoneLocal', () => {
	it('returns a 64-char hex string', async () => {
		const hash = await hashPhoneLocal('+15550001234', 'test-pepper');
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it('same input + pepper produces the same hash', async () => {
		const a = await hashPhoneLocal('+15550001234', 'pepper');
		const b = await hashPhoneLocal('+15550001234', 'pepper');
		expect(a).toBe(b);
	});

	it('different peppers produce different hashes', async () => {
		const a = await hashPhoneLocal('+15550001234', 'pepper-a');
		const b = await hashPhoneLocal('+15550001234', 'pepper-b');
		expect(a).not.toBe(b);
	});

	it('different phones produce different hashes', async () => {
		const a = await hashPhoneLocal('+15550001234', 'pepper');
		const b = await hashPhoneLocal('+15550009999', 'pepper');
		expect(a).not.toBe(b);
	});
});

describe('hashPhoneForDbbl', () => {
	it('returns a 64-char hex string', async () => {
		const hash = await hashPhoneForDbbl('+15550001234');
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it('is deterministic', async () => {
		const a = await hashPhoneForDbbl('+15550001234');
		const b = await hashPhoneForDbbl('+15550001234');
		expect(a).toBe(b);
	});

	it('differs from peppered hash of the same phone', async () => {
		const plain = await hashPhoneForDbbl('+15550001234');
		const peppered = await hashPhoneLocal('+15550001234', 'some-pepper');
		expect(plain).not.toBe(peppered);
	});
});

describe('hashEmailForDbbl', () => {
	it('returns a 64-char hex string', async () => {
		const hash = await hashEmailForDbbl('user@example.com');
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it('normalizes case before hashing', async () => {
		const a = await hashEmailForDbbl('User@Example.COM');
		const b = await hashEmailForDbbl('user@example.com');
		expect(a).toBe(b);
	});

	it('trims whitespace before hashing', async () => {
		const a = await hashEmailForDbbl('  user@example.com  ');
		const b = await hashEmailForDbbl('user@example.com');
		expect(a).toBe(b);
	});

	it('different emails produce different hashes', async () => {
		const a = await hashEmailForDbbl('alice@example.com');
		const b = await hashEmailForDbbl('bob@example.com');
		expect(a).not.toBe(b);
	});
});
