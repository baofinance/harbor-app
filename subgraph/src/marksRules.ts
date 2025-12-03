import { MarksRule } from "../generated/schema";
import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

/**
 * Get or create a marks rule for a contract type
 * Rules can be contract-specific or use defaults per contract type
 */
export function getOrCreateMarksRule(
  contractAddress: string | null,
  contractType: string
): MarksRule {
  // Try contract-specific rule first, then default rule
  const ruleId = contractAddress ? contractAddress : `default-${contractType}`;

  let rule = MarksRule.load(ruleId);

  if (rule == null) {
    rule = new MarksRule(ruleId);
    rule.contractType = contractType;
    rule.contractAddress = contractAddress ? (contractAddress as string) : null;

    // Set default rules based on contract type
    if (contractType == "genesis") {
      rule.marksPerDollarPerDay = BigDecimal.fromString("10");
      rule.bonusMultiplier = BigDecimal.fromString("100");
      rule.hasPeriod = true;
      rule.forfeitOnWithdrawal = true;
      rule.forfeitPercentage = BigDecimal.fromString("100"); // 100% forfeit
    } else if (contractType == "stabilityPoolCollateral") {
      rule.marksPerDollarPerDay = BigDecimal.fromString("1");
      rule.bonusMultiplier = null;
      rule.hasPeriod = false;
      rule.forfeitOnWithdrawal = true;
      rule.forfeitPercentage = BigDecimal.fromString("100"); // 100% forfeit
    } else if (contractType == "stabilityPoolSail") {
      rule.marksPerDollarPerDay = BigDecimal.fromString("2");
      rule.bonusMultiplier = null;
      rule.hasPeriod = false;
      rule.forfeitOnWithdrawal = true;
      rule.forfeitPercentage = BigDecimal.fromString("100"); // 100% forfeit
    } else if (contractType == "sailToken") {
      rule.marksPerDollarPerDay = BigDecimal.fromString("5");
      rule.bonusMultiplier = null;
      rule.hasPeriod = false;
      rule.forfeitOnWithdrawal = false; // No forfeit for wallet balances
      rule.forfeitPercentage = null;
    } else if (contractType == "haToken") {
      rule.marksPerDollarPerDay = BigDecimal.fromString("1");
      rule.bonusMultiplier = null;
      rule.hasPeriod = false;
      rule.forfeitOnWithdrawal = false; // No forfeit for wallet balances
      rule.forfeitPercentage = null;
    } else {
      // Default rule for unknown types
      rule.marksPerDollarPerDay = BigDecimal.fromString("1");
      rule.bonusMultiplier = null;
      rule.hasPeriod = false;
      rule.forfeitOnWithdrawal = true;
      rule.forfeitPercentage = BigDecimal.fromString("100");
    }

    rule.bonusType = null;
    rule.periodStartDate = null;
    rule.periodEndDate = null;
    rule.additionalRules = "{}";
    rule.isActive = true;
    const now = BigInt.fromI32(0); // Will be set from event
    rule.createdAt = now;
    rule.updatedAt = now;
    rule.save();
  }

  return rule;
}

/**
 * Update a marks rule (for admin/configuration changes)
 * Note: For now, rules are updated by recreating them
 * In production, you may want to add specific update handlers
 */
export function updateMarksRule(
  contractAddress: string | null,
  contractType: string,
  newMarksPerDollarPerDay: BigDecimal,
  timestamp: BigInt
): MarksRule {
  const rule = getOrCreateMarksRule(contractAddress, contractType);
  rule.marksPerDollarPerDay = newMarksPerDollarPerDay;
  rule.updatedAt = timestamp;
  rule.save();
  return rule;
}

/**
 * Calculate marks for a deposit/balance using the rule
 */
export function calculateMarksWithRule(
  amountUSD: BigDecimal,
  depositTimestamp: BigInt,
  currentTimestamp: BigInt,
  rule: MarksRule
): BigDecimal {
  if (!rule.isActive) {
    return BigDecimal.fromString("0");
  }

  const marksPerDay = amountUSD.times(rule.marksPerDollarPerDay);

  if (rule.hasPeriod && rule.periodEndDate != null) {
    const periodEnd = rule.periodEndDate as BigInt;
    const periodStart =
      rule.periodStartDate != null
        ? (rule.periodStartDate as BigInt)
        : depositTimestamp;

    if (currentTimestamp >= periodEnd) {
      // Period has ended - calculate final marks
      const daysInPeriod = periodEnd
        .minus(periodStart)
        .div(BigInt.fromI32(86400))
        .toBigDecimal();
      const accumulatedMarks = marksPerDay.times(daysInPeriod);

      // Add bonus if applicable
      if (rule.bonusMultiplier != null) {
        const bonus = amountUSD.times(rule.bonusMultiplier as BigDecimal);
        return accumulatedMarks.plus(bonus);
      }

      return accumulatedMarks;
    } else {
      // Period ongoing - calculate marks up to current time
      const daysSinceStart = currentTimestamp
        .minus(periodStart)
        .div(BigInt.fromI32(86400))
        .toBigDecimal();
      return marksPerDay.times(daysSinceStart);
    }
  } else {
    // No period - ongoing marks calculation
    const daysSinceDeposit = currentTimestamp
      .minus(depositTimestamp)
      .div(BigInt.fromI32(86400))
      .toBigDecimal();
    return marksPerDay.times(daysSinceDeposit);
  }
}

/**
 * Calculate forfeited marks from a withdrawal
 */
export function calculateForfeitedMarksWithRule(
  amountUSD: BigDecimal,
  marksEarned: BigDecimal,
  rule: MarksRule
): BigDecimal {
  if (!rule.forfeitOnWithdrawal) {
    return BigDecimal.fromString("0");
  }

  if (rule.forfeitPercentage == null) {
    // 100% forfeit
    return marksEarned;
  }

  // Partial forfeit
  return marksEarned.times(
    (rule.forfeitPercentage as BigDecimal).div(BigDecimal.fromString("100"))
  );
}
