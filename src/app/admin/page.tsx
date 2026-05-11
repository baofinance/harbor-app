"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
 useAccount,
 useWriteContract,
 useReadContract,
 useContractReads,
 usePublicClient,
} from "wagmi";
import { parseEther, formatEther, formatUnits } from "viem";
import { markets } from "../../config/markets";
import { ConnectWallet } from "@/components/Wallet";
import Link from "next/link";
import { formatTimeRemaining } from "@/utils/formatters";

import {
  MINTER_FEES_READS_ABI,
  ADMIN_MINTER_ABI,
  MOCK_PRICE_FEED_ABI,
  STABILITY_POOL_REWARDS_ABI,
  STABILITY_POOL_MANAGER_ABI,
} from "@/abis/admin";
import { ERC20_ABI } from "@/abis/shared";

// Add a helper function to safely parse numbers
const safeParseEther = (value: string): bigint => {
 try {
 // Remove any non-numeric characters except decimal point
 const cleanValue = value.replace(/[^\d.]/g,"");
 // Ensure the value is a valid number
 if (!cleanValue || isNaN(Number(cleanValue))) {
 return BigInt(0);
 }
 return parseEther(cleanValue);
 } catch (error) {
 return BigInt(0);
 }
};

/** Human-readable token amount using on-chain decimals (not always 18). */
function formatTokenAmount(
  value: bigint,
  decimals: number,
  maxFrac = 6
): string {
  const d = Math.min(255, Math.max(0, Math.floor(decimals)));
  const s = formatUnits(value, d);
  if (maxFrac <= 0 || !s.includes(".")) return s;
  const [whole, frac = ""] = s.split(".");
  const trimmed = frac.slice(0, maxFrac).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export default function Admin() {
 const { isConnected, address } = useAccount();
 const [mounted, setMounted] = useState(false);
 const [feeReceiver, setFeeReceiver] = useState("");
 const [reservePool, setReservePool] = useState("");
 const [priceOracle, setPriceOracle] = useState("");
 const [freeMintCollateralAmount, setFreeMintCollateralAmount] = useState("");
 const [freeMintLeveragedAmount, setFreeMintLeveragedAmount] = useState("");
 const [
 freeMintLeveragedCollateralAmount,
 setFreeMintLeveragedCollateralAmount,
 ] = useState("");
 const [freeRedeemAmount, setFreeRedeemAmount] = useState("");
 const [freeSwapAmount, setFreeSwapAmount] = useState("");
 const [freeRedeemLeveragedAmount, setFreeRedeemLeveragedAmount] =
 useState("");
 const [receiverAddress, setReceiverAddress] = useState("");
 const [approvalAmount, setApprovalAmount] = useState("");
 const [isApproving, setIsApproving] = useState(false);
 const [selectedMarketIds, setSelectedMarketIds] = useState<Set<string>>(
   () => new Set()
 );
 const selectionTouchedRef = useRef(false);
 const [harvestError, setHarvestError] = useState<string | null>(null);
 const [harvestSuccess, setHarvestSuccess] = useState<string | null>(null);
 const [harvestProgress, setHarvestProgress] = useState<{
   phase: "confirm" | "mining";
   step: number;
   total: number;
 } | null>(null);
 useEffect(() => {
 setMounted(true);
 }, []);

 // ---------------------------------------------------------------------------
 // Fees + Harvestable summary (per market) - shown above "System Controls"
 // ---------------------------------------------------------------------------
 const marketOptions = useMemo(
   () =>
     Object.entries(markets)
       .filter(([, m]) => (m as any)?.addresses?.minter)
       .map(([id, m]) => ({
         id,
         name: (m as any)?.name ?? id,
         minter: (m as any)?.addresses?.minter as `0x${string}`,
       })),
   []
 );

 const { spmReadContracts, spmMarketIndices } = useMemo(() => {
   const contracts: Array<{
     address: `0x${string}`;
     abi: typeof STABILITY_POOL_MANAGER_ABI;
     functionName: "harvestable" | "harvestBountyRatio" | "harvestCutRatio";
   }> = [];
   const spmMarketIndices: number[] = [];
   marketOptions.forEach((m, i) => {
     const spm = (markets as any)[m.id]?.addresses
       ?.stabilityPoolManager as `0x${string}` | undefined;
     if (!spm) return;
     spmMarketIndices.push(i);
     contracts.push(
       {
         address: spm,
         abi: STABILITY_POOL_MANAGER_ABI,
         functionName: "harvestable",
       },
       {
         address: spm,
         abi: STABILITY_POOL_MANAGER_ABI,
         functionName: "harvestBountyRatio",
       },
       {
         address: spm,
         abi: STABILITY_POOL_MANAGER_ABI,
         functionName: "harvestCutRatio",
       }
     );
   });
   return { spmReadContracts: contracts, spmMarketIndices };
 }, [marketOptions]);

  const poolOptions = Object.entries(markets).flatMap(([id, m]) => {
    const marketName = (m as any)?.name ?? id;
    const collateralPool = (m as any)?.addresses?.stabilityPoolCollateral as
      | `0x${string}`
      | undefined;
    const sailPool = (m as any)?.addresses?.stabilityPoolLeveraged as
      | `0x${string}`
      | undefined;
    const pools: Array<{
      id: string;
      marketId: string;
      marketName: string;
      poolType: "collateral" | "sail";
      address: `0x${string}`;
    }> = [];
    if (collateralPool) {
      pools.push({
        id: `${id}-collateral`,
        marketId: id,
        marketName,
        poolType: "collateral",
        address: collateralPool,
      });
    }
    if (sailPool) {
      pools.push({
        id: `${id}-sail`,
        marketId: id,
        marketName,
        poolType: "sail",
        address: sailPool,
      });
    }
    return pools;
  });

 const minterReads = marketOptions.flatMap((m) => [
   { address: m.minter, abi: MINTER_FEES_READS_ABI, functionName: "harvestable" as const },
   { address: m.minter, abi: MINTER_FEES_READS_ABI, functionName: "feeReceiver" as const },
   { address: m.minter, abi: MINTER_FEES_READS_ABI, functionName: "WRAPPED_COLLATERAL_TOKEN" as const },
 ]);

 const { data: minterReadData, isLoading: isLoadingMinterReads, refetch: refetchMinterReads } = useContractReads({
   contracts: minterReads,
   query: {
     enabled: mounted && isConnected && minterReads.length > 0,
     refetchInterval: 30000,
     staleTime: 15000,
     retry: 1,
     allowFailure: true,
   } as any,
 });

 const { data: spmReadData, isLoading: isLoadingSpmReads, refetch: refetchSpmReads } =
   useContractReads({
     contracts: spmReadContracts,
     query: {
       enabled:
         mounted &&
         isConnected &&
         spmReadContracts.length > 0,
       refetchInterval: 30000,
       staleTime: 15000,
       retry: 1,
       allowFailure: true,
     } as any,
   });

  const { data: poolRewardTokensData, isLoading: isLoadingPoolRewardTokens } =
    useContractReads({
      contracts: poolOptions.map((p) => ({
        address: p.address,
        abi: STABILITY_POOL_REWARDS_ABI,
        functionName: "activeRewardTokens" as const,
      })),
      query: {
        enabled: mounted && isConnected && poolOptions.length > 0,
        refetchInterval: 30000,
        staleTime: 15000,
        retry: 1,
        allowFailure: true,
      } as any,
    });

  const poolRewardTokens = useMemo(() => {
    return poolOptions.map((_, idx) => {
      const res = poolRewardTokensData?.[idx];
      if (res?.status === "success" && Array.isArray(res.result)) {
        return res.result as `0x${string}`[];
      }
      return [] as `0x${string}`[];
    });
  }, [poolOptions, poolRewardTokensData]);

  const rewardDataMeta = useMemo(() => {
    const meta: Array<{
      poolIndex: number;
      rewardToken: `0x${string}`;
      contract: {
        address: `0x${string}`;
        abi: typeof STABILITY_POOL_REWARDS_ABI;
        functionName: "rewardData";
        args: [`0x${string}`];
      };
    }> = [];
    poolRewardTokens.forEach((tokens, poolIndex) => {
      tokens.forEach((token) => {
        meta.push({
          poolIndex,
          rewardToken: token,
          contract: {
            address: poolOptions[poolIndex].address,
            abi: STABILITY_POOL_REWARDS_ABI,
            functionName: "rewardData",
            args: [token],
          },
        });
      });
    });
    return meta;
  }, [poolRewardTokens, poolOptions]);

  const { data: rewardDataReads, isLoading: isLoadingRewardData } =
    useContractReads({
      contracts: rewardDataMeta.map((m) => m.contract),
      query: {
        enabled: mounted && isConnected && rewardDataMeta.length > 0,
        refetchInterval: 30000,
        staleTime: 15000,
        retry: 1,
        allowFailure: true,
      } as any,
    });

  const poolStreamingRows = useMemo(() => {
    const maxFinishByPool = new Map<number, bigint>();
    rewardDataMeta.forEach((meta, idx) => {
      const res = rewardDataReads?.[idx];
      const tuple = res?.status === "success" ? res.result : undefined;
      const finishAt =
        Array.isArray(tuple) && tuple.length > 1
          ? (tuple[1] as bigint)
          : 0n;
      const current = maxFinishByPool.get(meta.poolIndex) ?? 0n;
      if (finishAt > current) {
        maxFinishByPool.set(meta.poolIndex, finishAt);
      }
    });

    const now = new Date();
    return poolOptions.map((pool, idx) => {
      const finishAt = maxFinishByPool.get(idx) ?? 0n;
      const timeLeft =
        finishAt > 0n
          ? formatTimeRemaining(
              new Date(Number(finishAt) * 1000).toISOString(),
              now
            )
          : "-";
      return {
        ...pool,
        finishAt,
        timeLeft,
      };
    });
  }, [poolOptions, rewardDataMeta, rewardDataReads]);

 const feeBalanceReads = (minterReadData
   ? marketOptions
       .map((m, i) => {
         const base = i * 3;
         const feeReceiver =
           minterReadData?.[base + 1]?.status === "success"
             ? (minterReadData?.[base + 1]?.result as `0x${string}` | undefined)
             : undefined;
         const wrappedToken =
           minterReadData?.[base + 2]?.status === "success"
             ? (minterReadData?.[base + 2]?.result as `0x${string}` | undefined)
             : undefined;
         if (!feeReceiver || !wrappedToken) return null;
         return {
           marketIndex: i,
           wrappedToken,
           feeReceiver,
           contract: {
             address: wrappedToken,
             abi: ERC20_ABI,
             functionName: "balanceOf" as const,
             args: [feeReceiver],
           },
         };
       })
       .filter((x): x is NonNullable<typeof x> => !!x)
   : []);

 const { data: feeBalanceData, isLoading: isLoadingFeeBalances, refetch: refetchFeeBalances } = useContractReads({
   contracts: feeBalanceReads.map((x) => x.contract),
   query: {
     enabled: mounted && isConnected && feeBalanceReads.length > 0,
     refetchInterval: 30000,
     staleTime: 15000,
     retry: 1,
     allowFailure: true,
   } as any,
 });

 const wrappedDecimalsReads = (minterReadData
   ? marketOptions
       .map((m, i) => {
         const base = i * 3;
         const wrappedToken =
           minterReadData?.[base + 2]?.status === "success"
             ? (minterReadData?.[base + 2]?.result as `0x${string}` | undefined)
             : undefined;
         if (!wrappedToken) return null;
         return {
           marketIndex: i,
           contract: {
             address: wrappedToken,
             abi: ERC20_ABI,
             functionName: "decimals" as const,
           },
         };
       })
       .filter((x): x is NonNullable<typeof x> => !!x)
   : []);

 const { data: wrappedDecimalsData, isLoading: isLoadingWrappedDecimals, refetch: refetchWrappedDecimals } =
   useContractReads({
     contracts: wrappedDecimalsReads.map((x) => x.contract),
     query: {
       enabled:
         mounted && isConnected && wrappedDecimalsReads.length > 0,
       refetchInterval: 30000,
       staleTime: 15000,
       retry: 1,
       allowFailure: true,
     } as any,
   });

 const RATIO_DEN = 10n ** 18n;

 const feesTableRows = useMemo(() => {
   const decimalsByMarketIndex = new Map<number, number>();
   wrappedDecimalsReads.forEach((meta, idx) => {
     const res = wrappedDecimalsData?.[idx];
     const raw =
       res?.status === "success" && res.result !== undefined && res.result !== null
         ? Number(res.result as number | bigint)
         : 18;
     const d = Number.isFinite(raw) && raw >= 0 && raw <= 255 ? Math.floor(raw) : 18;
     decimalsByMarketIndex.set(meta.marketIndex, d);
   });

   const feeBalByMarketIndex = new Map<number, bigint>();
   feeBalanceReads.forEach((meta, idx) => {
     const res = feeBalanceData?.[idx];
     const bal =
       res?.status === "success" && res.result !== undefined && res.result !== null
         ? (res.result as bigint)
         : 0n;
     feeBalByMarketIndex.set(meta.marketIndex, bal);
   });

   const spmByMarketId = new Map<
     string,
     {
       spmAddress: `0x${string}`;
       spmHarvestable: bigint;
       bountyRatio: bigint;
       cutRatio: bigint;
       expectedBounty: bigint;
       expectedCut: bigint;
       expectedToPools: bigint;
       minBounty: bigint;
     }
   >();

   spmMarketIndices.forEach((mi, j) => {
     const m = marketOptions[mi];
     const base = j * 3;
     const r0 = spmReadData?.[base];
     const r1 = spmReadData?.[base + 1];
     const r2 = spmReadData?.[base + 2];
     const h =
       r0?.status === "success" && r0.result != null ? (r0.result as bigint) : 0n;
     const br =
       r1?.status === "success" && r1.result != null ? (r1.result as bigint) : 0n;
     const cr =
       r2?.status === "success" && r2.result != null ? (r2.result as bigint) : 0n;
     const spmAddress = (markets as any)[m.id]?.addresses
       ?.stabilityPoolManager as `0x${string}`;
     const expectedBounty = (h * br) / RATIO_DEN;
     const expectedCut = (h * cr) / RATIO_DEN;
     const expectedToPools =
       h > expectedBounty + expectedCut ? h - expectedBounty - expectedCut : 0n;
     const minBounty = (expectedBounty * 995n) / 1000n;
     spmByMarketId.set(m.id, {
       spmAddress,
       spmHarvestable: h,
       bountyRatio: br,
       cutRatio: cr,
       expectedBounty,
       expectedCut,
       expectedToPools,
       minBounty,
     });
   });

   return marketOptions.map((m, i) => {
     const base = i * 3;
     const minterHarvestable =
       minterReadData?.[base]?.status === "success"
         ? (minterReadData?.[base]?.result as bigint | undefined)
         : undefined;
     const feeReceiver =
       minterReadData?.[base + 1]?.status === "success"
         ? (minterReadData?.[base + 1]?.result as `0x${string}` | undefined)
         : undefined;
     const wrappedToken =
       minterReadData?.[base + 2]?.status === "success"
         ? (minterReadData?.[base + 2]?.result as `0x${string}` | undefined)
         : undefined;
     const feeBalance = feeBalByMarketIndex.get(i) ?? 0n;
     const mHarv = minterHarvestable ?? 0n;
     const total = feeBalance + mHarv;

     const spm = spmByMarketId.get(m.id);
     const addrs = (markets as any)[m.id]?.addresses;
     const marketMeta = (markets as any)[m.id];
     const collateralSymbol =
       (marketMeta?.collateral?.symbol as string | undefined) ?? "collateral";
     const wrappedDecimals = decimalsByMarketIndex.get(i) ?? 18;
     const hasSpmConfig = !!(addrs as any)?.stabilityPoolManager;
     const spmH = spm?.spmHarvestable ?? 0n;
     return {
       ...m,
       minterHarvestable: mHarv,
       feeReceiver,
       wrappedToken,
       feeBalance,
       total,
       collateralSymbol,
       wrappedDecimals,
       hasSpmConfig,
       spmAddress: spm?.spmAddress,
       spmHarvestable: spmH,
       harvestBountyRatio: spm?.bountyRatio ?? 0n,
       harvestCutRatio: spm?.cutRatio ?? 0n,
       expectedBounty: spm?.expectedBounty ?? 0n,
       expectedCut: spm?.expectedCut ?? 0n,
       expectedToPools: spm?.expectedToPools ?? 0n,
       minBounty: spm?.minBounty ?? 0n,
       poolCollateral: addrs?.stabilityPoolCollateral as `0x${string}` | undefined,
       poolLeveraged: addrs?.stabilityPoolLeveraged as `0x${string}` | undefined,
       canCheck: hasSpmConfig && spmH > 0n,
     };
   });
 }, [
   marketOptions,
   minterReadData,
   feeBalanceData,
   feeBalanceReads,
   spmReadData,
   spmMarketIndices,
   wrappedDecimalsReads,
   wrappedDecimalsData,
 ]);

 // Get the minter address from the first market
 const minterAddress = (markets as any)[Object.keys(markets)[0]].addresses
 .minter as `0x${string}`;
 const publicClient = usePublicClient();

 const checkableRowIds = useMemo(
   () => feesTableRows.filter((r) => r.canCheck).map((r) => r.id),
   [feesTableRows]
 );

 const selectAllInputRef = useRef<HTMLInputElement>(null);
 const selectedInCheckable = useMemo(() => {
   return checkableRowIds.filter((id) => selectedMarketIds.has(id));
 }, [checkableRowIds, selectedMarketIds]);
 const allCheckableSelected =
   checkableRowIds.length > 0 &&
   selectedInCheckable.length === checkableRowIds.length;
 const someCheckableSelected =
   selectedInCheckable.length > 0 && !allCheckableSelected;

 useEffect(() => {
   const el = selectAllInputRef.current;
   if (!el) return;
   el.indeterminate = someCheckableSelected;
 }, [someCheckableSelected]);

 useEffect(() => {
   if (!mounted || !isConnected) return;
   if (
     isLoadingMinterReads ||
     isLoadingSpmReads ||
     isLoadingFeeBalances ||
     isLoadingWrappedDecimals
   )
     return;
   if (selectionTouchedRef.current) return;
   setSelectedMarketIds(
     new Set(feesTableRows.filter((r) => r.canCheck).map((r) => r.id))
   );
 }, [
   mounted,
   isConnected,
   isLoadingMinterReads,
   isLoadingSpmReads,
   isLoadingFeeBalances,
   isLoadingWrappedDecimals,
   feesTableRows,
 ]);

 const harvestTargetRows = useMemo(() => {
   const set = new Set(
     feesTableRows
       .filter((r) => r.canCheck && selectedMarketIds.has(r.id))
       .map((r) => r.id)
   );
   return [...set]
     .sort()
     .map((id) => feesTableRows.find((r) => r.id === id))
     .filter((r): r is (typeof feesTableRows)[0] => !!r);
 }, [feesTableRows, selectedMarketIds]);

 const harvestSummary = useMemo(() => {
   const totalsByDenom = new Map<
     string,
     { symbol: string; decimals: number; sumB: bigint; sumC: bigint; sumP: bigint }
   >();
   for (const r of harvestTargetRows) {
     const key = `${r.collateralSymbol}:${r.wrappedDecimals}`;
     let b = totalsByDenom.get(key);
     if (!b) {
       b = {
         symbol: r.collateralSymbol,
         decimals: r.wrappedDecimals,
         sumB: 0n,
         sumC: 0n,
         sumP: 0n,
       };
       totalsByDenom.set(key, b);
     }
     b.sumB += r.expectedBounty;
     b.sumC += r.expectedCut;
     b.sumP += r.expectedToPools;
   }
   const cutReceivers = new Map<`0x${string}`, string[]>();
   harvestTargetRows.forEach((r) => {
     if (!r.feeReceiver) return;
     const list = cutReceivers.get(r.feeReceiver) ?? [];
     list.push(r.name);
     cutReceivers.set(r.feeReceiver, list);
   });
   const totalsByDenomList = [...totalsByDenom.values()].sort((a, b) =>
     a.symbol.localeCompare(b.symbol)
   );
   return { totalsByDenomList, cutReceivers };
 }, [harvestTargetRows]);

 // Contract writes
 const {
 writeContract: updateFeeReceiverWrite,
 data: updateFeeReceiverHash,
 isPending: isUpdatingFeeReceiver,
 } = useWriteContract();
 const {
   writeContractAsync,
   isPending: isHarvestSubmitting,
 } = useWriteContract();
 const {
 writeContract: updateReservePoolWrite,
 data: updateReservePoolHash,
 isPending: isUpdatingReservePool,
 } = useWriteContract();
 const {
 writeContract: updatePriceOracleWrite,
 data: updatePriceOracleHash,
 isPending: isUpdatingPriceOracle,
 } = useWriteContract();
 const {
 writeContract: writeFreeMintPeggedToken,
 data: mintPeggedHash,
 isPending: isMintingPegged,
 } = useWriteContract();
 const {
 writeContract: freeRedeemPeggedToken,
 data: redeemPeggedHash,
 isPending: isRedeemingPegged,
 } = useWriteContract();
 const {
 writeContract: freeSwapPeggedForLeveraged,
 data: swapHash,
 isPending: isSwapping,
 } = useWriteContract();
 const {
 writeContract: writeFreeMintLeveragedToken,
 data: mintLeveragedHash,
 isPending: isMintingLeveraged,
 } = useWriteContract();
 const {
 writeContract: freeRedeemLeveragedToken,
 data: redeemLeveragedHash,
 isPending: isRedeemingLeveraged,
 } = useWriteContract();
 const {
 writeContract: approve,
 data: approveHash,
 isPending: isApprovingWrite,
 } = useWriteContract();
 const {
 writeContract: updatePriceFeed,
 data: updatePriceHash,
 isPending: isUpdatingPrice,
 } = useWriteContract();

 // Check if user has admin role
 const { data: zeroFeeRole } = useReadContract({
 address: minterAddress,
 abi: ADMIN_MINTER_ABI,
 functionName:"ZERO_FEE_ROLE",
 });

 // Add contract reads for allowance
 const { data: allowance } = useReadContract({
 address: (markets as any)[Object.keys(markets)[0]].addresses
 .collateralToken as `0x${string}`,
 abi: ERC20_ABI,
 functionName:"allowance",
 args: [address as `0x${string}`, minterAddress],
 });

 const handleUpdateFeeReceiver = () => {
 if (feeReceiver) {
 updateFeeReceiverWrite({
 address: minterAddress,
 abi: ADMIN_MINTER_ABI,
 functionName:"updateFeeReceiver",
 args: [feeReceiver as `0x${string}`],
 });
 }
 };

 const handleUpdateReservePool = () => {
 if (reservePool) {
 updateReservePoolWrite({
 address: minterAddress,
 abi: ADMIN_MINTER_ABI,
 functionName:"updateReservePool",
 args: [reservePool as `0x${string}`],
 });
 }
 };

 const handleUpdatePriceOracle = () => {
 if (priceOracle) {
 updatePriceOracleWrite({
 address: minterAddress,
 abi: ADMIN_MINTER_ABI,
 functionName:"updatePriceOracle",
 args: [priceOracle as `0x${string}`],
 });
 }
 };

 const handleFreeMintPeggedToken = async () => {
 if (!isConnected || !address) {
 console.error("Wallet not connected");
 return;
 }

 if (!freeMintCollateralAmount || !receiverAddress) {
 console.error("Missing amount or receiver address");
 return;
 }

 try {
 const parsedAmount = safeParseEther(freeMintCollateralAmount);
 if (parsedAmount === BigInt(0)) {
 console.error("Invalid amount");
 return;
 }

 console.log("Minting pegged token with:", {
 amount: freeMintCollateralAmount,
 parsedAmount: parsedAmount.toString(),
 receiver: receiverAddress,
 minter: minterAddress,
 allowance: allowance?.toString(),
 });

 writeFreeMintPeggedToken({
 address: minterAddress,
 abi: ADMIN_MINTER_ABI,
 functionName:"freeMintPeggedToken",
 args: [parsedAmount, receiverAddress as `0x${string}`],
 });
 } catch (error) {
 console.error("Error minting pegged token:", error);
 }
 };

 const handleFreeRedeemPeggedToken = () => {
 if (freeRedeemAmount && receiverAddress) {
 freeRedeemPeggedToken({
 address: minterAddress,
 abi: ADMIN_MINTER_ABI,
 functionName:"freeRedeemPeggedToken",
 args: [parseEther(freeRedeemAmount), receiverAddress as `0x${string}`],
 });
 }
 };

 const handleFreeSwapPeggedForLeveraged = () => {
 if (freeSwapAmount && receiverAddress) {
 freeSwapPeggedForLeveraged({
 address: minterAddress,
 abi: ADMIN_MINTER_ABI,
 functionName:"freeSwapPeggedForLeveraged",
 args: [parseEther(freeSwapAmount), receiverAddress as `0x${string}`],
 });
 }
 };

 const handleFreeMintLeveragedToken = async () => {
 if (!isConnected || !address) {
 console.error("Wallet not connected");
 return;
 }

 if (!freeMintLeveragedCollateralAmount || !receiverAddress) {
 console.error("Missing amount or receiver address");
 return;
 }

 try {
 const parsedAmount = safeParseEther(freeMintLeveragedCollateralAmount);
 if (parsedAmount === BigInt(0)) {
 console.error("Invalid amount");
 return;
 }

 console.log("Minting leveraged token with:", {
 amount: freeMintLeveragedCollateralAmount,
 parsedAmount: parsedAmount.toString(),
 receiver: receiverAddress,
 minter: minterAddress,
 allowance: allowance?.toString(),
 });

 writeFreeMintLeveragedToken({
 address: minterAddress,
 abi: ADMIN_MINTER_ABI,
 functionName:"freeMintLeveragedToken",
 args: [parsedAmount, receiverAddress as `0x${string}`],
 });
 } catch (error) {
 console.error("Error minting leveraged token:", error);
 }
 };

 const handleFreeRedeemLeveragedToken = () => {
 if (freeRedeemLeveragedAmount && receiverAddress) {
 freeRedeemLeveragedToken({
 address: minterAddress,
 abi: ADMIN_MINTER_ABI,
 functionName:"freeRedeemLeveragedToken",
 args: [
 parseEther(freeRedeemLeveragedAmount),
 receiverAddress as `0x${string}`,
 ],
 });
 }
 };

 // Update the approval handler
 const handleApprove = () => {
 if (approvalAmount) {
 setIsApproving(true);
 approve({
 address: (markets as any)[Object.keys(markets)[0]].addresses
 .collateralToken as `0x${string}`,
 abi: ERC20_ABI,
 functionName:"approve",
 args: [minterAddress, safeParseEther(approvalAmount)],
 });
 // Reset the state after a short delay
 setTimeout(() => {
 setIsApproving(false);
 setApprovalAmount("");
 }, 5000);
 }
 };

 const handleUpdatePriceFeed = () => {
 updatePriceFeed({
 address: (markets as any)[Object.keys(markets)[0]].addresses
 .priceOracle as `0x${string}`,
 abi: MOCK_PRICE_FEED_ABI,
 functionName:"updatePrice",
 });
 };

 const handleBatchHarvest = async () => {
   setHarvestError(null);
   setHarvestSuccess(null);
   if (!address) {
     setHarvestError("Connect wallet");
     return;
   }
   if (harvestTargetRows.length === 0) {
     setHarvestError("No markets with pool harvestable selected.");
     return;
   }
   if (!publicClient) {
     setHarvestError("Missing public client");
     return;
   }
   const toHarvest = harvestTargetRows.filter((r) => r.spmAddress);
   if (toHarvest.length === 0) {
     setHarvestError("No StabilityPoolManager address for the selected markets.");
     return;
   }
   const total = toHarvest.length;
   try {
     for (let i = 0; i < toHarvest.length; i++) {
       const row = toHarvest[i];
       const step = i + 1;
       setHarvestProgress({
         phase: "confirm",
         step,
         total,
       });
       const hash = await writeContractAsync({
         address: row.spmAddress,
         abi: STABILITY_POOL_MANAGER_ABI,
         functionName: "harvest",
         args: [address, row.minBounty],
       });
       setHarvestProgress({
         phase: "mining",
         step,
         total,
       });
       await publicClient.waitForTransactionReceipt({ hash });
     }
     setHarvestSuccess(
       `Harvest complete: ${total} market${total === 1 ? "" : "s"}.`
     );
     await Promise.all([
       refetchMinterReads(),
       refetchSpmReads(),
       refetchFeeBalances(),
       refetchWrappedDecimals(),
     ]);
   } catch (e: unknown) {
     const message = e instanceof Error ? e.message : String(e);
     if (message.includes("NoHarvestable")) {
       setHarvestError("NoHarvestable: no harvestable amount available.");
     } else if (message.includes("InsufficientBounty")) {
       setHarvestError(
         "InsufficientBounty: preview became stale or minBounty is too high."
       );
     } else {
       setHarvestError(message);
     }
   } finally {
     setHarvestProgress(null);
   }
 };

 const harvestInFlight = harvestProgress !== null;
 const harvestActionDisabled =
   !isConnected ||
   !address ||
   harvestTargetRows.length === 0 ||
   harvestInFlight;

 // Return a placeholder during server-side rendering
 if (!mounted) {
 return (
 <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
 <main className="container mx-auto px-4 sm:px-10 pt-[6rem] pb-6 relative z-10">
 <div className="mb-6">
 <h1
 className={`text-4xl font-medium font-geo text-left text-white`}
 >
 ADMIN
 </h1>
 </div>
 <div className="bg-zinc-900/50 p-6 text-center">
 <p className="mb-4 text-white/70">
 Please connect your wallet to access admin functions
 </p>
 <div className="inline-block">
 <ConnectWallet />
 </div>
 </div>
 </main>
 </div>
 );
 }

 return (
 <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
 <main className="container mx-auto px-4 sm:px-10 pt-[6rem] pb-6 relative z-10">
 <div className="mb-6">
 <h1 className={`text-4xl font-medium font-geo text-left text-white`}>
 ADMIN
 </h1>
 </div>

 {!isConnected ? (
 <div className="bg-zinc-900/50 p-6 text-center">
 <p className="mb-4 text-white/70">
 Please connect your wallet to access admin functions
 </p>
 <div className="inline-block">
 <ConnectWallet />
 </div>
 </div>
 ) : (
  <div className="space-y-4">
    {/* Rewards Streaming (per pool) */}
    <div className="bg-zinc-900/50 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h2 className="text-lg font-medium text-white font-geo">
            Rewards Streaming (per stability pool)
          </h2>
          <div className="text-xs text-white/60 mt-1">
            Time remaining until the current reward stream finishes.
          </div>
        </div>
        {(isLoadingPoolRewardTokens || isLoadingRewardData) && (
          <div className="text-xs text-white/60">Loading…</div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-white/60 border-b border-white/10">
              <th className="text-left py-2 pr-4">Market</th>
              <th className="text-left py-2 pr-4">Pool</th>
              <th className="text-right py-2">Time left</th>
            </tr>
          </thead>
          <tbody>
            {poolStreamingRows.map((row) => (
              <tr key={row.id} className="border-t border-white/5">
                <td className="py-2 pr-4 text-white">{row.marketName}</td>
                <td className="py-2 pr-4 text-white capitalize">
                  {row.poolType === "collateral" ? "Anchor" : "Sail"}
                </td>
                <td className="py-2 text-right text-white font-mono">
                  {row.timeLeft}
                </td>
              </tr>
            ))}
            {poolStreamingRows.length === 0 && (
              <tr>
                <td className="py-3 text-xs text-white/60" colSpan={3}>
                  No pools found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Fees & Harvestable + batch pool harvest */}
    <div className="bg-zinc-900/50 p-4 sm:p-6 flex flex-col min-h-0">
     <div className="flex items-center justify-between gap-4 mb-3">
       <div>
         <h2 className="text-lg font-medium text-white font-geo">
           Fees & Harvestable
         </h2>
         <div className="text-xs text-white/60 mt-1 max-w-xl">
           Minter <span className="font-mono">harvestable()</span> and wrapped
           token balance at <span className="font-mono">feeReceiver()</span>.
           Pool yield uses StabilityPoolManager
           <span className="font-mono"> harvestable()</span> (aligns with{" "}
           <span className="font-mono">harvest()</span>). Numeric columns use
           each market&apos;s wrapped collateral token (e.g.{" "}
           <span className="font-mono">wstETH</span> vs{" "}
           <span className="font-mono">fxSAVE</span>) with{" "}
           <span className="font-mono">decimals()</span> read on-chain — do not
           mix amounts across different tokens.
         </div>
       </div>
       {(isLoadingMinterReads ||
         isLoadingFeeBalances ||
         isLoadingSpmReads ||
         isLoadingWrappedDecimals) && (
         <div className="text-xs text-white/60">Loading…</div>
       )}
     </div>

     <div className="min-h-0 max-h-[min(55vh,560px)] overflow-auto rounded border border-white/10">
       <table className="w-full text-sm border-collapse min-w-[720px]">
         <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur">
           <tr className="text-xs text-white/60 border-b border-white/10">
             <th className="text-left py-2.5 pl-2 pr-2 w-10">
               <input
                 ref={selectAllInputRef}
                 type="checkbox"
                 className="h-3.5 w-3.5 align-middle"
                 checked={allCheckableSelected}
                 onChange={() => {
                   selectionTouchedRef.current = true;
                   setSelectedMarketIds((prev) => {
                     if (allCheckableSelected) {
                       const n = new Set(prev);
                       checkableRowIds.forEach((id) => n.delete(id));
                       return n;
                     }
                     const n = new Set(prev);
                     checkableRowIds.forEach((id) => n.add(id));
                     return n;
                   });
                 }}
                 disabled={checkableRowIds.length === 0}
                 aria-label="Select all markets that can be pool-harvested"
               />
             </th>
             <th className="text-left py-2.5 pr-4">Market</th>
             <th className="text-right py-2.5 pr-3 whitespace-nowrap">
               Minter harvestable
             </th>
             <th className="text-right py-2.5 pr-3 whitespace-nowrap">
               Pool yield (SPM)
             </th>
             <th className="text-right py-2.5 pr-3">Fees</th>
             <th className="text-right py-2.5 pr-3">Total</th>
             <th className="text-left py-2.5 pr-2 min-w-[7rem]">Fee recv.</th>
             <th className="text-left py-2.5 pl-1 w-8" />
           </tr>
           <tr className="text-[10px] text-white/45 border-b border-white/10">
             <th colSpan={8} className="text-left font-normal py-1.5 pl-2 pr-2">
               Units per row: wrapped collateral amount + symbol (decimals from
               token contract).
             </th>
           </tr>
         </thead>
         <tbody>
           {feesTableRows.map((r, i) => {
             const short = (a: `0x${string}` | undefined) =>
               a
                 ? `${a.slice(0, 6)}…${a.slice(-4)}`
                 : "—";
             const rowSel = selectedMarketIds.has(r.id);
             return (
               <tr
                 key={r.id}
                 className={`border-t border-white/5 ${
                   i % 2 ? "bg-white/[0.02]" : ""
                 }`}
               >
                 <td className="py-2 pl-2 pr-1 align-top">
                   <input
                     type="checkbox"
                     className="h-3.5 w-3.5 mt-0.5"
                     checked={rowSel}
                     disabled={!r.canCheck}
                     title={
                       !r.hasSpmConfig
                         ? "Not configured for pool harvest on this market"
                         : r.spmHarvestable === 0n
                         ? "No pool yield to harvest"
                         : undefined
                     }
                     onChange={() => {
                       if (!r.canCheck) return;
                       selectionTouchedRef.current = true;
                       setSelectedMarketIds((prev) => {
                         const n = new Set(prev);
                         if (n.has(r.id)) n.delete(r.id);
                         else n.add(r.id);
                         return n;
                       });
                     }}
                   />
                 </td>
                 <td className="py-2 pr-4 text-white font-medium align-top">
                   {r.name}
                 </td>
                 <td className="py-2 pr-3 text-right font-mono text-white align-top whitespace-nowrap">
                   {formatTokenAmount(r.minterHarvestable, r.wrappedDecimals)}{" "}
                   <span className="text-white/50 text-[10px]">
                     {r.collateralSymbol}
                   </span>
                 </td>
                 <td className="py-2 pr-3 text-right font-mono text-white align-top whitespace-nowrap">
                   {!r.hasSpmConfig
                     ? "—"
                     : (
                         <>
                           {formatTokenAmount(
                             r.spmHarvestable,
                             r.wrappedDecimals
                           )}{" "}
                           <span className="text-white/50 text-[10px]">
                             {r.collateralSymbol}
                           </span>
                         </>
                       )}
                 </td>
                 <td className="py-2 pr-3 text-right font-mono text-white align-top whitespace-nowrap">
                   {formatTokenAmount(r.feeBalance, r.wrappedDecimals)}{" "}
                   <span className="text-white/50 text-[10px]">
                     {r.collateralSymbol}
                   </span>
                 </td>
                 <td className="py-2 pr-3 text-right font-mono text-white align-top whitespace-nowrap">
                   {formatTokenAmount(r.total, r.wrappedDecimals)}{" "}
                   <span className="text-white/50 text-[10px]">
                     {r.collateralSymbol}
                   </span>
                 </td>
                 <td
                   className="py-2 pr-1 text-xs text-white/80 font-mono max-w-[7rem] truncate align-top"
                   title={r.feeReceiver ?? ""}
                 >
                   {r.feeReceiver ? short(r.feeReceiver) : "—"}
                 </td>
                 <td className="py-2 pl-0 align-top text-right">
                   <details className="text-xs text-harbor">
                     <summary className="cursor-pointer select-none list-none text-white/50 hover:text-white/80">
                       ⋯
                     </summary>
                     <div className="mt-2 p-2 rounded border border-white/10 bg-black/20 text-left space-y-1.5 min-w-[16rem]">
                       <div className="text-white/50 text-[10px] uppercase tracking-wide">
                         Addresses
                       </div>
                       <div className="break-all text-[11px] text-white/90">
                         <div className="text-white/50">Minter feeReceiver</div>
                         {r.feeReceiver ?? "—"}
                       </div>
                       <div className="text-[11px] text-white/80">
                         <span className="text-white/50">
                           Protocol cut (likely destination)
                         </span>
                         : Minter <span className="font-mono">feeReceiver</span>{" "}
                         above. Exact routing is enforced on-chain; cut typically
                         follows protocol config.
                       </div>
                       <div className="break-all text-[11px] text-white/90">
                         <div className="text-white/50">StabilityPoolManager</div>
                         {r.spmAddress ?? "—"}
                       </div>
                       <div className="text-white/50 text-[10px] pt-1 uppercase tracking-wide">
                         Preview (selected tx)
                       </div>
                       <div className="font-mono text-[11px] text-white/90">
                         bounty{" "}
                         {formatTokenAmount(
                           r.expectedBounty,
                           r.wrappedDecimals
                         )}{" "}
                         {r.collateralSymbol} · cut{" "}
                         {formatTokenAmount(r.expectedCut, r.wrappedDecimals)}{" "}
                         {r.collateralSymbol} · to pools{" "}
                         {formatTokenAmount(
                           r.expectedToPools,
                           r.wrappedDecimals
                         )}{" "}
                         {r.collateralSymbol}
                       </div>
                       <div className="text-white/50 text-[10px] pt-1 uppercase tracking-wide">
                         Destinations (proportional split on-chain)
                       </div>
                       <div className="text-[11px] font-mono break-all text-white/80">
                         <div>Anchor: {r.poolCollateral ?? "—"}</div>
                         <div>Sail: {r.poolLeveraged ?? "—"}</div>
                       </div>
                     </div>
                   </details>
                 </td>
               </tr>
             );
           })}
         </tbody>
       </table>
     </div>

     <div className="mt-4 shrink-0 flex flex-col lg:flex-row lg:items-stretch gap-4 border-t border-white/10 pt-4 bg-zinc-900/90">
       <div className="flex flex-col gap-2">
         <button
           onClick={handleBatchHarvest}
           disabled={
             harvestActionDisabled || isHarvestSubmitting
           }
           className="py-2.5 px-4 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-start"
         >
           {isHarvestSubmitting
             ? "Confirming…"
             : harvestInFlight
             ? `Harvesting… ${
                 harvestProgress
                   ? `${harvestProgress.step}/${harvestProgress.total}`
                   : ""
               }`
             : "Harvest (pool yield)"}
         </button>
         {harvestError && (
           <p className="text-red-400 text-sm max-w-md">{harvestError}</p>
         )}
         {harvestSuccess && !harvestError && (
           <p className="text-green-400 text-sm max-w-md">{harvestSuccess}</p>
         )}
       </div>

       <div className="flex-1 grid sm:grid-cols-2 gap-3 text-xs">
         <div className="rounded border border-white/10 bg-black/15 p-3 space-y-1.5">
           <div className="text-white/50 text-[10px] uppercase tracking-wide">
             Bounty (receiver)
           </div>
           <div className="font-mono text-white/90 break-all text-[11px]">
             {address ?? "—"}
           </div>
         </div>
         <div className="rounded border border-white/10 bg-black/15 p-3 space-y-1.5">
           <div className="text-white/50 text-[10px] uppercase tracking-wide">
             Protocol cut (likely dest.)
           </div>
           {harvestTargetRows.length === 0 ? (
             <div className="text-white/40">—</div>
           ) : harvestSummary.cutReceivers.size <= 3 ? (
             [...harvestSummary.cutReceivers.entries()].map(
               ([addr, names]) => (
                 <div key={addr} className="font-mono text-[11px] break-all text-white/90">
                   <div>{addr}</div>
                   <div className="text-white/40">{names.join(", ")}</div>
                 </div>
               )
             )
           ) : (
             <details>
               <summary className="cursor-pointer text-harbor text-[11px]">
                 {harvestSummary.cutReceivers.size} unique fee receivers
               </summary>
               <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                 {[...harvestSummary.cutReceivers.entries()].map(
                   ([addr, names]) => (
                     <div
                       key={addr}
                       className="font-mono text-[11px] break-all text-white/80"
                     >
                       {addr} ({names.join(", ")})
                     </div>
                   )
                 )}
               </div>
             </details>
           )}
         </div>
         <div className="sm:col-span-2 rounded border border-white/10 bg-black/15 p-3">
           <div className="text-white/50 text-[10px] uppercase tracking-wide mb-2">
             To pools (destinations) · selected markets
           </div>
           <div className="space-y-1">
             {harvestTargetRows.length === 0 ? (
               <div className="text-white/40">—</div>
             ) : (
               harvestTargetRows.map((m) => (
                 <details
                   key={m.id}
                   className="border border-white/5 rounded px-2 py-1.5"
                 >
                   <summary className="cursor-pointer text-white/90 text-[11px]">
                     {m.name}
                   </summary>
                   <div className="mt-1 pl-2 space-y-0.5 font-mono text-[10px] text-white/70 break-all">
                     <div>Anchor: {m.poolCollateral ?? "—"}</div>
                     <div>Sail: {m.poolLeveraged ?? "—"}</div>
                   </div>
                 </details>
               ))
             )}
           </div>
         </div>
         {harvestTargetRows.length > 0 &&
           harvestSummary.totalsByDenomList.length > 0 && (
             <div className="sm:col-span-2 space-y-2">
               {harvestSummary.totalsByDenomList.length > 1 && (
                 <p className="text-[10px] text-white/50 leading-snug">
                   Preview totals are summed per wrapped collateral token only
                   (e.g. all <span className="font-mono">wstETH</span> markets
                   together, all <span className="font-mono">fxSAVE</span>{" "}
                   together). Do not add across different symbols.
                 </p>
               )}
               {harvestSummary.totalsByDenomList.map((t) => (
                 <div
                   key={`${t.symbol}-${t.decimals}`}
                   className="font-mono text-[11px] text-white/80"
                 >
                   <span className="text-white/50">
                     {t.symbol} · {t.decimals} decimals
                   </span>
                   : Σ bounty{" "}
                   {formatTokenAmount(t.sumB, t.decimals)} · Σ cut{" "}
                   {formatTokenAmount(t.sumC, t.decimals)} · Σ to pools{" "}
                   {formatTokenAmount(t.sumP, t.decimals)}
                 </div>
               ))}
             </div>
           )}
       </div>
     </div>
   </div>

 <div className="bg-zinc-900/50 p-4 sm:p-6">
 <h2 className="text-lg font-medium text-white mb-4 font-geo">
 System Controls
 </h2>
 <div className="flex flex-wrap gap-2">
   <Link href="/admin/genesis">
     <button className="py-2 px-4 bg-harbor text-white font-medium hover:bg-harbor transition-colors">
       Genesis Admin
     </button>
   </Link>
   <Link href="/admin/fees">
     <button className="py-2 px-4 bg-harbor text-white font-medium hover:bg-harbor transition-colors">
       Mint/Redeem Fees
     </button>
   </Link>
   <Link href="/admin/rewards">
     <button className="py-2 px-4 bg-harbor text-white font-medium hover:bg-harbor transition-colors">
       Reward Deposits
     </button>
   </Link>
      <Link href="/admin/rebalancing">
        <button className="py-2 px-4 bg-harbor text-white font-medium hover:bg-harbor transition-colors">
          Rebalancing
        </button>
      </Link>
      <Link href="/admin/maiden-voyage-yield">
        <button className="py-2 px-4 bg-harbor text-white font-medium hover:bg-harbor transition-colors">
          Maiden voyage yield
        </button>
      </Link>
</div>
</div>

 <div className="bg-zinc-900/50 p-4 sm:p-6">
 <h2 className="text-lg font-medium text-white mb-4 font-geo">
 Update Fee Receiver
 </h2>
 <div className="flex flex-col sm:flex-row gap-4">
 <input
 type="text"
 value={feeReceiver}
 onChange={(e) => setFeeReceiver(e.target.value)}
 placeholder="Enter new fee receiver address"
 className="flex-1 bg-zinc-900/50 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
 />
 <button
 onClick={handleUpdateFeeReceiver}
 disabled={isUpdatingFeeReceiver}
 className="py-2 px-4 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isUpdatingFeeReceiver ?"Updating..." :"Update"}
 </button>
 </div>
 </div>

 <div className="bg-zinc-900/50 p-4 sm:p-6">
 <h2 className="text-lg font-medium text-white mb-4 font-geo">
 Update Reserve Pool
 </h2>
 <div className="flex flex-col sm:flex-row gap-4">
 <input
 type="text"
 value={reservePool}
 onChange={(e) => setReservePool(e.target.value)}
 placeholder="Enter new reserve pool address"
 className="flex-1 bg-zinc-900/50 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
 />
 <button
 onClick={handleUpdateReservePool}
 disabled={isUpdatingReservePool}
 className="py-2 px-4 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isUpdatingReservePool ?"Updating..." :"Update"}
 </button>
 </div>
 </div>

 <div className="bg-zinc-900/50 p-4 sm:p-6">
 <h2 className="text-lg font-medium text-white mb-4 font-geo">
 Update Price Oracle
 </h2>
 <div className="flex flex-col sm:flex-row gap-4">
 <input
 type="text"
 value={priceOracle}
 onChange={(e) => setPriceOracle(e.target.value)}
 placeholder="Enter new price oracle address"
 className="flex-1 bg-zinc-900/50 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
 />
 <button
 onClick={handleUpdatePriceOracle}
 disabled={isUpdatingPriceOracle}
 className="py-2 px-4 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isUpdatingPriceOracle ?"Updating..." :"Update"}
 </button>
 </div>
 </div>

 <div className="bg-zinc-900/50 p-4 sm:p-6">
 <h2 className="text-lg font-medium text-white mb-4 font-geo">
 Free Functions
 </h2>
 <div className="space-y-6">
 <div className="bg-black/10 p-4">
 <h4 className="text-base font-medium mb-3 text-white/80">
 Receiver Address
 </h4>
 <div className="space-y-3">
 <div>
 <label className="block text-sm font-medium mb-1 text-white/70">
 Address
 </label>
 <input
 type="text"
 value={receiverAddress}
 onChange={(e) => setReceiverAddress(e.target.value)}
 placeholder="Enter receiver address"
 className="w-full bg-zinc-900/50 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
 />
 </div>
 </div>
 </div>

 {/* Minting Operations */}
 <div className="space-y-4">
 <h3 className="text-lg font-medium text-white font-geo">
 Minting Operations
 </h3>

 {/* Add Approval Section */}
 <div className="bg-black/10 p-4">
 <h4 className="text-base font-medium mb-3 text-white/80">
 Approve Collateral Token
 </h4>
 <div className="space-y-3">
 <div>
 <label className="block text-sm font-medium mb-1 text-white/70">
 Amount to Approve
 </label>
 <input
 type="number"
 value={approvalAmount}
 onChange={(e) => setApprovalAmount(e.target.value)}
 placeholder="Enter amount to approve"
 className="w-full bg-zinc-900/50 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
 />
 </div>
 <div className="flex items-center gap-4">
 <button
 onClick={handleApprove}
 disabled={isApprovingWrite || !approvalAmount}
 className="py-2 px-4 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isApprovingWrite ?"Approving..." :"Approve"}
 </button>
 {allowance && (
 <span className="text-sm text-white/70">
 Current allowance: {formatEther(allowance)}
 </span>
 )}
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="bg-black/10 p-4">
 <h4 className="text-base font-medium mb-3 text-white/80">
 Mint Pegged Token
 </h4>
 <div className="space-y-3">
 <div>
 <label className="block text-sm font-medium mb-1 text-white/70">
 Required Collateral Amount
 </label>
 <input
 type="number"
 value={freeMintCollateralAmount}
 onChange={(e) =>
 setFreeMintCollateralAmount(e.target.value)
 }
 placeholder="Collateral Amount"
 className="w-full bg-zinc-900/50 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
 />
 </div>
 <button
 onClick={handleFreeMintPeggedToken}
 disabled={
 !allowance ||
 safeParseEther(freeMintCollateralAmount) >
 allowance ||
 isMintingPegged
 }
 className="w-full py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {!allowance
 ?"Approve First"
 : safeParseEther(freeMintCollateralAmount) >
 allowance
 ?"Insufficient Allowance"
 : isMintingPegged
 ?"Minting..."
 :"Mint Pegged Token"}
 </button>
 <p className="text-sm text-white/70">
 Note: The collateral amount will be converted to
 pegged tokens based on the current oracle price (e.g.,
 1 ETH at $2000/ETH = 2000 pegged tokens)
 </p>
 </div>
 </div>

 <div className="bg-black/10 p-4">
 <h4 className="text-base font-medium mb-3 text-white/80">
 Mint Leveraged Token
 </h4>
 <div className="space-y-3">
 <div>
 <label className="block text-sm font-medium mb-1 text-white/70">
 Required Collateral Amount
 </label>
 <input
 type="number"
 value={freeMintLeveragedCollateralAmount}
 onChange={(e) =>
 setFreeMintLeveragedCollateralAmount(
 e.target.value
 )
 }
 placeholder="Collateral Amount"
 className="w-full bg-zinc-900/50 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
 />
 </div>
 <button
 onClick={handleFreeMintLeveragedToken}
 disabled={
 !allowance ||
 safeParseEther(freeMintLeveragedCollateralAmount) >
 allowance ||
 isMintingLeveraged
 }
 className="w-full py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {!allowance
 ?"Approve First"
 : safeParseEther(
 freeMintLeveragedCollateralAmount
 ) > allowance
 ?"Insufficient Allowance"
 : isMintingLeveraged
 ?"Minting..."
 :"Mint Leveraged Token"}
 </button>
 <p className="text-sm text-white/70">
 Note: The value of leveraged tokens is the difference
 between collateral value and pegged token value. For
 example, if 1 ETH ($2000) is used to mint $1000 worth
 of pegged tokens, the leveraged tokens will be worth
 $1000.
 </p>
 </div>
 </div>
 </div>
 </div>

 {/* Redeeming Operations */}
 <div className="space-y-4">
 <h3 className="text-lg font-medium text-white font-geo">
 Redeeming Operations
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="bg-black/10 p-4">
 <h4 className="text-base font-medium mb-3 text-white/80">
 Redeem Pegged Token
 </h4>
 <div className="space-y-3">
 <input
 type="number"
 value={freeRedeemAmount}
 onChange={(e) => setFreeRedeemAmount(e.target.value)}
 placeholder="Amount to redeem"
 className="w-full bg-zinc-900/50 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
 />
 <button
 onClick={handleFreeRedeemPeggedToken}
 disabled={isRedeemingPegged}
 className="w-full py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isRedeemingPegged
 ?"Redeeming..."
 :"Redeem Pegged Token"}
 </button>
 </div>
 </div>

 <div className="bg-black/10 p-4">
 <h4 className="text-base font-medium mb-3 text-white/80">
 Swap Pegged for Leveraged
 </h4>
 <div className="space-y-3">
 <input
 type="number"
 value={freeSwapAmount}
 onChange={(e) => setFreeSwapAmount(e.target.value)}
 placeholder="Amount to swap"
 className="w-full bg-zinc-900/50 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
 />
 <button
 onClick={handleFreeSwapPeggedForLeveraged}
 disabled={isSwapping}
 className="w-full py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isSwapping
 ?"Swapping..."
 :"Swap Pegged for Leveraged"}
 </button>
 </div>
 </div>

 <div className="bg-black/10 p-4">
 <h4 className="text-base font-medium mb-3 text-white/80">
 Redeem Leveraged Token
 </h4>
 <div className="space-y-3">
 <input
 type="number"
 value={freeRedeemLeveragedAmount}
 onChange={(e) =>
 setFreeRedeemLeveragedAmount(e.target.value)
 }
 placeholder="Amount to redeem"
 className="w-full bg-zinc-900/50 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
 />
 <button
 onClick={handleFreeRedeemLeveragedToken}
 disabled={isRedeemingLeveraged}
 className="w-full py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isRedeemingLeveraged
 ?"Redeeming..."
 :"Redeem Leveraged Token"}
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Price Feed Update */}
 <div className="bg-zinc-900/50 p-4 sm:p-6">
 <h2 className="text-lg font-medium text-white mb-4 font-geo">
 Price Feed Management
 </h2>
 <button
 onClick={handleUpdatePriceFeed}
 disabled={!isConnected || isUpdatingPrice}
 className="py-2 px-4 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isUpdatingPrice ?"Updating..." :"Update Price Feed"}
 </button>
 </div>
 </div>
 )}
 </main>
 </div>
 );
}
