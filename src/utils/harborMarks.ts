/**
 * Harbor Marks calculation utilities
 * These functions can be used as a fallback if The Graph is unavailable
 * or for client-side calculations before subgraph data is available
 */

export interface HarborMarksCalculation {
  currentMarks: number;
  marksPerDay: number;
  estimatedTotalMarks: number;
  bonusMarks: number;
}

export interface DepositInfo {
  amount: bigint; // in wei
  amountUSD: number;
  timestamp: number; // Unix timestamp
  withdrawn: boolean;
  withdrawnAt?: number;
}

/**
 * Calculate Harbor Marks for a deposit
 * @param depositUSD - USD value of deposit
 * @param depositTimestamp - When deposit was made (Unix timestamp)
 * @param genesisStartDate - Genesis start date (Unix timestamp)
 * @param genesisEndDate - Genesis end date (Unix timestamp, null if ongoing)
 * @param currentTimestamp - Current time (Unix timestamp)
 * @param marksPerDollarPerDay - Marks earned per dollar per day (default: 10)
 * @param bonusMultiplier - Bonus multiplier at genesis end (default: 100)
 */
export function calculateHarborMarks(
  depositUSD: number,
  depositTimestamp: number,
  genesisStartDate: number,
  genesisEndDate: number | null,
  currentTimestamp: number,
  marksPerDollarPerDay: number = 10,
  bonusMultiplier: number = 100
): HarborMarksCalculation {
  const marksPerDay = depositUSD * marksPerDollarPerDay;

  // Calculate days since deposit
  const daysSinceDeposit = Math.max(
    0,
    (currentTimestamp - depositTimestamp) / (1000 * 60 * 60 * 24)
  );

  // Calculate days since genesis start
  const daysSinceGenesisStart = Math.max(
    0,
    (currentTimestamp - genesisStartDate) / (1000 * 60 * 60 * 24)
  );

  let currentMarks = 0;
  let estimatedTotalMarks = 0;
  let bonusMarks = 0;

  if (genesisEndDate && currentTimestamp >= genesisEndDate) {
    // Genesis has ended - calculate final marks with bonus
    const daysInGenesis =
      (genesisEndDate - genesisStartDate) / (1000 * 60 * 60 * 24);
    const accumulatedMarks = depositUSD * marksPerDollarPerDay * daysInGenesis;
    bonusMarks = depositUSD * bonusMultiplier;
    currentMarks = accumulatedMarks + bonusMarks;
    estimatedTotalMarks = currentMarks;
  } else if (genesisEndDate) {
    // Genesis ongoing - calculate current and estimated
    currentMarks = depositUSD * marksPerDollarPerDay * daysSinceGenesisStart;

    const daysUntilEnd =
      (genesisEndDate - currentTimestamp) / (1000 * 60 * 60 * 24);
    const daysInGenesis =
      (genesisEndDate - genesisStartDate) / (1000 * 60 * 60 * 24);
    const futureMarks = depositUSD * marksPerDollarPerDay * daysUntilEnd;
    bonusMarks = depositUSD * bonusMultiplier;
    estimatedTotalMarks = currentMarks + futureMarks + bonusMarks;
  } else {
    // No end date - ongoing calculation
    currentMarks = depositUSD * marksPerDollarPerDay * daysSinceGenesisStart;
    estimatedTotalMarks = currentMarks; // No estimate without end date
  }

  return {
    currentMarks,
    marksPerDay,
    estimatedTotalMarks,
    bonusMarks,
  };
}

/**
 * Calculate total Harbor Marks across multiple deposits
 */
export function calculateTotalHarborMarks(
  deposits: DepositInfo[],
  genesisStartDate: number,
  genesisEndDate: number | null,
  currentTimestamp: number = Date.now(),
  marksPerDollarPerDay: number = 10,
  bonusMultiplier: number = 100
): HarborMarksCalculation {
  let totalCurrentMarks = 0;
  let totalMarksPerDay = 0;
  let totalEstimatedMarks = 0;
  let totalBonusMarks = 0;

  deposits.forEach((deposit) => {
    if (deposit.withdrawn && deposit.withdrawnAt) {
      // Calculate marks up to withdrawal time
      const marks = calculateHarborMarks(
        deposit.amountUSD,
        deposit.timestamp,
        genesisStartDate,
        deposit.withdrawnAt >= genesisEndDate
          ? genesisEndDate
          : deposit.withdrawnAt,
        deposit.withdrawnAt,
        marksPerDollarPerDay,
        bonusMultiplier
      );
      // Marks are forfeited, so don't add to totals
      return;
    }

    const marks = calculateHarborMarks(
      deposit.amountUSD,
      deposit.timestamp,
      genesisStartDate,
      genesisEndDate,
      currentTimestamp,
      marksPerDollarPerDay,
      bonusMultiplier
    );

    totalCurrentMarks += marks.currentMarks;
    totalMarksPerDay += marks.marksPerDay;
    totalEstimatedMarks += marks.estimatedTotalMarks;
    totalBonusMarks += marks.bonusMarks;
  });

  return {
    currentMarks: totalCurrentMarks,
    marksPerDay: totalMarksPerDay,
    estimatedTotalMarks: totalEstimatedMarks,
    bonusMarks: totalBonusMarks,
  };
}

/**
 * Calculate forfeited marks from a withdrawal
 */
export function calculateForfeitedMarks(
  withdrawalUSD: number,
  depositTimestamp: number,
  withdrawalTimestamp: number,
  genesisStartDate: number,
  genesisEndDate: number | null,
  marksPerDollarPerDay: number = 10,
  bonusMultiplier: number = 100
): number {
  // Calculate what marks would have been earned if not withdrawn
  const marks = calculateHarborMarks(
    withdrawalUSD,
    depositTimestamp,
    genesisStartDate,
    genesisEndDate,
    withdrawalTimestamp,
    marksPerDollarPerDay,
    bonusMultiplier
  );

  // If genesis hasn't ended yet, forfeit potential future marks too
  if (genesisEndDate && withdrawalTimestamp < genesisEndDate) {
    const daysUntilEnd =
      (genesisEndDate - withdrawalTimestamp) / (1000 * 60 * 60 * 24);
    const futureMarks = withdrawalUSD * marksPerDollarPerDay * daysUntilEnd;
    const potentialBonus = withdrawalUSD * bonusMultiplier;
    return marks.currentMarks + futureMarks + potentialBonus;
  }

  return marks.currentMarks;
}











