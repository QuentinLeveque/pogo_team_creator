import { describe, it, expect } from 'vitest';
import { calculateResourceCosts, calculateDustTo40 } from '../src/utils/costCalculator.js';

describe('costCalculator', () => {
  describe('calculateDustTo40', () => {
    it('calculates correct cumulative dust from level 1 to 40', () => {
      // Standard PoGo dust from 1 to 40 is 270,000
      expect(calculateDustTo40(1.0)).toBe(270000);
    });

    it('calculates correct cumulative dust from level 16 to 40', () => {
      expect(calculateDustTo40(16.0)).toBe(242600);
    });

    it('returns 0 when level is already 40 or higher', () => {
      expect(calculateDustTo40(40.0)).toBe(0);
      expect(calculateDustTo40(45.0)).toBe(0);
    });
  });

  describe('calculateResourceCosts', () => {
    it('calculates 0 XL candy when dust cost is below level 40 threshold', () => {
      // Level 16 Smogo to ~1500 CP: 45100 dust, 91 candy
      const res = calculateResourceCosts(16.0, 45100, 91, false, false);
      expect(res.requiresXl).toBe(false);
      expect(res.xlCandyCost).toBe(0);
      expect(res.dustCost).toBe(45100);
      expect(res.candyCost).toBe(91);
    });

    it('calculates XL candy when dust cost exceeds level 40 threshold', () => {
      // Level 16 Smogogo to 2500 CP: 492600 dust (needs level 50 = 296 XL)
      const res = calculateResourceCosts(16.0, 492600, 314, false, false);
      expect(res.requiresXl).toBe(true);
      expect(res.xlCandyCost).toBe(296);
      expect(res.dustCost).toBe(492600);
      expect(res.candyCost).toBe(314);
    });

    it('handles zero or missing dust gracefully', () => {
      const res = calculateResourceCosts(20.0, 0, 0);
      expect(res.requiresXl).toBe(false);
      expect(res.xlCandyCost).toBe(0);
      expect(res.dustCost).toBe(0);
      expect(res.candyCost).toBe(0);
    });
  });
});
