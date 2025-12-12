"use client";

import { useState } from "react";
import { useAccount, useContractReads, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { usePools } from "@/hooks/usePools";
import Link from "next/link";
import TokenIcon from "@/components/TokenIcon";
import { usePoolData } from "@/hooks/usePoolData";
import { STABILITY_POOL_ABI, ERC20_ABI } from "@/abis/shared";
import { rewardsABI } from "@/abis/rewards";
import InfoTooltip from "@/components/InfoTooltip";
import { useCurrency } from "@/contexts/CurrencyContext";
import HistoricalDataChart from "@/components/HistoricalDataChart";
import type { Pool } from "@/config/pools";
import type { MarketConfig } from "@/config/contracts";

interface EtherscanLinkProps {
  label: string;
  address?: string;
}

function EtherscanLink({ label, address }: EtherscanLinkProps) {
  if (!address) return null;
  const etherscanBaseUrl = "https://etherscan.io/address/";
  return (
    <div className="flex justify-between items-center text-sm py-2 border-b border-white/10 last:border-b-0">
      <span className="text-white/70">{label}</span>
      <a
        href={`${etherscanBaseUrl}${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-white hover:underline flex items-center gap-4"
      >
        {`${address.slice(0, 6)}...${address.slice(-4)}`}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    </div>
  );
}

function ContractInfoSection({
  pool,
  market,
}: {
  pool: Pool | undefined;
  market: MarketConfig | undefined;
}) {
  if (!pool || !market) {
    return (
      <div className="p-3 h-full">
        <h2 className="font-semibold font-mono text-white mb-2">
          Contract Info
        </h2>
        <p className="text-sm text-white/70">Pool information not available.</p>
      </div>
    );
  }

  const assetAddress =
    pool.poolType === "collateral"
      ? market.addresses.collateralToken
      : market.addresses.peggedToken;

  return (
    <div className="p-3 h-full">
      <h2 className="font-semibold font-mono text-white mb-2">Contract Info</h2>
      <div className="divide-y divide-white/10">
        <EtherscanLink label={pool.name} address={pool.address} />
        <EtherscanLink
          label={`Deposit Token (${pool.tokenSymbol})`}
          address={assetAddress}
        />
        <EtherscanLink
          label="Collateral Token"
          address={market.addresses.collateralToken}
        />
        <EtherscanLink
          label="Pegged Token"
          address={market.addresses.peggedToken}
        />
        <EtherscanLink label="Minter" address={market.addresses.minter} />
      </div>
    </div>
  );
}

type PoolAction = "deposit" | "withdraw" | "rewards";

type ContractReadResult = { result?: bigint };

type PoolWithData = Pool & {
  tvl?: bigint;
  tvlUSD: number;
  userDeposit?: bigint;
  aprBreakdown: { collateral: number; steam: number };
  rewards?: bigint;
  leverageRatio?: bigint;
};

function InputField({
  value,
  onChange,
  placeholder,
  maxButton,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxButton?: { onClick: () => void; label: string };
}) {
  return (
    <div className="flex items-center gap-4 p-3">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-2xl sm:text-3xl font-semibold bg-transparent text-white focus:outline-none pr-2"
      />
      {maxButton && (
        <button
          onClick={maxButton.onClick}
          className="text-xs text-white/80 hover:text-white px-2 py-1"
        >
          {maxButton.label}
        </button>
      )}
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  isLoading,
  children,
  loadingText,
}: {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className="w-full py-2 text-sm hover:outline-white/20 text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? loadingText || "Processing..." : children}
    </button>
  );
}

function BalanceDisplay({
  label,
  value,
  token,
}: {
  label: string;
  value: string;
  token?: string;
}) {
  return (
    <div className="flex justify-between items-center mb-1">
      <p className="text-xs text-white/60">{label}</p>
      <p className="text-sm text-white font-mono">
        {value} {token}
      </p>
    </div>
  );
}

function DepositTab({
  depositAmount,
  setDepositAmount,
  tokenBalance,
  tokenSymbol,
  error,
  isConnected,
  isDepositLoading,
  isApproveLoading,
  handleDeposit,
  handleMaxDeposit,
  formatAmount,
}: {
  depositAmount: string;
  setDepositAmount: (value: string) => void;
  tokenBalance: ReadonlyArray<ContractReadResult> | undefined;
  tokenSymbol: string;
  error: string | null;
  isConnected: boolean;
  isDepositLoading: boolean;
  isApproveLoading: boolean;
  handleDeposit: () => void;
  handleMaxDeposit: () => void;
  formatAmount: (value: bigint | undefined) => string;
}) {
  return (
    <div className="space-y-3">
      <BalanceDisplay
        label="Wallet Balance"
        value={formatAmount(tokenBalance?.[0]?.result)}
        token={tokenSymbol}
      />
      <InputField
        value={depositAmount}
        onChange={setDepositAmount}
        placeholder="0.0"
        maxButton={{ onClick: handleMaxDeposit, label: "MAX" }}
      />
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <ActionButton
        onClick={handleDeposit}
        disabled={!isConnected || !depositAmount}
        isLoading={isDepositLoading || isApproveLoading}
      >
        Deposit
      </ActionButton>
    </div>
  );
}

function WithdrawTab({
  withdrawAmount,
  setWithdrawAmount,
  poolWithData,
  tokenSymbol,
  error,
  isConnected,
  isWithdrawLoading,
  handleWithdraw,
  handleMaxWithdraw,
  formatAmount,
}: {
  withdrawAmount: string;
  setWithdrawAmount: (value: string) => void;
  poolWithData: PoolWithData | undefined;
  tokenSymbol: string;
  error: string | null;
  isConnected: boolean;
  isWithdrawLoading: boolean;
  handleWithdraw: () => void;
  handleMaxWithdraw: () => void;
  formatAmount: (value: bigint | undefined) => string;
}) {
  return (
    <div className="space-y-3">
      <BalanceDisplay
        label="Pool Balance"
        value={formatAmount(poolWithData?.userDeposit)}
        token={tokenSymbol}
      />
      <InputField
        value={withdrawAmount}
        onChange={setWithdrawAmount}
        placeholder="0.0"
        maxButton={{ onClick: handleMaxWithdraw, label: "MAX" }}
      />
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <ActionButton
        onClick={handleWithdraw}
        disabled={!isConnected || !withdrawAmount}
        isLoading={isWithdrawLoading}
      >
        Withdraw
      </ActionButton>
    </div>
  );
}

function RewardsTab({
  poolWithData,
  error,
  isConnected,
  isClaimLoading,
  handleClaimRewards,
  formatAmount,
}: {
  poolWithData: PoolWithData | undefined;
  error: string | null;
  isConnected: boolean;
  isClaimLoading: boolean;
  handleClaimRewards: () => void;
  formatAmount: (value: bigint | undefined) => string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-white/60 mb-1">Claimable Rewards</p>
        <p className="text-lg font-medium text-white font-mono">
          {formatAmount(poolWithData?.rewards)} STEAM
        </p>
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <ActionButton
        onClick={handleClaimRewards}
        disabled={!isConnected || !poolWithData?.rewards}
        isLoading={isClaimLoading}
      >
        Claim Rewards
      </ActionButton>
    </div>
  );
}

function ActionTabs({
  activeTab,
  setActiveTab,
  depositAmount,
  setDepositAmount,
  withdrawAmount,
  setWithdrawAmount,
  tokenBalance,
  poolWithData,
  tokenSymbol,
  error,
  isConnected,
  isDepositLoading,
  isApproveLoading,
  isWithdrawLoading,
  isClaimLoading,
  handleDeposit,
  handleWithdraw,
  handleClaimRewards,
  handleMaxDeposit,
  handleMaxWithdraw,
  formatAmount,
}: {
  activeTab: PoolAction;
  setActiveTab: (tab: PoolAction) => void;
  depositAmount: string;
  setDepositAmount: (value: string) => void;
  withdrawAmount: string;
  setWithdrawAmount: (value: string) => void;
  tokenBalance: ReadonlyArray<ContractReadResult> | undefined;
  poolWithData: PoolWithData | undefined;
  tokenSymbol: string;
  error: string | null;
  isConnected: boolean;
  isDepositLoading: boolean;
  isApproveLoading: boolean;
  isWithdrawLoading: boolean;
  isClaimLoading: boolean;
  handleDeposit: () => void;
  handleWithdraw: () => void;
  handleClaimRewards: () => void;
  handleMaxDeposit: () => void;
  handleMaxWithdraw: () => void;
  formatAmount: (value: bigint | undefined) => string;
}) {
  return (
    <div className="p-3 h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex gap-4 mb-3">
        {(
          [
            ["deposit", "Deposit"],
            ["withdraw", "Withdraw"],
            ["rewards", "Rewards"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 text-sm outline outline-1 transition-colors ${
              activeTab === key
                ? "text-white outline-white/80"
                : "text-white/80 outline-white/20 hover:outline-white/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-grow">
        {activeTab === "deposit" && (
          <DepositTab
            depositAmount={depositAmount}
            setDepositAmount={setDepositAmount}
            tokenBalance={tokenBalance}
            tokenSymbol={tokenSymbol}
            error={error}
            isConnected={isConnected}
            isDepositLoading={isDepositLoading}
            isApproveLoading={isApproveLoading}
            handleDeposit={handleDeposit}
            handleMaxDeposit={handleMaxDeposit}
            formatAmount={formatAmount}
          />
        )}

        {activeTab === "withdraw" && (
          <WithdrawTab
            withdrawAmount={withdrawAmount}
            setWithdrawAmount={setWithdrawAmount}
            poolWithData={poolWithData}
            tokenSymbol={tokenSymbol}
            error={error}
            isConnected={isConnected}
            isWithdrawLoading={isWithdrawLoading}
            handleWithdraw={handleWithdraw}
            handleMaxWithdraw={handleMaxWithdraw}
            formatAmount={formatAmount}
          />
        )}

        {activeTab === "rewards" && (
          <RewardsTab
            poolWithData={poolWithData}
            error={error}
            isConnected={isConnected}
            isClaimLoading={isClaimLoading}
            handleClaimRewards={handleClaimRewards}
            formatAmount={formatAmount}
          />
        )}
      </div>
    </div>
  );
}

interface PoolClientProps {
  marketId: string;
  poolType: "collateral" | "leveraged";
}

export default function PoolClient({ marketId, poolType }: PoolClientProps) {
  const { isConnected, address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [activeTab, setActiveTab] = useState<PoolAction>("deposit");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDepositLoading, setIsDepositLoading] = useState(false);
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [isClaimLoading, setIsClaimLoading] = useState(false);
  const [isApproveLoading, setIsApproveLoading] = useState(false);
  const { getPoolsByMarket, getMarketByPool } = usePools();
  const { formatFiat } = useCurrency();

  const pools = getPoolsByMarket(marketId);
  const pool = pools.find((p) => p.poolType === poolType);

  const { poolData } = usePoolData(pool ? [pool] : []);
  const poolWithData = poolData?.[0] as PoolWithData | undefined;

  const market = getMarketByPool(
    (pool?.address as `0x${string}`) ??
      "0x0000000000000000000000000000000000000000"
  );

  const assetAddress =
    pool && market
      ? pool.poolType === "collateral"
        ? market.addresses.collateralToken
        : market.addresses.peggedToken
      : undefined;

  const poolAddress = pool?.address;
  const tokenSymbol = pool?.tokenSymbol;
  const poolName = pool?.name;

  // Get token balance
  const { data: tokenBalance } = useContractReads({
    contracts: assetAddress
      ? [
          {
            address: assetAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address ?? "0x"],
          },
        ]
      : [],
  });

  // Get allowance
  const { data: allowance } = useContractReads({
    contracts:
      assetAddress && poolAddress
        ? [
            {
              address: assetAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "allowance",
              args: [address ?? "0x0", poolAddress as `0x${string}`],
            },
          ]
        : [],
  });

  // Format helpers
  const formatAmount = (value: bigint | undefined) => {
    if (!value) return "0.00";
    return (Number(value) / 1e18).toFixed(4);
  };

  const formatAPRBreakdown = (breakdown: {
    collateral: number;
    steam: number;
  }) => {
    if (!breakdown) return { collateral: "0.00%", steam: "0.00%" };
    return {
      collateral: breakdown.collateral.toFixed(2) + "%",
      steam: breakdown.steam.toFixed(2) + "%",
    };
  };

  // Handlers
  const handleDeposit = async () => {
    if (!isConnected || !address || !depositAmount || !poolAddress || !pool)
      return;

    try {
      setError(null);
      const amount = parseEther(depositAmount);

      if (
        assetAddress &&
        (!allowance?.[0]?.result ||
          (allowance[0].result as unknown as bigint) < amount)
      ) {
        setIsApproveLoading(true);
        await writeContractAsync({
          address: assetAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [poolAddress as `0x${string}`, amount],
        });
        setIsApproveLoading(false);
      }

      setIsDepositLoading(true);
      await writeContractAsync({
        address: poolAddress as `0x${string}`,
        abi: STABILITY_POOL_ABI,
        functionName: "deposit",
        args: [amount, address as `0x${string}`, 0n],
      });
      setDepositAmount("");
    } catch (error: unknown) {
      console.error("Deposit failed:", error);
      setError(error instanceof Error ? error.message : "Deposit failed");
    } finally {
      setIsDepositLoading(false);
      setIsApproveLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected || !address || !withdrawAmount || !poolAddress) return;
    try {
      setError(null);
      setIsWithdrawLoading(true);
      const amount = parseEther(withdrawAmount);
      await writeContractAsync({
        address: poolAddress as `0x${string}`,
        abi: STABILITY_POOL_ABI,
        functionName: "withdraw",
        args: [amount, address as `0x${string}`, 0n],
      });
      setWithdrawAmount("");
    } catch (error: unknown) {
      console.error("Withdraw failed:", error);
      setError(error instanceof Error ? error.message : "Withdraw failed");
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!isConnected || !address || !poolAddress) return;
    try {
      setError(null);
      setIsClaimLoading(true);
      await writeContractAsync({
        address: poolAddress as `0x${string}`,
        abi: rewardsABI,
        functionName: "claimRewards",
      });
    } catch (error: unknown) {
      console.error("Claim rewards failed:", error);
      setError(error instanceof Error ? error.message : "Claim rewards failed");
    } finally {
      setIsClaimLoading(false);
    }
  };

  const handleMaxDeposit = () => {
    const bal = (
      tokenBalance as ReadonlyArray<ContractReadResult> | undefined
    )?.[0]?.result;
    if (bal !== undefined) {
      setDepositAmount(formatAmount(bal));
    }
  };

  const handleMaxWithdraw = () => {
    if (poolWithData?.userDeposit) {
      setWithdrawAmount(formatAmount(poolWithData.userDeposit));
    }
  };

  const { collateral: baseAPR, steam: boostAPR } = formatAPRBreakdown(
    poolWithData?.aprBreakdown as { collateral: number; steam: number }
  );

  const tvlUSD = poolWithData?.tvlUSD ?? 0;

  if (!pool) {
    return (
      <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative px-4 sm:px-10">
        <main className="container mx-auto max-w-full pb-10 relative z-10">
          <div className="text-center">
            <h1 className="text-3xl text-white font-semibold font-mono">
              Pool Not Found
            </h1>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative px-4 sm:px-10">
      <main className="container mx-auto max-w-full pb-8 relative z-10">
        {/* Breadcrumb */}
        <div className="mb-3">
          <Link
            href="/earn"
            className="inline-flex items-center gap-4 text-white/60 hover:text-white"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              ></path>
            </svg>
            Earn
          </Link>
        </div>

        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-4">
            <div className="flex w-7 items-center justify-center">
              {pool.assetIcons
                .slice()
                .reverse()
                .map((icon: string, index: number) => (
                  <TokenIcon
                    key={index}
                    src={icon}
                    alt="token icon"
                    width={28}
                    height={28}
                    className={`rounded-full ${index > 0 ? "-ml-3" : ""}`}
                  />
                ))}
            </div>
            <h1 className="text-2xl text-white font-semibold font-mono">
              {poolName}
            </h1>
          </div>
          <p className="text-xs text-white/50 mt-1 font-mono">{pool.address}</p>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="p-3">
            <div className="flex items-center gap-4 mb-1">
              <h3 className="font-semibold font-mono text-white">
                Total Value Locked
              </h3>
              <InfoTooltip
                label="USD value of assets in this pool."
                side="top"
              />
            </div>
            <div className="text-white font-mono text-lg">
              {formatFiat(tvlUSD)}
            </div>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-4 mb-1">
              <h3 className="font-semibold font-mono text-white">
                Your Deposit
              </h3>
              <InfoTooltip label="Your current deposit amount." side="top" />
            </div>
            <div className="text-white font-mono text-lg">
              {formatAmount(poolWithData?.userDeposit)}
              {""}
              <span className="text-white/70">{tokenSymbol}</span>
            </div>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-4 mb-1">
              <h3 className="font-semibold font-mono text-white">Base APR</h3>
              <InfoTooltip
                label="Estimated base APR for this pool."
                side="top"
              />
            </div>
            <div className="text-white font-mono text-lg">{baseAPR}</div>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-4 mb-1">
              <h3 className="font-semibold font-mono text-white">Boost APR</h3>
              <InfoTooltip
                label="Additional APR from STEAM boosts."
                side="top"
              />
            </div>
            <div className="text-white font-mono text-lg">{boostAPR}</div>
          </div>
        </div>

        {/* Chart */}
        <div className="mt-2">
          <div className="p-2 w-full">
            <div className="h-[340px] sm:h-[420px]">
              <HistoricalDataChart marketId={marketId} />
            </div>
          </div>
        </div>

        {/* Actions + Contract info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-3">
          <div className="lg:col-span-2 h-full">
            <ActionTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              depositAmount={depositAmount}
              setDepositAmount={setDepositAmount}
              withdrawAmount={withdrawAmount}
              setWithdrawAmount={setWithdrawAmount}
              tokenBalance={
                tokenBalance as ReadonlyArray<ContractReadResult> | undefined
              }
              poolWithData={poolWithData}
              tokenSymbol={tokenSymbol || ""}
              error={error}
              isConnected={isConnected}
              isDepositLoading={isDepositLoading}
              isApproveLoading={isApproveLoading}
              isWithdrawLoading={isWithdrawLoading}
              isClaimLoading={isClaimLoading}
              handleDeposit={handleDeposit}
              handleWithdraw={handleWithdraw}
              handleClaimRewards={handleClaimRewards}
              handleMaxDeposit={handleMaxDeposit}
              handleMaxWithdraw={handleMaxWithdraw}
              formatAmount={formatAmount}
            />
          </div>
          <div className="lg:col-span-1 h-full">
            <ContractInfoSection pool={pool} market={market} />
          </div>
        </div>
      </main>
    </div>
  );
}
