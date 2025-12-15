"use client";

import React, { useState } from "react";
import { parseEther, formatEther } from "viem";
import {
 useAccount,
 useContractRead,
 useContractReads,
 useWriteContract,
 usePublicClient,
} from "wagmi";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { ERC20_ABI, STABILITY_POOL_ABI, MINTER_ABI } from "@/abis/shared";

interface AnchorDepositModalProps {
 isOpen: boolean;
 onClose: () => void;
 marketId: string;
 market: any;
 onSuccess?: () => void;
}

type ModalStep ="input" |"approving" |"depositing" |"success" |"error";

export const AnchorDepositModal = ({
 isOpen,
 onClose,
 marketId,
 market,
 onSuccess,
}: AnchorDepositModalProps) => {
 const { address } = useAccount();
 const [amount, setAmount] = useState("");
 const [selectedDepositAsset, setSelectedDepositAsset] = useState<
"collateral" |"pegged"
 >("collateral");
 const [step, setStep] = useState<ModalStep>("input");
 const [error, setError] = useState<string | null>(null);
 const [txHash, setTxHash] = useState<string | null>(null);
 const [depositInStabilityPool, setDepositInStabilityPool] = useState(true);
 const [stabilityPoolType, setStabilityPoolType] = useState<
"collateral" |"sail"
 >("collateral");

 const publicClient = usePublicClient();

 const minterAddress = market?.addresses?.minter;
 const collateralAddress = market?.addresses?.collateralToken;
 const peggedTokenAddress = market?.addresses?.peggedToken;
 const collateralSymbol = market?.collateral?.symbol ||"ETH";
 const peggedTokenSymbol = market?.peggedToken?.symbol ||"ha";

 // When depositing ha tokens directly, we must deposit to stability pool
 const isDirectPeggedDeposit = selectedDepositAsset ==="pegged";

 // Get stability pool address based on selected type
 // For direct ha deposits, always use stability pool
 const effectiveDepositInStabilityPool =
 isDirectPeggedDeposit || depositInStabilityPool;
 const stabilityPoolAddress = effectiveDepositInStabilityPool
 ? stabilityPoolType ==="collateral"
 ? (market?.addresses?.stabilityPoolCollateral as
 | `0x${string}`
 | undefined)
 : (market?.addresses?.stabilityPoolLeveraged as `0x${string}` | undefined)
 : undefined;

 // Contract read hooks - collateral balance
 const { data: balanceData } = useContractRead({
 address: collateralAddress as `0x${string}`,
 abi: ERC20_ABI,
 functionName:"balanceOf",
 args: address ? [address] : undefined,
 query: {
 enabled: !!address && isOpen && selectedDepositAsset ==="collateral",
 refetchInterval: 5000,
 },
 });

 // Contract read hooks - pegged token balance (for direct ha token deposits)
 const { data: peggedTokenBalanceData } = useContractRead({
 address: peggedTokenAddress as `0x${string}`,
 abi: ERC20_ABI,
 functionName:"balanceOf",
 args: address ? [address] : undefined,
 query: {
 enabled:
 !!address &&
 !!peggedTokenAddress &&
 isOpen &&
 selectedDepositAsset ==="pegged",
 refetchInterval: 5000,
 },
 });

 // Get user's current deposit (pegged token balance in stability pool)
 const { data: currentDepositData } = useContractRead({
 address: peggedTokenAddress as `0x${string}`,
 abi: ERC20_ABI,
 functionName:"balanceOf",
 args: address ? [address] : undefined,
 query: {
 enabled: !!address && !!peggedTokenAddress && isOpen,
 refetchInterval: 5000,
 },
 });

 // Get pegged token price to calculate USD value
 const { data: peggedTokenPrice } = useContractRead({
 address: minterAddress as `0x${string}`,
 abi: [
 {
 inputs: [],
 name:"peggedTokenPrice",
 outputs: [{ type:"uint256", name:"nav", internalType:"uint256" }],
 stateMutability:"view",
 type:"function",
 },
 ],
 functionName:"peggedTokenPrice",
 query: { enabled: !!minterAddress && isOpen },
 });

 const { data: allowanceData, refetch: refetchAllowance } = useContractRead({
 address: collateralAddress as `0x${string}`,
 abi: ERC20_ABI,
 functionName:"allowance",
 args:
 address && minterAddress
 ? [address, minterAddress as `0x${string}`]
 : undefined,
 query: {
 enabled: !!address && !!minterAddress && isOpen,
 refetchInterval: 5000,
 },
 });

 // Check allowance for pegged token to stability pool (if depositing to stability pool or direct ha deposit)
 const {
 data: peggedTokenAllowanceData,
 refetch: refetchPeggedTokenAllowance,
 } = useContractRead({
 address: peggedTokenAddress as `0x${string}`,
 abi: ERC20_ABI,
 functionName:"allowance",
 args:
 address && stabilityPoolAddress
 ? [address, stabilityPoolAddress]
 : undefined,
 query: {
 enabled:
 !!address &&
 !!peggedTokenAddress &&
 !!stabilityPoolAddress &&
 isOpen &&
 (depositInStabilityPool || isDirectPeggedDeposit),
 refetchInterval: 5000,
 },
 });

 // Calculate expected output (only for collateral deposits) using mintPeggedTokenDryRun
 const { data: dryRunOutput } = useContractRead({
 address: minterAddress as `0x${string}`,
 abi: MINTER_ABI,
 functionName:"mintPeggedTokenDryRun",
 args: amount ? [parseEther(amount)] : undefined,
 query: {
 enabled:
 !!minterAddress &&
 !!amount &&
 parseFloat(amount) > 0 &&
 isOpen &&
 selectedDepositAsset ==="collateral",
 },
 });

 const expectedOutput = useMemo(() => {
 if (!dryRunOutput) return undefined;
 if (Array.isArray(dryRunOutput)) return dryRunOutput[3] as bigint;
 if (typeof dryRunOutput ==="object" &&"peggedMinted" in dryRunOutput) {
 return (dryRunOutput as any).peggedMinted as bigint;
 }
 return undefined;
 }, [dryRunOutput]);

 // For pegged token deposits, the amount is the output
 const depositAmount = isDirectPeggedDeposit
 ? amountBigInt
 : expectedOutput || 0n;

 // Contract write hooks
 const { writeContractAsync } = useWriteContract();

 // Use appropriate balance based on selected asset
 const collateralBalance = balanceData || 0n;
 const peggedTokenBalance = peggedTokenBalanceData || 0n;
 const balance =
 selectedDepositAsset ==="pegged" ? peggedTokenBalance : collateralBalance;

 const allowance = allowanceData || 0n;
 const peggedTokenAllowance = peggedTokenAllowanceData || 0n;
 const amountBigInt = amount ? parseEther(amount) : 0n;

 // For collateral deposits: need approval for minter
 // For pegged deposits: need approval for stability pool
 const needsApproval =
 selectedDepositAsset ==="collateral"
 ? amountBigInt > 0 && amountBigInt > allowance
 : false;
 const needsPeggedTokenApproval = isDirectPeggedDeposit
 ? amountBigInt > 0 && amountBigInt > peggedTokenAllowance
 : depositInStabilityPool &&
 expectedOutput &&
 expectedOutput > peggedTokenAllowance;

 const currentDeposit = currentDepositData || 0n;

 // Calculate current deposit USD value and ledger marks per day
 // Ledger Marks: 1 ledger mark per dollar per day
 // peggedTokenPrice is in 18 decimals, representing collateral value per pegged token
 const currentDepositUSD =
 peggedTokenPrice && currentDeposit
 ? (Number(currentDeposit) * Number(peggedTokenPrice)) / 1e36
 : 0;
 const currentLedgerMarksPerDay = currentDepositUSD;

 // Calculate expected ledger marks per day after deposit
 const expectedDepositUSD =
 depositAmount && peggedTokenPrice
 ? (Number(depositAmount) * Number(peggedTokenPrice)) / 1e36
 : 0;
 const newTotalDepositUSD = currentDepositUSD + expectedDepositUSD;
 const newLedgerMarksPerDay = newTotalDepositUSD;

 const handleClose = () => {
 if (step ==="approving" || step ==="depositing") return;
 setAmount("");
 setSelectedDepositAsset("collateral");
 setStep("input");
 setError(null);
 setTxHash(null);
 setDepositInStabilityPool(true);
 setStabilityPoolType("collateral");
 onClose();
 };

 const handleMaxClick = () => {
 if (balance) {
 setAmount(formatEther(balance));
 }
 };

 const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const value = e.target.value;
 if (value ==="" || /^\d*\.?\d*$/.test(value)) {
 // Cap at balance if value exceeds it
 if (value && balance > 0n) {
 try {
 const parsed = parseEther(value);
 if (parsed > balance) {
 setAmount(formatEther(balance));
 setError(null);
 return;
 }
 } catch {
 // Allow partial input (e.g., trailing decimal)
 }
 }
 setAmount(value);
 setError(null);
 }
 };

 const validateAmount = (): boolean => {
 if (!amount || parseFloat(amount) <= 0) {
 setError("Please enter a valid amount");
 return false;
 }
 if (amountBigInt > balance) {
 setError("Insufficient balance");
 return false;
 }
 return true;
 };

 const handleDeposit = async () => {
 if (!validateAmount() || !address) return;
 if (selectedDepositAsset ==="collateral" && !minterAddress) return;
 if (isDirectPeggedDeposit && !stabilityPoolAddress) {
 setError("Please select a stability pool");
 return;
 }

 try {
 if (isDirectPeggedDeposit) {
 // Direct ha token deposit to stability pool - skip minting
 // Step 1: Approve pegged token for stability pool (if needed)
 if (needsPeggedTokenApproval) {
 setStep("approving");
 setError(null);
 setTxHash(null);
 const approvePeggedHash = await writeContractAsync({
 address: peggedTokenAddress as `0x${string}`,
 abi: ERC20_ABI,
 functionName:"approve",
 args: [stabilityPoolAddress!, amountBigInt],
 });
 setTxHash(approvePeggedHash);
 await publicClient?.waitForTransactionReceipt({
 hash: approvePeggedHash,
 });
 await refetchPeggedTokenAllowance();
 await new Promise((resolve) => setTimeout(resolve, 1000));
 await refetchPeggedTokenAllowance();
 }

 // Step 2: Deposit pegged token directly to stability pool
 setStep("depositing");
 setError(null);
 setTxHash(null);
 const poolDepositHash = await writeContractAsync({
 address: stabilityPoolAddress!,
 abi: STABILITY_POOL_ABI,
 functionName:"deposit",
 args: [amountBigInt, address as `0x${string}`, 0n],
 });
 setTxHash(poolDepositHash);
 await publicClient?.waitForTransactionReceipt({
 hash: poolDepositHash,
 });
 } else {
 // Collateral deposit flow: mint then optionally deposit to stability pool
 // Step 1: Approve collateral token for minter (if needed)
 if (needsApproval) {
 setStep("approving");
 setError(null);
 setTxHash(null);
 const approveHash = await writeContractAsync({
 address: collateralAddress as `0x${string}`,
 abi: ERC20_ABI,
 functionName:"approve",
 args: [minterAddress as `0x${string}`, amountBigInt],
 });
 setTxHash(approveHash);
 await publicClient?.waitForTransactionReceipt({ hash: approveHash });
 await refetchAllowance();
 await new Promise((resolve) => setTimeout(resolve, 1000));
 await refetchAllowance();
 }

 // Step 2: Mint pegged token
 setStep("depositing");
 setError(null);
 setTxHash(null);

 // Calculate minimum output (with 1% slippage tolerance)
 const minPeggedOut = expectedOutput
 ? (expectedOutput * 99n) / 100n
 : 0n;

 const mintHash = await writeContractAsync({
 address: minterAddress as `0x${string}`,
 abi: MINTER_ABI,
 functionName:"mintPeggedToken",
 args: [amountBigInt, address as `0x${string}`, minPeggedOut],
 });
 setTxHash(mintHash);
 await publicClient?.waitForTransactionReceipt({ hash: mintHash });

 // Refetch to get updated pegged token balance
 await new Promise((resolve) => setTimeout(resolve, 1000));

 // Step 3: If depositing to stability pool, approve and deposit
 if (depositInStabilityPool && stabilityPoolAddress && expectedOutput) {
 // Check if we need to approve pegged token for stability pool
 if (needsPeggedTokenApproval) {
 setStep("approving");
 setError(null);
 setTxHash(null);
 const approvePeggedHash = await writeContractAsync({
 address: peggedTokenAddress as `0x${string}`,
 abi: ERC20_ABI,
 functionName:"approve",
 args: [stabilityPoolAddress, expectedOutput],
 });
 setTxHash(approvePeggedHash);
 await publicClient?.waitForTransactionReceipt({
 hash: approvePeggedHash,
 });
 await refetchPeggedTokenAllowance();
 await new Promise((resolve) => setTimeout(resolve, 1000));
 await refetchPeggedTokenAllowance();
 }

 // Deposit pegged token to stability pool
 setStep("depositing");
 setError(null);
 setTxHash(null);
 const poolDepositHash = await writeContractAsync({
 address: stabilityPoolAddress,
 abi: STABILITY_POOL_ABI,
 functionName:"deposit",
 args: [expectedOutput, address as `0x${string}`, 0n],
 });
 setTxHash(poolDepositHash);
 await publicClient?.waitForTransactionReceipt({
 hash: poolDepositHash,
 });
 }
 }

 setStep("success");
 if (onSuccess) {
 await onSuccess();
 }
 } catch (err) {
 console.error("Deposit error:", err);
 let errorMessage ="Transaction failed";

 if (err instanceof BaseError) {
 const revertError = err.walk(
 (err) => err instanceof ContractFunctionRevertedError
 );
 if (revertError instanceof ContractFunctionRevertedError) {
 errorMessage = `Contract error: ${
 revertError.data?.errorName ||"Unknown error"
 }`;
 } else {
 errorMessage = err.shortMessage || err.message;
 }
 }

 setError(errorMessage);
 setStep("error");
 }
 };

 const getButtonText = () => {
 switch (step) {
 case"approving":
 return"Approving...";
 case"depositing":
 return"Depositing...";
 case"success":
 return"Deposit";
 case"error":
 return"Try Again";
 default:
 if (isDirectPeggedDeposit) {
 return needsPeggedTokenApproval ?"Approve & Deposit" :"Deposit";
 }
 return needsApproval ?"Approve & Deposit" :"Deposit";
 }
 };

 const isButtonDisabled = () => {
 if (step ==="success") return false;
 return (
 step ==="approving" ||
 step ==="depositing" ||
 !amount ||
 parseFloat(amount) <= 0
 );
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 <div
 className="absolute inset-0 bg-black/40 backdrop-blur-sm"
 onClick={handleClose}
 />

 <div className="relative bg-white shadow-2xl w-full max-w-md mx-4 animate-in fade-in-0 scale-in-95 duration-200">
 <div className="flex items-center justify-between p-6 border-b border-[#1E4775]/20">
 <h2 className="text-2xl font-bold text-[#1E4775]">Deposit</h2>
 <button
 onClick={handleClose}
 className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors"
 disabled={step ==="approving" || step ==="depositing"}
 >
 <svg
 className="w-6 h-6"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M6 18L18 6M6 6l12 12"
 />
 </svg>
 </button>
 </div>

 <div className="p-6 space-y-6">
 <div className="text-sm text-[#1E4775]/70">
 {isDirectPeggedDeposit
 ? `Deposit ${peggedTokenSymbol} directly to stability pool`
 : `Deposit ${collateralSymbol} to receive ${peggedTokenSymbol}`}
 </div>

 {/* Deposit Asset Selection */}
 <div className="space-y-2">
 <label className="text-sm text-[#1E4775]/70">Deposit Asset</label>
 <select
 value={selectedDepositAsset}
 onChange={(e) => {
 setSelectedDepositAsset(
 e.target.value as"collateral" |"pegged"
 );
 setAmount(""); // Reset amount when changing asset
 }}
 className="w-full h-12 px-4 bg-white text-[#1E4775] border border-[#1E4775]/30 focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-lg font-mono"
 disabled={step ==="approving" || step ==="depositing"}
 >
 <option value="collateral">
 {collateralSymbol} (Mint {peggedTokenSymbol})
 </option>
 <option value="pegged">
 {peggedTokenSymbol} (Direct to Stability Pool)
 </option>
 </select>
 {isDirectPeggedDeposit && (
 <div className="p-3 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/30 text-[#1E4775] text-sm">
 ℹ️ Depositing {peggedTokenSymbol} directly to stability pool. No
 minting required.
 </div>
 )}
 </div>

 <div className="space-y-2">
 <div className="flex justify-between items-center text-xs">
 <span className="text-[#1E4775]/70">Amount</span>
 <span className="text-[#1E4775]/70">
 Balance: {formatEther(balance)}{""}
 {selectedDepositAsset ==="pegged"
 ? peggedTokenSymbol
 : collateralSymbol}
 </span>
 </div>
 <div className="relative">
 <input
 type="text"
 value={amount}
 onChange={handleAmountChange}
 placeholder="0.0"
 className={`w-full h-12 px-4 pr-20 bg-white text-[#1E4775] border ${
 error ?"border-red-500" :"border-[#1E4775]/30"
 } focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-lg font-mono`}
 disabled={step ==="approving" || step ==="depositing"}
 />
 <button
 onClick={handleMaxClick}
 className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 rounded-full"
 disabled={step ==="approving" || step ==="depositing"}
 >
 MAX
 </button>
 </div>
 <div className="text-right text-xs text-[#1E4775]/50">
 {selectedDepositAsset ==="pegged"
 ? peggedTokenSymbol
 : collateralSymbol}
 </div>
 {!isDirectPeggedDeposit &&
 expectedOutput &&
 amount &&
 parseFloat(amount) > 0 && (
 <div className="mt-3 p-3 bg-[rgb(var(--surface-selected-rgb))]/30 border border-[rgb(var(--surface-selected-border-rgb))]/50">
 <div className="flex justify-between items-center mb-2">
 <span className="text-sm text-[#1E4775]/70">
 You will receive:
 </span>
 <span className="text-lg font-bold text-[#1E4775]">
 {formatEther(expectedOutput)} {peggedTokenSymbol}
 </span>
 </div>
 </div>
 )}
 {isDirectPeggedDeposit && amount && parseFloat(amount) > 0 && (
 <div className="mt-3 p-3 bg-[rgb(var(--surface-selected-rgb))]/30 border border-[rgb(var(--surface-selected-border-rgb))]/50">
 <div className="flex justify-between items-center mb-2">
 <span className="text-sm text-[#1E4775]/70">
 You will deposit:
 </span>
 <span className="text-lg font-bold text-[#1E4775]">
 {formatEther(amountBigInt)} {peggedTokenSymbol}
 </span>
 </div>
 </div>
 )}
 </div>

 {/* Stability Pool Options */}
 <div className="space-y-3 pt-2 border-t border-[#1E4775]/10">
 {isDirectPeggedDeposit ? (
 <div className="p-3 bg-[#17395F]/10 border border-[#17395F]/20">
 <p className="text-xs text-[#1E4775]/80">
 <span className="font-semibold">
 Direct {peggedTokenSymbol} deposit
 </span>{""}
 will go to the selected stability pool.
 </p>
 </div>
 ) : (
 <label className="flex items-center gap-3 cursor-pointer">
 <input
 type="checkbox"
 checked={depositInStabilityPool}
 onChange={(e) => setDepositInStabilityPool(e.target.checked)}
 className="w-5 h-5 text-[#1E4775] border-[#1E4775]/30 focus:ring-2 focus:ring-[#1E4775]/20 focus:ring-offset-0 cursor-pointer"
 disabled={step ==="approving" || step ==="depositing"}
 />
 <span className="text-sm font-medium text-[#1E4775]">
 Deposit in stability pool
 </span>
 </label>
 )}

 {(depositInStabilityPool || isDirectPeggedDeposit) && (
 <div className="space-y-3 pl-8">
 {/* Toggle for Collateral vs Sail */}
 <div className="flex items-center gap-3">
 <span className="text-xs text-[#1E4775]/70">Pool type:</span>
 <div className="flex items-center bg-[#17395F]/10 p-1">
 <button
 type="button"
 onClick={() => setStabilityPoolType("collateral")}
 disabled={step ==="approving" || step ==="depositing"}
 className={`px-3 py-1.5 text-xs font-medium transition-all ${
 stabilityPoolType ==="collateral"
 ?"bg-[#1E4775] text-white shadow-sm"
 :"text-[#1E4775]/70 hover:text-[#1E4775]"
 } disabled:opacity-50 disabled:cursor-not-allowed`}
 >
 Collateral
 </button>
 <button
 type="button"
 onClick={() => setStabilityPoolType("sail")}
 disabled={step ==="approving" || step ==="depositing"}
 className={`px-3 py-1.5 text-xs font-medium transition-all ${
 stabilityPoolType ==="sail"
 ?"bg-[#1E4775] text-white shadow-sm"
 :"text-[#1E4775]/70 hover:text-[#1E4775]"
 } disabled:opacity-50 disabled:cursor-not-allowed`}
 >
 Sail
 </button>
 </div>
 </div>

 {/* Explainer */}
 <div className="p-3 bg-[#17395F]/5 border border-[#17395F]/20">
 <p className="text-xs text-[#1E4775]/80 leading-relaxed">
 {stabilityPoolType ==="collateral" ? (
 <>
 <span className="font-semibold">
 Collateral stability pool
 </span>{""}
 redeems to{""}
 <span className="font-semibold">market collateral</span>{""}
 when the market is below min collateral ratio.
 </>
 ) : (
 <>
 <span className="font-semibold">
 Sail stability pool
 </span>{""}
 redeems to{""}
 <span className="font-semibold">Sail tokens</span> when
 the market is below min collateral ratio.
 </>
 )}
 </p>
 </div>
 </div>
 )}
 </div>

 {/* Current Deposit & Ledger Marks Info */}
 <div className="space-y-3">
 {currentDeposit > 0n && (
 <div className="p-3 bg-[#17395F]/10 border border-[#17395F]/20">
 <div className="flex justify-between items-center mb-1">
 <span className="text-xs text-[#1E4775]/70">
 Current Deposit:
 </span>
 <span className="text-sm font-semibold text-[#1E4775]">
 {formatEther(currentDeposit)} {peggedTokenSymbol}
 </span>
 </div>
 {currentDepositUSD > 0 && (
 <div className="flex justify-between items-center">
 <span className="text-xs text-[#1E4775]/70">
 Ledger marks per day:
 </span>
 <span className="text-sm font-bold text-[#1E4775]">
 {currentLedgerMarksPerDay.toFixed(2)} ledger marks/day
 </span>
 </div>
 )}
 </div>
 )}

 {amount && parseFloat(amount) > 0 && depositAmount > 0n && (
 <div className="p-3 bg-[rgb(var(--surface-selected-rgb))]/30 border border-[rgb(var(--surface-selected-border-rgb))]/50">
 <div className="flex justify-between items-center mb-1">
 <span className="text-xs text-[#1E4775]/70">
 After deposit:
 </span>
 <span className="text-sm font-semibold text-[#1E4775]">
 {formatEther(currentDeposit + depositAmount)}{""}
 {peggedTokenSymbol}
 </span>
 </div>
 {newLedgerMarksPerDay > 0 && (
 <div className="flex justify-between items-center">
 <span className="text-xs text-[#1E4775]/70">
 Ledger marks per day:
 </span>
 <span className="text-sm font-bold text-[#1E4775]">
 {newLedgerMarksPerDay.toFixed(2)} ledger marks/day
 </span>
 </div>
 )}
 </div>
 )}
 </div>

 {error && (
 <div className="p-3 bg-red-50 border border-red-500/30 text-red-600 text-sm">
 {error}
 </div>
 )}

 {txHash && (
 <div className="text-xs text-center text-[#1E4775]/70">
 Tx:{""}
 <a
 href={`https://etherscan.io/tx/${txHash}`}
 target="_blank"
 rel="noopener noreferrer"
 className="underline hover:text-[#1E4775]"
 >
 {txHash.slice(0, 10)}...{txHash.slice(-8)}
 </a>
 </div>
 )}

 {step ==="success" && (
 <div className="p-3 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/30 text-[#1E4775] text-sm text-center">
 ✅ Deposit successful!
 </div>
 )}
 </div>

 <div className="flex gap-4 p-6 border-t border-[#1E4775]/20">
 <button
 onClick={handleClose}
 className="flex-1 py-2 px-4 text-[#1E4775]/70 hover:text-[#1E4775] transition-colors rounded-full"
 disabled={step ==="approving" || step ==="depositing"}
 >
 {step ==="success" ?"Close" :"Cancel"}
 </button>
 <button
 onClick={handleDeposit}
 disabled={isButtonDisabled()}
 className={`flex-1 py-2 px-4 font-medium transition-colors rounded-full ${
 step ==="success"
 ?"bg-[#1E4775] hover:bg-[#17395F] text-white"
 :"bg-[#1E4775] hover:bg-[#17395F] text-white disabled:bg-gray-300 disabled:text-gray-500"
 }`}
 >
 {getButtonText()}
 </button>
 </div>
 </div>
 </div>
 );
};
