"use client";

import React, { useState, useEffect, useMemo } from "react";
import { parseEther, formatEther } from "viem";
import {
 useAccount,
 useBalance,
 useContractRead,
 useWriteContract,
 usePublicClient,
} from "wagmi";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { ERC20_ABI, MINTER_ABI } from "@/abis/shared";
import SimpleTooltip from "@/components/SimpleTooltip";
import {
 TransactionProgressModal,
 TransactionStep,
} from "@/components/TransactionProgressModal";

interface SailManageModalProps {
 isOpen: boolean;
 onClose: () => void;
 marketId: string;
 market: any;
 initialTab?:"mint" |"redeem";
 onSuccess?: () => void;
}

type ModalStep =
 |"input"
 |"approving"
 |"minting"
 |"redeeming"
 |"success"
 |"error";

// Helper function to get accepted deposit assets from market config
function getAcceptedDepositAssets(
 market: any
): Array<{ symbol: string; name: string }> {
 // Use acceptedAssets from market config if available
 if (market?.acceptedAssets && Array.isArray(market.acceptedAssets)) {
   return market.acceptedAssets;
 }
 // Fallback: return collateral token as the only accepted asset
 if (market?.collateral?.symbol) {
   return [{ symbol: market.collateral.symbol, name: market.collateral.name || market.collateral.symbol }];
 }
 return [];
}

export const SailManageModal = ({
 isOpen,
 onClose,
 marketId,
 market,
 initialTab ="mint",
 onSuccess,
}: SailManageModalProps) => {
 const { address, isConnected } = useAccount();
 const publicClient = usePublicClient();
 const { writeContractAsync } = useWriteContract();

 const [activeTab, setActiveTab] = useState<"mint" |"redeem">(initialTab);
 const [amount, setAmount] = useState("");
 const [selectedDepositAsset, setSelectedDepositAsset] = useState<
 string | null
 >(null);
 const [step, setStep] = useState<ModalStep>("input");
 const [error, setError] = useState<string | null>(null);
 const [txHash, setTxHash] = useState<string | null>(null);

 const formatDisplay = (
 value?: bigint | null,
 maximumFractionDigits: number = 4
 ) => {
 if (!value || value === 0n) return"0.00";
 const num = Number(formatEther(value));
 if (!Number.isFinite(num)) return"0.00";
 return new Intl.NumberFormat("en-US", {
 minimumFractionDigits: 0,
 maximumFractionDigits,
 }).format(num);
 };

 // Progress modal state
 const [progressModal, setProgressModal] = useState<{
 isOpen: boolean;
 title: string;
 steps: TransactionStep[];
 currentStepIndex: number;
 } | null>(null);

 const minterAddress = market.addresses?.minter as `0x${string}` | undefined;
 const leveragedTokenAddress = market.addresses?.leveragedToken as
 | `0x${string}`
 | undefined;
 const collateralAddress = market.addresses?.collateralToken as
 | `0x${string}`
 | undefined;
 const wrappedCollateralAddress = market.addresses?.wrappedCollateralToken as
 | `0x${string}`
 | undefined;

 const collateralSymbol = market.collateral?.symbol ||"ETH";
 const leveragedTokenSymbol = market.leveragedToken?.symbol ||"hs";

 // Get accepted deposit assets
 const acceptedAssets = useMemo(
 () => getAcceptedDepositAssets(market),
 [market]
 );

 // Set default deposit asset
 useEffect(() => {
 if (acceptedAssets.length > 0 && !selectedDepositAsset) {
 setSelectedDepositAsset(acceptedAssets[0].symbol);
 }
 }, [acceptedAssets, selectedDepositAsset]);

 // Get deposit asset address
 const depositAssetAddress = useMemo(() => {
 if (!selectedDepositAsset) return undefined;
 const normalized = selectedDepositAsset.toLowerCase();
 if (normalized ==="eth") return undefined; // Native ETH
 // wstETH is the collateral token
 if (normalized ==="wsteth") return market.addresses?.collateralToken;
 // stETH is the wrapped collateral token
 if (normalized ==="steth") return market.addresses?.wrappedCollateralToken;
 return market.addresses?.collateralToken; // Default
 }, [selectedDepositAsset, market.addresses]);

 // Get native ETH balance (when ETH is selected) - use useBalance
 const { data: nativeEthBalance } = useBalance({
 address: address,
 query: {
 enabled:
 isOpen &&
 !!address &&
 activeTab ==="mint" &&
 selectedDepositAsset ==="ETH",
 refetchInterval: 5000,
 },
 });

 // Get user balance for deposit asset (wstETH, stETH, etc.)
 const { data: depositAssetBalanceData } = useContractRead({
 address: depositAssetAddress as `0x${string}`,
 abi: ERC20_ABI,
 functionName:"balanceOf",
 args: address ? [address] : undefined,
 query: {
 enabled:
 isOpen &&
 !!address &&
 activeTab ==="mint" &&
 !!depositAssetAddress &&
 selectedDepositAsset !=="ETH",
 refetchInterval: 5000,
 retry: 1,
 },
 });

 // Get user leveraged token balance
 const { data: leveragedTokenBalance } = useContractRead({
 address: leveragedTokenAddress,
 abi: ERC20_ABI,
 functionName:"balanceOf",
 args: address ? [address] : undefined,
 query: {
 enabled:
 isOpen &&
 !!address &&
 !!leveragedTokenAddress &&
 activeTab ==="redeem",
 },
 });

 // Get allowance for deposit asset
 const { data: depositAssetAllowance } = useContractRead({
 address: depositAssetAddress,
 abi: ERC20_ABI,
 functionName:"allowance",
 args:
 address && minterAddress && depositAssetAddress
 ? [address, minterAddress]
 : undefined,
 query: {
 enabled:
 isOpen &&
 !!address &&
 !!minterAddress &&
 !!depositAssetAddress &&
 activeTab ==="mint",
 },
 });

 // Get allowance for leveraged token
 const { data: leveragedTokenAllowance } = useContractRead({
 address: leveragedTokenAddress,
 abi: ERC20_ABI,
 functionName:"allowance",
 args:
 address && minterAddress && leveragedTokenAddress
 ? [address, minterAddress]
 : undefined,
 query: {
 enabled:
 isOpen &&
 !!address &&
 !!minterAddress &&
 !!leveragedTokenAddress &&
 activeTab ==="redeem",
 },
 });

 // Parse amount safely
 const parsedAmount = useMemo(() => {
 if (!amount || amount ==="") return undefined;
 try {
 return parseEther(amount);
 } catch {
 return undefined;
 }
 }, [amount]);

 // Dry run for mint
 const mintDryRunEnabled =
 activeTab ==="mint" &&
 !!parsedAmount &&
 !!minterAddress &&
 parsedAmount > 0n;

 const { data: mintDryRunResult, error: mintDryRunErr } = useContractRead({
 address: minterAddress,
 abi: MINTER_ABI,
 functionName:"mintLeveragedTokenDryRun",
 args: parsedAmount ? [parsedAmount] : undefined,
 query: {
 enabled: mintDryRunEnabled,
 },
 });

 // Dry run for redeem
 const redeemDryRunEnabled =
 activeTab ==="redeem" &&
 !!parsedAmount &&
 !!minterAddress &&
 parsedAmount > 0n;

 const { data: redeemDryRunResult, error: redeemDryRunErr } =
 useContractRead({
 address: minterAddress,
 abi: MINTER_ABI,
 functionName:"redeemLeveragedTokenDryRun",
 args: parsedAmount ? [parsedAmount] : undefined,
 query: {
 enabled: redeemDryRunEnabled,
 },
 });

 // Calculate fees and outputs
 const mintFee = useMemo(() => {
 if (!mintDryRunResult || !parsedAmount || parsedAmount === 0n) return 0n;
 const [
 incentiveRatio,
 wrappedFee,
 wrappedDiscount,
 wrappedCollateralUsed,
 leveragedMinted,
 price,
 rate,
 ] = mintDryRunResult as [
 bigint,
 bigint,
 bigint,
 bigint,
 bigint,
 bigint,
 bigint
 ];
 return wrappedFee;
 }, [mintDryRunResult, parsedAmount]);

 const mintFeePercentage = useMemo(() => {
 if (!mintFee || !parsedAmount || parsedAmount === 0n) return 0;
 return (Number(mintFee) / Number(parsedAmount)) * 100;
 }, [mintFee, parsedAmount]);

 const expectedMintOutput = useMemo(() => {
 if (!mintDryRunResult || !parsedAmount || parsedAmount === 0n)
 return undefined;
 const [
 incentiveRatio,
 wrappedFee,
 wrappedDiscount,
 wrappedCollateralUsed,
 leveragedMinted,
 price,
 rate,
 ] = mintDryRunResult as [
 bigint,
 bigint,
 bigint,
 bigint,
 bigint,
 bigint,
 bigint
 ];
 return leveragedMinted;
 }, [mintDryRunResult, parsedAmount]);

 const redeemFee = useMemo(() => {
 if (!redeemDryRunResult || !parsedAmount || parsedAmount === 0n) return 0n;
 const [
 incentiveRatio,
 wrappedFee,
 leveragedRedeemed,
 wrappedCollateralReturned,
 price,
 rate,
 ] = redeemDryRunResult as [bigint, bigint, bigint, bigint, bigint, bigint];
 return wrappedFee;
 }, [redeemDryRunResult, parsedAmount]);

 const expectedRedeemOutput = useMemo(() => {
 if (!redeemDryRunResult || !parsedAmount || parsedAmount === 0n)
 return undefined;
 const [
 incentiveRatio,
 wrappedFee,
 leveragedRedeemed,
 wrappedCollateralReturned,
 price,
 rate,
 ] = redeemDryRunResult as [bigint, bigint, bigint, bigint, bigint, bigint];
 return wrappedCollateralReturned;
 }, [redeemDryRunResult, parsedAmount]);

 const redeemFeePercentage = useMemo(() => {
 // Fee percentage should be based on wrapped collateral output, not leveraged input
 if (!redeemFee || !expectedRedeemOutput || expectedRedeemOutput === 0n)
 return 0;
 // Calculate percentage based on fee relative to gross output (output + fee)
 const grossOutput = expectedRedeemOutput + redeemFee;
 return (Number(redeemFee) / Number(grossOutput)) * 100;
 }, [redeemFee, expectedRedeemOutput]);

 // Reset state when modal opens/closes
 useEffect(() => {
 if (!isOpen) {
 setAmount("");
 setStep("input");
 setError(null);
 setTxHash(null);
 setActiveTab(initialTab);
 }
 }, [isOpen, initialTab]);

 // Handle tab change
 const handleTabChange = (tab:"mint" |"redeem") => {
 if (step ==="input") {
 setActiveTab(tab);
 setAmount("");
 setError(null);
 }
 };

 // Validate amount
 const validateAmount = (): boolean => {
 if (!amount || parseFloat(amount) <= 0) {
 setError("Please enter a valid amount");
 return false;
 }

 if (activeTab ==="mint") {
 // Use native ETH balance if ETH is selected, otherwise use deposit asset balance
 let balance = 0n;
 if (selectedDepositAsset ==="ETH") {
 balance = nativeEthBalance?.value || 0n;
 } else {
 // Handle both direct bigint and { result: bigint } formats for ERC20 tokens
 if (depositAssetBalanceData) {
 if (
 typeof depositAssetBalanceData ==="object" &&
"result" in depositAssetBalanceData
 ) {
 balance = (depositAssetBalanceData.result as bigint) || 0n;
 } else {
 balance = depositAssetBalanceData as bigint;
 }
 }
 }
 if (parsedAmount && parsedAmount > balance) {
 setError("Insufficient balance");
 return false;
 }
 } else {
 // Handle both direct bigint and { result: bigint } formats
 let balance = 0n;
 if (leveragedTokenBalance) {
 if (
 typeof leveragedTokenBalance ==="object" &&
"result" in leveragedTokenBalance
 ) {
 balance = (leveragedTokenBalance.result as bigint) || 0n;
 } else {
 balance = leveragedTokenBalance as bigint;
 }
 }
 if (parsedAmount && parsedAmount > balance) {
 setError("Insufficient balance");
 return false;
 }
 }

 return true;
 };

 // Helper to update a step in the progress modal
 const updateProgressStep = (
 stepId: string,
 updates: Partial<TransactionStep>
 ) => {
 setProgressModal((prev) => {
 if (!prev) return prev;
 const newSteps = prev.steps.map((s) =>
 s.id === stepId ? { ...s, ...updates } : s
 );
 // Find new current step index (first non-completed step)
 const newCurrentIndex = newSteps.findIndex(
 (s) => s.status !=="completed"
 );
 return {
 ...prev,
 steps: newSteps,
 currentStepIndex:
 newCurrentIndex === -1 ? newSteps.length - 1 : newCurrentIndex,
 };
 });
 };

 // Handle mint
 const handleMint = async () => {
 if (!validateAmount() || !address || !minterAddress || !parsedAmount)
 return;

 setError(null);

 // Check if we need to wrap ETH first
 if (selectedDepositAsset ==="ETH" && !wrappedCollateralAddress) {
 setError("Wrapped collateral token address not found");
 return;
 }

 // Determine if approval is needed
 const needsApproval = depositAssetAddress
 ? ((depositAssetAllowance as bigint) || 0n) < parsedAmount
 : false;

 // Build steps
 const steps: TransactionStep[] = [];
 if (needsApproval) {
 steps.push({
 id:"approve",
 label: `Approve ${selectedDepositAsset || collateralSymbol}`,
 status:"pending",
 details: `Approve ${
 selectedDepositAsset || collateralSymbol
 } for minting`,
 });
 }
 steps.push({
 id:"mint",
 label: `Mint ${leveragedTokenSymbol}`,
 status:"pending",
 details: `Mint ${
 expectedMintOutput
 ? Number(formatEther(expectedMintOutput)).toFixed(4)
 :"..."
 } ${leveragedTokenSymbol}`,
 });

 // Open progress modal
 setProgressModal({
 isOpen: true,
 title: `Mint ${leveragedTokenSymbol}`,
 steps,
 currentStepIndex: 0,
 });

 try {
 // Step 1: Approve (if needed)
 if (needsApproval && depositAssetAddress) {
 updateProgressStep("approve", { status:"in_progress" });
 const approveHash = await writeContractAsync({
 address: depositAssetAddress,
 abi: ERC20_ABI,
 functionName:"approve",
 args: [minterAddress, parsedAmount],
 });
 await publicClient?.waitForTransactionReceipt({ hash: approveHash });
 updateProgressStep("approve", {
 status:"completed",
 txHash: approveHash,
 });
 }

 // Step 2: Mint
 updateProgressStep("mint", { status:"in_progress" });
 const minOutput = expectedMintOutput
 ? (expectedMintOutput * 99n) / 100n
 : 0n;

 const mintHash = await writeContractAsync({
 address: minterAddress,
 abi: MINTER_ABI,
 functionName:"mintLeveragedToken",
 args: [parsedAmount, address, minOutput],
 });
 await publicClient?.waitForTransactionReceipt({ hash: mintHash });
 updateProgressStep("mint", { status:"completed", txHash: mintHash });

 setTxHash(mintHash);
 if (onSuccess) onSuccess();
 } catch (err) {
 console.error("Mint error:", err);
 let errorMessage ="Transaction failed";
 if (err instanceof BaseError) {
 const revertError = err.walk(
 (e) => e instanceof ContractFunctionRevertedError
 );
 if (revertError instanceof ContractFunctionRevertedError) {
 errorMessage = revertError.reason ||"Transaction failed";
 } else {
 errorMessage = err.message ||"Transaction failed";
 }
 }
 // Mark current step as error
 setProgressModal((prev) => {
 if (!prev) return prev;
 const newSteps = prev.steps.map((s) =>
 s.status ==="in_progress"
 ? { ...s, status:"error" as const, error: errorMessage }
 : s
 );
 return { ...prev, steps: newSteps };
 });
 }
 };

 // Handle redeem
 const handleRedeem = async () => {
 if (
 !validateAmount() ||
 !address ||
 !minterAddress ||
 !parsedAmount ||
 !leveragedTokenAddress
 )
 return;

 setError(null);

 // Determine if approval is needed
 const needsApproval =
 ((leveragedTokenAllowance as bigint) || 0n) < parsedAmount;

 // Build steps
 const steps: TransactionStep[] = [];
 if (needsApproval) {
 steps.push({
 id:"approve",
 label: `Approve ${leveragedTokenSymbol}`,
 status:"pending",
 details: `Approve ${leveragedTokenSymbol} for redeeming`,
 });
 }
 steps.push({
 id:"redeem",
 label: `Redeem ${leveragedTokenSymbol}`,
 status:"pending",
 details: `Receive ${
 expectedRedeemOutput
 ? Number(formatEther(expectedRedeemOutput)).toFixed(4)
 :"..."
 } ${collateralSymbol}`,
 });

 // Open progress modal
 setProgressModal({
 isOpen: true,
 title: `Redeem ${leveragedTokenSymbol}`,
 steps,
 currentStepIndex: 0,
 });

 try {
 // Step 1: Approve (if needed)
 if (needsApproval) {
 updateProgressStep("approve", { status:"in_progress" });
 const approveHash = await writeContractAsync({
 address: leveragedTokenAddress,
 abi: ERC20_ABI,
 functionName:"approve",
 args: [minterAddress, parsedAmount],
 });
 await publicClient?.waitForTransactionReceipt({ hash: approveHash });
 updateProgressStep("approve", {
 status:"completed",
 txHash: approveHash,
 });
 }

 // Step 2: Redeem
 updateProgressStep("redeem", { status:"in_progress" });
 const minOutput = expectedRedeemOutput
 ? (expectedRedeemOutput * 99n) / 100n
 : 0n;

 const redeemHash = await writeContractAsync({
 address: minterAddress,
 abi: MINTER_ABI,
 functionName:"redeemLeveragedToken",
 args: [parsedAmount, address, minOutput],
 });
 await publicClient?.waitForTransactionReceipt({ hash: redeemHash });
 updateProgressStep("redeem", { status:"completed", txHash: redeemHash });

 setTxHash(redeemHash);
 if (onSuccess) onSuccess();
 } catch (err) {
 console.error("Redeem error:", err);
 let errorMessage ="Transaction failed";
 if (err instanceof BaseError) {
 const revertError = err.walk(
 (e) => e instanceof ContractFunctionRevertedError
 );
 if (revertError instanceof ContractFunctionRevertedError) {
 errorMessage = revertError.reason ||"Transaction failed";
 } else {
 errorMessage = err.message ||"Transaction failed";
 }
 }
 // Mark current step as error
 setProgressModal((prev) => {
 if (!prev) return prev;
 const newSteps = prev.steps.map((s) =>
 s.status ==="in_progress"
 ? { ...s, status:"error" as const, error: errorMessage }
 : s
 );
 return { ...prev, steps: newSteps };
 });
 }
 };

 // Handle close
 const handleClose = () => {
 if (step ==="approving" || step ==="minting" || step ==="redeeming") {
 if (
 !confirm(
"Transaction is processing. Are you sure you want to close this modal?"
 )
 ) {
 return;
 }
 }
 onClose();
 };

 // Handle cancel
 const handleCancel = () => {
 setStep("input");
 setError(null);
 };

 if (!isOpen) return null;

 const isProcessing =
 step ==="approving" || step ==="minting" || step ==="redeeming";

 // Get current balance based on selected asset and tab
 const currentBalance = useMemo(() => {
 if (activeTab ==="mint") {
 if (selectedDepositAsset ==="ETH") {
 return nativeEthBalance?.value || 0n;
 }
 // Handle both direct bigint and { result: bigint } formats for ERC20 tokens
 if (depositAssetBalanceData) {
 if (
 typeof depositAssetBalanceData ==="object" &&
"result" in depositAssetBalanceData
 ) {
 return (depositAssetBalanceData.result as bigint) || 0n;
 }
 return depositAssetBalanceData as bigint;
 }
 return 0n;
 } else {
 // Handle both direct bigint and { result: bigint } formats
 if (
 leveragedTokenBalance &&
 typeof leveragedTokenBalance ==="object" &&
"result" in leveragedTokenBalance
 ) {
 return (leveragedTokenBalance.result as bigint) || 0n;
 }
 return (leveragedTokenBalance as bigint) || 0n;
 }
 }, [
 activeTab,
 selectedDepositAsset,
 nativeEthBalance,
 depositAssetBalanceData,
 leveragedTokenBalance,
 ]);

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 <div
 className="absolute inset-0 bg-black/40 backdrop-blur-sm"
 onClick={handleClose}
 />

 <div className="relative bg-white shadow-2xl w-full max-w-xl mx-4 animate-in fade-in-0 scale-in-95 duration-200 overflow-hidden">
 {/* Header with tabs and close button */}
 <div className="flex items-center justify-between p-0 pt-3 px-3 border-b border-[#d1d7e5]">
 {/* Tab-style header with padding */}
 <div className="flex w-full border border-[#d1d7e5] border-b-0 -t-xl overflow-hidden">
 <button
 onClick={() => handleTabChange("mint")}
 disabled={isProcessing}
 className={`flex-1 py-3 text-base font-semibold transition-colors ${
 activeTab ==="mint"
 ?"bg-[#1E4775] text-white"
 :"bg-[#eef1f7] text-[#4b5a78]"
 } disabled:opacity-50 disabled:cursor-not-allowed`}
 >
 Mint
 </button>
 <button
 onClick={() => handleTabChange("redeem")}
 disabled={isProcessing}
 className={`flex-1 py-3 text-base font-semibold transition-colors ${
 activeTab ==="redeem"
 ?"bg-[#1E4775] text-white"
 :"bg-[#eef1f7] text-[#4b5a78]"
 } disabled:opacity-50 disabled:cursor-not-allowed`}
 >
 Redeem
 </button>
 </div>
 <button
 onClick={handleClose}
 className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors disabled:opacity-30"
 disabled={isProcessing}
 >
 <svg
 className="w-5 h-5"
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

 <div className="p-4">
 {step ==="success" ? (
 <div className="text-center py-8">
 <div className="text-6xl mb-4">✓</div>
 <h3 className="text-xl font-bold text-[#1E4775] mb-2">
 Transaction Successful!
 </h3>
 <p className="text-sm text-[#1E4775]/70 mb-4">
 {activeTab ==="mint"
 ?"Your sail tokens have been minted successfully."
 :"Your sail tokens have been redeemed successfully."}
 </p>
 {txHash && (
 <a
 href={`https://etherscan.io/tx/${txHash}`}
 target="_blank"
 rel="noopener noreferrer"
 className="text-sm text-[#1E4775] hover:underline"
 >
 View on Etherscan
 </a>
 )}
 </div>
 ) : step ==="error" ? (
 <div className="text-center py-8">
 <div className="text-6xl mb-4 text-red-500">✗</div>
 <h3 className="text-xl font-bold text-red-600 mb-2">
 Transaction Failed
 </h3>
 <p className="text-sm text-red-500 mb-4">{error}</p>
 <div className="flex gap-3">
 <button
 onClick={handleCancel}
 className="flex-1 py-2 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={activeTab ==="mint" ? handleMint : handleRedeem}
 className="flex-1 py-2 px-4 bg-[#1E4775] text-white font-semibold hover:bg-[#17395F] transition-colors"
 >
 Try Again
 </button>
 </div>
 </div>
 ) : (
 <div className="space-y-4">
 {/* Input Section */}
 <div>
 {activeTab ==="mint" && (
 <div className="mb-3">
 <label className="block text-xs text-[#1E4775]/70 mb-1">
 Deposit Asset
 </label>
 <select
 value={selectedDepositAsset ||""}
 onChange={(e) => setSelectedDepositAsset(e.target.value)}
 disabled={isProcessing}
 className="w-full px-3 py-2 border border-[#1E4775]/30 text-sm text-[#1E4775] bg-white focus:outline-none focus:ring-2 focus:ring-[#1E4775]/20 disabled:opacity-50"
 >
 {acceptedAssets.map((asset) => (
 <option key={asset.symbol} value={asset.symbol}>
 {asset.name}
 </option>
 ))}
 </select>
 </div>
 )}
 <div className="flex justify-between items-center mb-1.5">
 <label className="text-sm font-semibold text-[#1E4775]">
 {activeTab ==="mint" ?"Deposit Amount" :"Redeem Amount"}
 </label>
 <span className="text-sm text-[#1E4775]/70">
 Balance: {formatDisplay(currentBalance, 4)}{""}
 {activeTab ==="mint"
 ? selectedDepositAsset || collateralSymbol
 : leveragedTokenSymbol}
 </span>
 </div>
 <div className="relative">
 <input
 type="text"
 value={amount}
 onChange={(e) => {
 const value = e.target.value;
 if (value ==="" || /^\d*\.?\d*$/.test(value)) {
 // Cap at balance if value exceeds it
 if (value && currentBalance) {
 try {
 const parsed = parseEther(value);
 if (parsed > currentBalance) {
 setAmount(formatEther(currentBalance));
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
 }}
 placeholder="0.0"
 disabled={isProcessing}
 className={`w-full h-14 px-4 pr-24 bg-white text-[#1E4775] border-2 ${
 parsedAmount &&
 currentBalance &&
 parsedAmount > currentBalance
 ?"border-red-500 focus:ring-red-200"
 :"border-[#1E4775]/30 focus:ring-[#1E4775]/20"
 } focus:border-[#1E4775] focus:ring-2 focus:outline-none transition-all text-xl font-mono disabled:opacity-50`}
 />
 <button
 onClick={() => {
 if (currentBalance) {
 setAmount(formatEther(currentBalance));
 setError(null);
 }
 }}
 disabled={isProcessing || !currentBalance}
 className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 rounded-full font-medium"
 >
 MAX
 </button>
 </div>
 </div>

 {/* Error Display */}
 {error && (
 <div className="p-2 bg-red-50 border border-red-200 text-xs text-red-600">
 {error}
 </div>
 )}

 {/* Fee Display */}
 {activeTab ==="mint" && (
 <div className="text-xs text-[#1E4775]">
 <span className="flex items-center gap-1.5">
 Mint Fee:{""}
 <span
 className={`font-semibold ${
 mintFeePercentage > 2
 ?"text-red-600"
 :"text-[#1E4775]"
 }`}
 >
 {parsedAmount &&
 parsedAmount > 0n &&
 mintFeePercentage !== undefined
 ? `${mintFeePercentage.toFixed(2)}%`
 :"-"}
 {parsedAmount && parsedAmount > 0n && mintFee > 0n && (
 <span className="ml-1 font-normal text-[#1E4775]/60">
 ({formatDisplay(mintFee, 4)}{""}
 {selectedDepositAsset || collateralSymbol})
 </span>
 )}
 </span>
 </span>
 </div>
 )}

 {activeTab ==="redeem" && (
 <div className="text-xs text-[#1E4775]">
 <span className="flex items-center gap-1.5">
 Redeem Fee:{""}
 <span
 className={`font-semibold ${
 redeemFeePercentage > 2
 ?"text-red-600"
 :"text-[#1E4775]"
 }`}
 >
 {parsedAmount &&
 parsedAmount > 0n &&
 redeemFeePercentage !== undefined
 ? `${redeemFeePercentage.toFixed(2)}%`
 :"-"}
 {parsedAmount && parsedAmount > 0n && redeemFee > 0n && (
 <span className="ml-1 font-normal text-[#1E4775]/60">
 ({formatDisplay(redeemFee, 4)} {collateralSymbol})
 </span>
 )}
 </span>
 </span>
 </div>
 )}

 {/* Transaction Summary */}
 {activeTab ==="mint" && (
 <div className="p-2 bg-[#17395F]/5 border border-[#17395F]/20">
 <h4 className="text-xs font-semibold text-[#1E4775] mb-1.5">
 Transaction Summary
 </h4>
 <div className="space-y-1 text-xs text-[#1E4775]/80">
 <div className="flex justify-between">
 <span>You deposit:</span>
 <span className="font-mono">
 {parsedAmount && parsedAmount > 0n
 ? `${formatDisplay(parsedAmount, 4)} ${
 selectedDepositAsset || collateralSymbol
 }`
 :"0.00"}
 </span>
 </div>
 <div className="flex justify-between">
 <span>You receive:</span>
 <span className="font-mono">
 {expectedMintOutput && parsedAmount && parsedAmount > 0n
 ? `${formatDisplay(
 expectedMintOutput,
 4
 )} ${leveragedTokenSymbol}`
 :"0.00"}
 </span>
 </div>
 </div>
 </div>
 )}

 {activeTab ==="redeem" && (
 <div className="p-2 bg-[#17395F]/5 border border-[#17395F]/20">
 <h4 className="text-xs font-semibold text-[#1E4775] mb-1.5">
 Transaction Summary
 </h4>
 <div className="space-y-1 text-xs text-[#1E4775]/80">
 <div className="flex justify-between">
 <span>You redeem:</span>
 <span className="font-mono">
 {parsedAmount && parsedAmount > 0n
 ? `${formatDisplay(
 parsedAmount,
 4
 )} ${leveragedTokenSymbol}`
 :"0.00"}
 </span>
 </div>
 <div className="flex justify-between">
 <span>You receive:</span>
 <span className="font-mono">
 {expectedRedeemOutput &&
 parsedAmount &&
 parsedAmount > 0n
 ? `${formatDisplay(
 expectedRedeemOutput,
 4
 )} ${collateralSymbol}`
 :"0.00"}
 </span>
 </div>
 </div>
 </div>
 )}

 {/* Processing Indicator - only show if progress modal is not open */}
 {isProcessing && !progressModal && (
 <div className="text-center py-4">
 <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E4775]"></div>
 <p className="mt-2 text-sm text-[#1E4775]">
 {step ==="approving"
 ?"Approving..."
 : step ==="minting"
 ?"Minting sail tokens..."
 :"Redeeming sail tokens..."}
 </p>
 </div>
 )}

 {/* Action Buttons */}
 {!isProcessing && (
 <div className="flex gap-3 pt-2 border-t border-[#1E4775]/20">
 {(step ==="error" || step ==="input") && (
 <button
 onClick={handleClose}
 className="flex-1 py-3 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors"
 >
 Cancel
 </button>
 )}
 <button
 onClick={activeTab ==="mint" ? handleMint : handleRedeem}
 disabled={
 !isConnected ||
 !amount ||
 parseFloat(amount) <= 0 ||
 (activeTab ==="mint" &&
 parsedAmount &&
 parsedAmount > currentBalance) ||
 (activeTab ==="redeem" &&
 parsedAmount &&
 parsedAmount > currentBalance)
 }
 className="flex-1 py-3 px-4 bg-[#1E4775] text-white font-semibold hover:bg-[#17395F] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
 >
 {activeTab ==="mint" ?"Mint" :"Redeem"}
 </button>
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 {/* Transaction Progress Modal */}
 {progressModal && (
 <TransactionProgressModal
 isOpen={progressModal.isOpen}
 onClose={() => {
 setProgressModal(null);
 // Reset form if all steps completed
 if (progressModal.steps.every((s) => s.status ==="completed")) {
 setAmount("");
 setStep("input");
 }
 }}
 title={progressModal.title}
 steps={progressModal.steps}
 currentStepIndex={progressModal.currentStepIndex}
 />
 )}
 </div>
 );
};
