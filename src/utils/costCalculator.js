// Cumulative dust required per half-level from level 1.0 to 40.0
const DUST_TABLE = {
  1.0: 200, 1.5: 200, 2.0: 200, 2.5: 200,
  3.0: 400, 3.5: 400, 4.0: 400, 4.5: 400,
  5.0: 600, 5.5: 600, 6.0: 600, 6.5: 600,
  7.0: 800, 7.5: 800, 8.0: 800, 8.5: 800,
  9.0: 1000, 9.5: 1000, 10.0: 1000, 10.5: 1000,
  11.0: 1300, 11.5: 1300, 12.0: 1300, 12.5: 1300,
  13.0: 1600, 13.5: 1600, 14.0: 1600, 14.5: 1600,
  15.0: 1900, 15.5: 1900, 16.0: 1900, 16.5: 1900,
  17.0: 2200, 17.5: 2200, 18.0: 2200, 18.5: 2200,
  19.0: 2500, 19.5: 2500, 20.0: 2500, 20.5: 2500,
  21.0: 3000, 21.5: 3000, 22.0: 3000, 22.5: 3000,
  23.0: 3500, 23.5: 3500, 24.0: 3500, 24.5: 3500,
  25.0: 4000, 25.5: 4000, 26.0: 4000, 26.5: 4000,
  27.0: 4500, 27.5: 4500, 28.0: 4500, 28.5: 4500,
  29.0: 5000, 29.5: 5000, 30.0: 5000, 30.5: 5000,
  31.0: 6000, 31.5: 6000, 32.0: 6000, 32.5: 6000,
  33.0: 7000, 33.5: 7000, 34.0: 7000, 34.5: 7000,
  35.0: 8000, 35.5: 8000, 36.0: 8000, 36.5: 8000,
  37.0: 9000, 37.5: 9000, 38.0: 9000, 38.5: 9000,
  39.0: 10000, 39.5: 10000
};

// XL candy per half level from 40.5 to 50.0 (20 half levels)
// Cumulative total is 250,000 dust and 296 XL candy
const XL_CANDY_STEPS = [
  { dust: 10000, xl: 10 }, { dust: 10000, xl: 10 }, // 40.5, 41.0
  { dust: 11000, xl: 10 }, { dust: 11000, xl: 10 }, // 41.5, 42.0
  { dust: 11000, xl: 12 }, { dust: 11000, xl: 12 }, // 42.5, 43.0
  { dust: 12000, xl: 12 }, { dust: 12000, xl: 12 }, // 43.5, 44.0
  { dust: 12000, xl: 15 }, { dust: 12000, xl: 15 }, // 44.5, 45.0
  { dust: 13000, xl: 15 }, { dust: 13000, xl: 15 }, // 45.5, 46.0
  { dust: 13000, xl: 17 }, { dust: 13000, xl: 17 }, // 46.5, 47.0
  { dust: 14000, xl: 17 }, { dust: 14000, xl: 17 }, // 47.5, 48.0
  { dust: 14000, xl: 20 }, { dust: 14000, xl: 20 }, // 48.5, 49.0
  { dust: 15000, xl: 20 }, { dust: 15000, xl: 20 }  // 49.5, 50.0
];

/**
 * Calculates cumulative dust needed to go from startLevel to 40.0.
 */
export function calculateDustTo40(startLevel) {
  let total = 0;
  let current = Math.max(1.0, startLevel || 1.0);
  while (current < 40.0) {
    total += DUST_TABLE[current] || 0;
    current = Math.round((current + 0.5) * 10) / 10;
  }
  return total;
}

/**
 * Calculates resource costs including stardust, regular candy and XL candy.
 */
export function calculateResourceCosts(initialLevel, rawDustCost, rawCandyCost, isShadow = false, isLucky = false) {
  const dustCost = Number(rawDustCost) || 0;
  const candyCost = Number(rawCandyCost) || 0;
  
  if (dustCost <= 0) {
    return { dustCost: 0, candyCost, xlCandyCost: 0, requiresXl: false };
  }

  const multiplier = isShadow ? 1.2 : isLucky ? 0.5 : 1.0;
  const dustTo40 = Math.round(calculateDustTo40(initialLevel) * multiplier);

  if (dustCost <= dustTo40) {
    return { dustCost, candyCost, xlCandyCost: 0, requiresXl: false };
  }

  let excessDust = dustCost - dustTo40;
  let xlTotal = 0;

  for (const step of XL_CANDY_STEPS) {
    const stepDust = Math.round(step.dust * multiplier);
    if (excessDust >= stepDust - 100) {
      xlTotal += step.xl;
      excessDust -= stepDust;
    } else {
      break;
    }
  }

  return {
    dustCost,
    candyCost,
    xlCandyCost: xlTotal,
    requiresXl: xlTotal > 0
  };
}
