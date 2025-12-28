import {
  calculateTokenAllocationPercent,
  calculateTokenAllocationAmount,
  calculateTokenPrice,
  TOTAL_TOKEN_SUPPLY,
  DEFAULT_FDV,
} from "./tokenAllocation";

/**
 * Calculate marks for APR calculation, including projected and bonus marks
 * 
 * When genesis is active, we project marks based on days left:
 * - Deposit marks: marksPerDay (10 marks/$/day) × daysLeftInGenesis
 * - End of genesis bonus: 100 marks per dollar (for all depositors)
 * - Early deposit bonus: 100 marks per dollar (only for early depositors)
 * 
 * When genesis has ended, bonus marks are already included in currentMarks
 * 
 * @param currentMarks - Current marks from subgraph (accumulated marks)
 * @param currentDepositUSD - User's current deposit in USD
 * @param earlyBonusEligibleDepositUSD - USD amount eligible for early bonus
 * @param genesisEnded - Whether genesis has ended
 * @param qualifiesForEarlyBonus - Whether user qualifies for early bonus
 * @param daysLeftInGenesis - Days remaining until genesis ends (optional, defaults to 7)
 * @returns Total marks including bonuses (estimated if genesis active, actual if ended)
 */
export function calculateMarksForAPR(
  currentMarks: number,
  currentDepositUSD: number,
  earlyBonusEligibleDepositUSD: number,
  genesisEnded: boolean,
  qualifiesForEarlyBonus: boolean,
  daysLeftInGenesis: number = 7
): number {
  if (genesisEnded) {
    // Genesis has ended - bonuses are already included in currentMarks
    return currentMarks;
  }

  // Genesis is active - project marks based on days left
  
  // Deposit marks: 10 marks per $ per day × days left
  const marksPerDay = currentDepositUSD * 10;
  const projectedDepositMarks = marksPerDay * daysLeftInGenesis;

  // End of genesis bonus: 100 marks per dollar (all depositors get this)
  const endBonusMarks = currentDepositUSD * 100;

  // Early deposit bonus: 100 marks per dollar (only for early depositors)
  const earlyBonusMarks = qualifiesForEarlyBonus && earlyBonusEligibleDepositUSD > 0
    ? earlyBonusEligibleDepositUSD * 100
    : 0;

  return projectedDepositMarks + endBonusMarks + earlyBonusMarks;
}

/**
 * Calculate annualized $TIDE APR for a user's deposit in a specific market
 * 
 * The APR is annualized based on the remaining genesis period (daysLeftInGenesis).
 * For example, if 4 days left and the period return is 10%,
 * the annualized APR would be 10% * (365/4) = 912.5%
 * 
 * @param userMarks - User's maiden voyage marks for this specific market (projected total)
 * @param totalMarks - Total maiden voyage marks across all users (all markets)
 * @param userDepositUSD - User's current deposit in this market (USD)
 * @param totalGenesisTVL - Total genesis deposits TVL across all markets (USD)
 * @param daysLeftInGenesis - Days remaining until genesis ends (for annualization)
 * @param fdv - Fully Diluted Valuation in USD (default: $10M)
 * @returns Annualized APR as a percentage (e.g., 912.5 for 912.5%)
 */
export function calculateTideAPR(
  userMarks: number,
  totalMarks: number,
  userDepositUSD: number,
  totalGenesisTVL: number,
  daysLeftInGenesis: number,
  fdv: number = DEFAULT_FDV
): number {
  // Validate inputs - use minimum of 0.1 days to avoid division by zero
  const annualizationDays = Math.max(daysLeftInGenesis, 0.1);
  
  if (userDepositUSD === 0 || totalMarks === 0) {
    return 0;
  }

  // 1. Calculate token allocation percentage based on genesis TVL
  const allocationPercent = calculateTokenAllocationPercent(totalGenesisTVL);
  
  // 2. Calculate total tokens to distribute
  const totalTokensToDistribute = TOTAL_TOKEN_SUPPLY * allocationPercent;
  
  // 3. Calculate user's share of marks
  const userMarksShare = userMarks / totalMarks;
  
  // 4. Calculate user's estimated tokens
  const userEstimatedTokens = totalTokensToDistribute * userMarksShare;
  
  // 5. Calculate token price from FDV
  const tokenPrice = calculateTokenPrice(fdv);
  
  // 6. Calculate estimated value in USD
  const estimatedValueUSD = userEstimatedTokens * tokenPrice;
  
  // 7. Calculate period return (return over remaining genesis period)
  const periodReturn = estimatedValueUSD / userDepositUSD;
  
  // 8. Annualize the return based on days left
  // Formula: APR = periodReturn * (365 / daysLeftInGenesis) * 100
  // Example: If 4 days left and period return is 10% (0.1),
  //          APR = 0.1 * (365/4) * 100 = 912.5%
  const annualizedAPR = periodReturn * (365 / annualizationDays) * 100;
  
  return annualizedAPR;
}

/**
 * Calculate user's estimated token allocation
 * 
 * @param userMarks - User's maiden voyage marks for this specific market
 * @param totalMarks - Total maiden voyage marks across all users
 * @param totalGenesisTVL - Total genesis deposits TVL across all markets (USD)
 * @returns Estimated number of tokens user will receive
 */
export function calculateUserEstimatedTokens(
  userMarks: number,
  totalMarks: number,
  totalGenesisTVL: number
): number {
  if (totalMarks === 0) return 0;

  const allocationPercent = calculateTokenAllocationPercent(totalGenesisTVL);
  const totalTokensToDistribute = TOTAL_TOKEN_SUPPLY * allocationPercent;
  const userMarksShare = userMarks / totalMarks;
  
  return totalTokensToDistribute * userMarksShare;
}

/**
 * Calculate user's estimated token value in USD
 * 
 * @param userMarks - User's maiden voyage marks for this specific market
 * @param totalMarks - Total maiden voyage marks across all users
 * @param totalGenesisTVL - Total genesis deposits TVL across all markets (USD)
 * @param fdv - Fully Diluted Valuation in USD (default: $10M)
 * @returns Estimated value in USD
 */
export function calculateUserEstimatedValue(
  userMarks: number,
  totalMarks: number,
  totalGenesisTVL: number,
  fdv: number = DEFAULT_FDV
): number {
  const estimatedTokens = calculateUserEstimatedTokens(
    userMarks,
    totalMarks,
    totalGenesisTVL
  );
  const tokenPrice = calculateTokenPrice(fdv);
  
  return estimatedTokens * tokenPrice;
}

/**
 * Breakdown of marks into components for APR calculation
 */
export interface MarksBreakdown {
  depositMarks: number; // Marks from regular deposit accumulation
  endBonusMarks: number; // Marks from end of genesis bonus
  earlyBonusMarks: number; // Marks from early deposit bonus
  totalMarks: number; // Total marks (sum of all components)
}

/**
 * Calculate marks breakdown for APR calculation
 * 
 * When genesis is active, projects marks based on days left:
 * - Deposit marks: marksPerDay (10 marks/$/day) × daysLeftInGenesis
 * - End bonus: 100 marks per dollar (applied at end of genesis)
 * - Early bonus: 100 marks per dollar (for early depositors)
 * 
 * @param currentMarks - Current marks from subgraph (accumulated marks, used if genesis ended)
 * @param currentDepositUSD - User's current deposit in USD
 * @param earlyBonusEligibleDepositUSD - USD amount eligible for early bonus
 * @param genesisEnded - Whether genesis has ended
 * @param qualifiesForEarlyBonus - Whether user qualifies for early bonus
 * @param daysLeftInGenesis - Days remaining until genesis ends (optional, defaults to 7)
 * @returns Breakdown of marks by component
 */
export function calculateMarksBreakdown(
  currentMarks: number,
  currentDepositUSD: number,
  earlyBonusEligibleDepositUSD: number,
  genesisEnded: boolean,
  qualifiesForEarlyBonus: boolean,
  daysLeftInGenesis: number = 7
): MarksBreakdown {
  if (genesisEnded) {
    // Genesis has ended - bonuses are already included in currentMarks
    // We can't separate them, so we'll show all as deposit marks
    return {
      depositMarks: currentMarks,
      endBonusMarks: 0,
      earlyBonusMarks: 0,
      totalMarks: currentMarks,
    };
  }

  // Genesis is active - project marks based on days left
  
  // Deposit marks: 10 marks per $ per day × days left
  const marksPerDay = currentDepositUSD * 10;
  const depositMarks = marksPerDay * daysLeftInGenesis;
  
  // End bonus: 100 marks per $ (applied at end of genesis)
  const endBonusMarks = currentDepositUSD * 100;
  
  // Early bonus: 100 marks per $ (for early depositors)
  const earlyBonusMarks = qualifiesForEarlyBonus && earlyBonusEligibleDepositUSD > 0
    ? earlyBonusEligibleDepositUSD * 100
    : 0;

  return {
    depositMarks,
    endBonusMarks,
    earlyBonusMarks,
    totalMarks: depositMarks + endBonusMarks + earlyBonusMarks,
  };
}

/**
 * Breakdown of $TIDE APR into components
 */
export interface TideAPRBreakdown {
  depositAPR: number; // APR from deposit marks
  endBonusAPR: number; // APR from end bonus marks
  earlyBonusAPR: number; // APR from early bonus marks
  totalAPR: number; // Total APR (sum of all components)
}

/**
 * Calculate $TIDE APR breakdown by component
 * 
 * APR is annualized based on the remaining genesis period (daysLeftInGenesis).
 * This shows the projected annual return if the same rate of return continued.
 * 
 * @param marksBreakdown - Breakdown of user's marks
 * @param totalMarks - Total maiden voyage marks across all users (all markets)
 * @param userDepositUSD - User's current deposit in this market (USD)
 * @param totalGenesisTVL - Total genesis deposits TVL across all markets (USD)
 * @param daysLeftInGenesis - Days remaining until genesis ends (for annualization)
 * @param fdv - Fully Diluted Valuation in USD (default: $10M)
 * @returns Breakdown of APR by component
 */
export function calculateTideAPRBreakdown(
  marksBreakdown: MarksBreakdown,
  totalMarks: number,
  userDepositUSD: number,
  totalGenesisTVL: number,
  daysLeftInGenesis: number,
  fdv: number = DEFAULT_FDV
): TideAPRBreakdown {
  // Validate inputs - use minimum of 0.1 days to avoid division by zero
  const annualizationDays = Math.max(daysLeftInGenesis, 0.1);
  
  if (userDepositUSD === 0 || totalMarks === 0) {
    return {
      depositAPR: 0,
      endBonusAPR: 0,
      earlyBonusAPR: 0,
      totalAPR: 0,
    };
  }

  // Calculate token allocation and price (same for all components)
  const allocationPercent = calculateTokenAllocationPercent(totalGenesisTVL);
  const totalTokensToDistribute = TOTAL_TOKEN_SUPPLY * allocationPercent;
  const tokenPrice = calculateTokenPrice(fdv);

  // Helper function to calculate APR for a specific marks amount
  // APR = (return over daysLeftInGenesis) annualized to a full year
  const calculateAPRForMarks = (marks: number): number => {
    if (marks === 0) return 0;
    
    const userMarksShare = marks / totalMarks;
    const userEstimatedTokens = totalTokensToDistribute * userMarksShare;
    const estimatedValueUSD = userEstimatedTokens * tokenPrice;
    const periodReturn = estimatedValueUSD / userDepositUSD;
    // Annualize based on days left in genesis
    const annualizedAPR = periodReturn * (365 / annualizationDays) * 100;
    
    return annualizedAPR;
  };

  // Calculate APR for each component
  const depositAPR = calculateAPRForMarks(marksBreakdown.depositMarks);
  const endBonusAPR = calculateAPRForMarks(marksBreakdown.endBonusMarks);
  const earlyBonusAPR = calculateAPRForMarks(marksBreakdown.earlyBonusMarks);

  // Total APR (should match calculateTideAPR result)
  const totalAPR = calculateAPRForMarks(marksBreakdown.totalMarks);

  return {
    depositAPR,
    endBonusAPR,
    earlyBonusAPR,
    totalAPR,
  };
}

