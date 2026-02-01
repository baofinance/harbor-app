"use client";

import { useState, useEffect, useMemo } from "react";
import {
 useAccount,
 useWriteContract,
 useReadContract,
 useContractReads,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { markets } from "../../config/markets";
import { ConnectWallet } from "@/components/Wallet";
import Link from "next/link";
import { formatTimeRemaining } from "@/utils/formatters";

import {
  MINTER_FEES_READS_ABI,
  ADMIN_MINTER_ABI,
  MOCK_PRICE_FEED_ABI,
  STABILITY_POOL_REWARDS_ABI,
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

 useEffect(() => {
 setMounted(true);
 }, []);

 // ---------------------------------------------------------------------------
 // Fees + Harvestable summary (per market) - shown above "System Controls"
 // ---------------------------------------------------------------------------
 const marketOptions = Object.entries(markets)
   .filter(([, m]) => (m as any)?.addresses?.minter)
   .map(([id, m]) => ({
     id,
     name: (m as any)?.name ?? id,
     minter: (m as any)?.addresses?.minter as `0x${string}`,
   }));

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

 const { data: minterReadData, isLoading: isLoadingMinterReads } = useContractReads({
   contracts: minterReads,
   query: {
     enabled: mounted && isConnected && minterReads.length > 0,
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
             abi: [
               {
                 inputs: [{ type: "address" }],
                 name: "balanceOf",
                 outputs: [{ type: "uint256" }],
                 stateMutability: "view",
                 type: "function",
               },
             ] as const,
             functionName: "balanceOf" as const,
             args: [feeReceiver],
           },
         };
       })
       .filter((x): x is NonNullable<typeof x> => !!x)
   : []);

 const { data: feeBalanceData, isLoading: isLoadingFeeBalances } = useContractReads({
   contracts: feeBalanceReads.map((x) => x.contract),
   query: {
     enabled: mounted && isConnected && feeBalanceReads.length > 0,
     refetchInterval: 30000,
     staleTime: 15000,
     retry: 1,
     allowFailure: true,
   } as any,
 });

 const feesSummaryRows = (() => {
   const feeBalByMarketIndex = new Map<number, bigint>();
   feeBalanceReads.forEach((meta, idx) => {
     const res = feeBalanceData?.[idx];
     const bal =
       res?.status === "success" && res.result !== undefined && res.result !== null
         ? (res.result as bigint)
         : 0n;
     feeBalByMarketIndex.set(meta.marketIndex, bal);
   });

   return marketOptions.map((m, i) => {
     const base = i * 3;
     const harvestable =
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
     const harvest = harvestable ?? 0n;
     const total = feeBalance + harvest;
     return {
       ...m,
       harvestable: harvest,
       feeReceiver,
       wrappedToken,
       feeBalance,
       total,
     };
   });
 })();

 // Get the minter address from the first market
 const minterAddress = (markets as any)[Object.keys(markets)[0]].addresses
 .minter as `0x${string}`;

 // Contract writes
 const {
 writeContract: updateFeeReceiverWrite,
 data: updateFeeReceiverHash,
 isPending: isUpdatingFeeReceiver,
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

    {/* Fees & Harvestable summary (per market) */}
    <div className="bg-zinc-900/50 p-4 sm:p-6">
     <div className="flex items-center justify-between gap-4 mb-3">
       <div>
         <h2 className="text-lg font-medium text-white font-geo">
           Fees & Harvestable
         </h2>
         <div className="text-xs text-white/60 mt-1">
           `harvestable()` on Minter + wrapped collateral token balance at `feeReceiver()`
         </div>
       </div>
       {(isLoadingMinterReads || isLoadingFeeBalances) && (
         <div className="text-xs text-white/60">Loading…</div>
       )}
     </div>

     <div className="overflow-x-auto">
       <table className="w-full text-sm">
         <thead>
           <tr className="text-xs text-white/60 border-b border-white/10">
             <th className="text-left py-2 pr-4">Market</th>
             <th className="text-right py-2 pr-4">Harvestable</th>
             <th className="text-right py-2 pr-4">Fees</th>
             <th className="text-right py-2 pr-4">Total</th>
             <th className="text-left py-2">Fee Receiver</th>
           </tr>
         </thead>
         <tbody>
           {feesSummaryRows.map((r) => (
             <tr key={r.id} className="border-t border-white/5">
               <td className="py-2 pr-4 text-white">{r.name}</td>
               <td className="py-2 pr-4 text-right font-mono text-white">
                 {formatEther(r.harvestable)}
               </td>
               <td className="py-2 pr-4 text-right font-mono text-white">
                 {formatEther(r.feeBalance)}
               </td>
               <td className="py-2 pr-4 text-right font-mono text-white">
                 {formatEther(r.total)}
               </td>
               <td className="py-2 text-xs text-white/60 font-mono">
                 {r.feeReceiver ?? "-"}
               </td>
             </tr>
           ))}
         </tbody>
       </table>
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
