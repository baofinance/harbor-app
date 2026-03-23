/**
 * Shared Tide / marks math for Genesis index APR columns (mobile, md, lg breakpoints).
 * Keeps three layout paths aligned without copying the same block.
 */

import {
  calculateMarksForAPR,
  calculateMarksBreakdown,
  calculateTideAPRBreakdown,
} from "@/utils/tideAPR";

export type HarborMarksLike = {
  currentMarks?: string;
  genesisStartDate?: string;
  genesisEndDate?: string;
  genesisEnded?: boolean;
  earlyBonusEligibleDepositUSD?: string;
  qualifiesForEarlyBonus?: boolean;
  lastUpdated?: string;
  currentDepositUSD?: string;
} | null;

export type BonusStatusResultLike = {
  genesisAddress?: string;
  data?: {
    cumulativeDeposits?: string;
    thresholdAmount?: string;
  };
};

export type GenesisAprDerivedInput = {
  collateralSymbol: string;
  wstETHAPR: number | null | undefined;
  fxSAVEAPR: number | null | undefined;
  isLoadingWstETHAPR: boolean;
  isLoadingFxSAVEAPR: boolean;
  marks: HarborMarksLike;
  endDate: string | undefined;
  userDepositUSD: number;
  bonusStatusResults: BonusStatusResultLike[] | undefined;
  genesisAddress: string | undefined;
  mounted: boolean;
  safeTotalGenesisTVL: number;
  safeIsLoadingTotalTVL: boolean;
  totalDepositsUSD: number;
  safeTotalMaidenVoyageMarks: number;
  fdv: number;
};

export type GenesisAprDerivedState = {
  isWstETH: boolean;
  isFxSAVE: boolean;
  underlyingAPR: number | null;
  isLoadingAPR: boolean;
  isValidAPR: boolean;
  userMarksForMarket: number;
  genesisDays: number;
  daysLeftInGenesis: number;
  depositForAPR: number;
  marksForAPR: ReturnType<typeof calculateMarksForAPR>;
  marksBreakdown: ReturnType<typeof calculateMarksBreakdown>;
  tvlForAPR: number;
  marksForAPRTotal: number;
  canShowCombinedAPR: boolean;
  aprBreakdown: ReturnType<typeof calculateTideAPRBreakdown> | undefined;
  displayMarks: number;
};

export function computeGenesisAprDerivedState(
  input: GenesisAprDerivedInput
): GenesisAprDerivedState {
  const {
    collateralSymbol,
    wstETHAPR,
    fxSAVEAPR,
    isLoadingWstETHAPR,
    isLoadingFxSAVEAPR,
    marks,
    endDate,
    userDepositUSD,
    bonusStatusResults,
    genesisAddress,
    mounted,
    safeTotalGenesisTVL,
    safeIsLoadingTotalTVL,
    totalDepositsUSD,
    safeTotalMaidenVoyageMarks,
    fdv,
  } = input;

  const isWstETH = collateralSymbol.toLowerCase() === "wsteth";
  const isFxSAVE = collateralSymbol.toLowerCase() === "fxsave";
  const underlyingAPR = isWstETH
    ? wstETHAPR
    : isFxSAVE
      ? fxSAVEAPR
      : null;
  const isLoadingAPR = isWstETH
    ? isLoadingWstETHAPR
    : isFxSAVE
      ? isLoadingFxSAVEAPR
      : false;

  const isValidAPR =
    underlyingAPR !== null &&
    typeof underlyingAPR === "number" &&
    !isNaN(underlyingAPR) &&
    isFinite(underlyingAPR) &&
    underlyingAPR >= 0;

  const userMarksForMarket = marks
    ? parseFloat(marks.currentMarks || "0")
    : 0;

  const marketEndDate = endDate ? new Date(endDate).getTime() : 0;
  const genesisStartDate = marks
    ? parseInt(marks.genesisStartDate || "0", 10)
    : 0;
  const genesisEndDateFromMarks = marks
    ? parseInt(marks.genesisEndDate || "0", 10)
    : 0;
  const genesisEndDate =
    marketEndDate > 0 ? marketEndDate : genesisEndDateFromMarks;
  const genesisDays =
    genesisEndDate > genesisStartDate && genesisStartDate > 0
      ? (genesisEndDate - genesisStartDate) / (1000 * 60 * 60 * 24)
      : 7;

  const now = Date.now();
  const daysLeftInGenesis =
    genesisEndDate > now
      ? (genesisEndDate - now) / (1000 * 60 * 60 * 24)
      : genesisDays;

  const currentDepositUSD = marks
    ? parseFloat(marks.currentDepositUSD || "0")
    : 0;
  const hasUserDeposit = userDepositUSD > 0 || currentDepositUSD > 0;
  const depositForAPR = hasUserDeposit
    ? userDepositUSD > 0
      ? userDepositUSD
      : currentDepositUSD
    : 1;

  const marketBonusData = bonusStatusResults?.find(
    (status) =>
      status.genesisAddress?.toLowerCase() === genesisAddress?.toLowerCase()
  );
  const marketBonusStatus = marketBonusData?.data;
  const earlyBonusCapFilled = marketBonusStatus
    ? Number(marketBonusStatus.cumulativeDeposits) >=
      Number(marketBonusStatus.thresholdAmount)
    : false;
  const earlyBonusAvailable = !earlyBonusCapFilled;

  const earlyBonusEligibleDepositUSDFromMarks = marks
    ? parseFloat(marks.earlyBonusEligibleDepositUSD || "0")
    : 0;
  const genesisEnded = marks ? marks.genesisEnded : false;
  const qualifiesForEarlyBonusFromMarks = marks
    ? marks.qualifiesForEarlyBonus || false
    : false;

  const earlyBonusEligibleDepositUSD =
    hasUserDeposit && earlyBonusAvailable
      ? depositForAPR
      : earlyBonusEligibleDepositUSDFromMarks;
  const qualifiesForEarlyBonus =
    hasUserDeposit && earlyBonusAvailable
      ? true
      : qualifiesForEarlyBonusFromMarks;

  const estimatedEarlyBonusEligible = earlyBonusAvailable ? 1 : 0;
  const estimatedQualifiesForEarlyBonus = earlyBonusAvailable;

  const marksForAPR = calculateMarksForAPR(
    userMarksForMarket,
    depositForAPR,
    hasUserDeposit
      ? earlyBonusEligibleDepositUSD
      : estimatedEarlyBonusEligible,
    genesisEnded,
    hasUserDeposit
      ? qualifiesForEarlyBonus
      : estimatedQualifiesForEarlyBonus,
    daysLeftInGenesis
  );

  const marksBreakdown = calculateMarksBreakdown(
    userMarksForMarket,
    depositForAPR,
    hasUserDeposit
      ? earlyBonusEligibleDepositUSD
      : estimatedEarlyBonusEligible,
    genesisEnded,
    hasUserDeposit
      ? qualifiesForEarlyBonus
      : estimatedQualifiesForEarlyBonus,
    daysLeftInGenesis
  );

  const tvlForAPR =
    safeTotalGenesisTVL > 0
      ? safeTotalGenesisTVL
      : totalDepositsUSD > 0
        ? totalDepositsUSD
        : 1_000_000;

  const marksForAPRTotal = safeTotalMaidenVoyageMarks;

  const canShowCombinedAPR =
    mounted &&
    isValidAPR &&
    depositForAPR > 0 &&
    tvlForAPR > 0 &&
    !safeIsLoadingTotalTVL;

  let aprBreakdown: ReturnType<typeof calculateTideAPRBreakdown> | undefined;
  if (
    canShowCombinedAPR &&
    depositForAPR > 0 &&
    tvlForAPR > 0 &&
    genesisDays > 0 &&
    marksForAPRTotal > 0
  ) {
    try {
      aprBreakdown = calculateTideAPRBreakdown(
        marksBreakdown,
        marksForAPRTotal,
        depositForAPR,
        tvlForAPR,
        daysLeftInGenesis,
        fdv
      );
    } catch {
      aprBreakdown = undefined;
    }
  }

  const lastUpdated = marks ? parseInt(marks.lastUpdated || "0", 10) : 0;
  const daysElapsed =
    lastUpdated > 0
      ? (Date.now() / 1000 - lastUpdated) / (24 * 60 * 60)
      : 0;
  const displayMarks = genesisEnded
    ? userMarksForMarket
    : userMarksForMarket + daysElapsed * currentDepositUSD * 10;

  return {
    isWstETH,
    isFxSAVE,
    underlyingAPR: underlyingAPR ?? null,
    isLoadingAPR,
    isValidAPR,
    userMarksForMarket,
    genesisDays,
    daysLeftInGenesis,
    depositForAPR,
    marksForAPR,
    marksBreakdown,
    tvlForAPR,
    marksForAPRTotal,
    canShowCombinedAPR,
    aprBreakdown,
    displayMarks,
  };
}
