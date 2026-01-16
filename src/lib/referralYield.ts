const E18 = 1000000000000000000n;

export type YieldToken = "fxSAVE" | "wstETH";

export type YieldPosition = {
  user: `0x${string}`;
  token: YieldToken;
  wrappedBalance: bigint;
  lastRate: bigint;
  lastBaseValue: bigint;
  lastUpdatedBlock: bigint;
  lastUpdatedAt: number;
};

export type YieldAccrual = {
  user: `0x${string}`;
  token: YieldToken;
  deltaBase: bigint;
  blockNumber: bigint;
  timestamp: number;
};

export function computeBaseValue(
  wrappedBalance: bigint,
  rate: bigint
): bigint {
  return (wrappedBalance * rate) / E18;
}

export function applyRateToPosition(
  position: YieldPosition,
  rate: bigint,
  blockNumber: bigint,
  timestamp: number
): { position: YieldPosition; accrual: YieldAccrual | null } {
  const nextBase = computeBaseValue(position.wrappedBalance, rate);
  const deltaBase = nextBase - position.lastBaseValue;

  const nextPosition: YieldPosition = {
    ...position,
    lastRate: rate,
    lastBaseValue: nextBase,
    lastUpdatedBlock: blockNumber,
    lastUpdatedAt: timestamp,
  };

  if (deltaBase <= 0n) {
    return { position: nextPosition, accrual: null };
  }

  return {
    position: nextPosition,
    accrual: {
      user: position.user,
      token: position.token,
      deltaBase,
      blockNumber,
      timestamp,
    },
  };
}

export function applyBalanceChange(
  position: YieldPosition,
  deltaWrapped: bigint,
  rate: bigint,
  blockNumber: bigint,
  timestamp: number
): { position: YieldPosition; accrual: YieldAccrual | null } {
  const updated = applyRateToPosition(position, rate, blockNumber, timestamp);
  const nextBalance = updated.position.wrappedBalance + deltaWrapped;

  const nextPosition: YieldPosition = {
    ...updated.position,
    wrappedBalance: nextBalance > 0n ? nextBalance : 0n,
  };

  const nextBase = computeBaseValue(nextPosition.wrappedBalance, rate);
  nextPosition.lastBaseValue = nextBase;
  nextPosition.lastRate = rate;
  nextPosition.lastUpdatedBlock = blockNumber;
  nextPosition.lastUpdatedAt = timestamp;

  return { position: nextPosition, accrual: updated.accrual };
}
