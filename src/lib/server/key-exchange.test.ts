import { describe, it, expect } from 'vitest';
import { isKeyExchangeEligible } from './key-exchange';

describe('isKeyExchangeEligible', () => {
	describe('poster', () => {
		it('is eligible once they have received at least one message', () => {
			expect(isKeyExchangeEligible('poster', 0, 1)).toBe(true);
		});

		it('is not eligible with no messages received yet, even if they sent one', () => {
			expect(isKeyExchangeEligible('poster', 1, 0)).toBe(false);
		});

		it('is not eligible with no messages at all', () => {
			expect(isKeyExchangeEligible('poster', 0, 0)).toBe(false);
		});
	});

	describe('responder', () => {
		it('is eligible after sending one and receiving one', () => {
			expect(isKeyExchangeEligible('responder', 1, 1)).toBe(true);
		});

		it('is not eligible after only sending', () => {
			expect(isKeyExchangeEligible('responder', 1, 0)).toBe(false);
		});

		it('is not eligible after only receiving', () => {
			expect(isKeyExchangeEligible('responder', 0, 1)).toBe(false);
		});

		it('is not eligible with no messages at all', () => {
			expect(isKeyExchangeEligible('responder', 0, 0)).toBe(false);
		});
	});
});
