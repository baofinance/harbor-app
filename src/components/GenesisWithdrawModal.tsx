"use client";

import React, { useState } from "react";
import { parseEther, formatEther } from "viem";
import {
 useAccount,
 useWriteContract,
 usePublicClient,
 useSimulateContract,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import { BaseError, ContractFunctionRevertedError } from "viem";
import {
 TransactionProgressModal,
 TransactionStep,
} from "./TransactionProgressModal";
import { useCollateralPrice } from "@/hooks/useCollateralPrice";
import { formatTokenAmount, formatBalance } from "@/utils/formatters";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";

interface GenesisWithdrawalModalProps {
 isOpen: boolean;
 onClose: () => void;
 genesisAddress: string;
 collateralSymbol: string;
 userDeposit: bigint;
priceOracleAddress?: string;
 coinGeckoId?: string;
 onSuccess?: () => void;
 embedded?: boolean;
}

// formatTokenAmount is now imported from utils/formatters

const genesisABI = [
 {
 inputs: [
 { name:"amount", type:"uint256" },
 { name:"receiver", type:"address" },
 ],
 name:"withdraw",
 outputs: [{ type:"uint256", name:"collateralOut" }],
 stateMutability:"nonpayable",
 type:"function",
 },
] as const;

type ModalStep ="input" |"withdrawing" |"success" |"error";

export const GenesisWithdrawModal = ({
 isOpen,
 onClose,
 genesisAddress,
 collateralSymbol,
 userDeposit,
priceOracleAddress,
 coinGeckoId,
 onSuccess,
 embedded = false,
}: GenesisWithdrawalModalProps) => {
 const { address } = useAccount();
 const [amount, setAmount] = useState("");
 const [step, setStep] = useState<ModalStep>("input");
 const [error, setError] = useState<string | null>(null);
 const [txHash, setTxHash] = useState<string | null>(null);
 const [progressModalOpen, setProgressModalOpen] = useState(false);
 const [progressSteps, setProgressSteps] = useState<TransactionStep[]>([]);
 const [currentStepIndex, setCurrentStepIndex] = useState(0);
 const publicClient = usePublicClient();

// Fetch CoinGecko price (primary source)
const { price: coinGeckoPrice } = useCoinGeckoPrice(
  coinGeckoId || "",
  60000 // Refresh every 60 seconds
);

// Get collateral price from oracle (fallback)
const oraclePriceData = useCollateralPrice(
  priceOracleAddress as `0x${string}` | undefined,
  { enabled: isOpen && !!priceOracleAddress }
);

// Determine if the collateral token is a wrapped asset (fxSAVE, wstETH)
const isWrappedToken =
  collateralSymbol.toLowerCase() === "fxsave" ||
  collateralSymbol.toLowerCase() === "wsteth";

// Check if CoinGecko ID is for the wrapped token itself (e.g., "wrapped-steth" for wstETH, "fx-usd-saving" for fxSAVE)
// If so, CoinGecko already returns the wrapped token price, so we shouldn't multiply by wrapped rate
const coinGeckoIsWrappedToken = coinGeckoId && (
  (coinGeckoId.toLowerCase() === "wrapped-steth" && collateralSymbol.toLowerCase() === "wsteth") ||
  ((coinGeckoId.toLowerCase() === "fxsave" || coinGeckoId.toLowerCase() === "fx-usd-saving") && collateralSymbol.toLowerCase() === "fxsave")
);

// Priority order for UNDERLYING price: CoinGecko → Hardcoded $1 (for fxUSD/fxSAVE) → Oracle
// For fxSAVE (wrapped fxUSD), we use $1.00 as the underlying price
const underlyingPriceUSD = coinGeckoPrice
  ? coinGeckoPrice
  : collateralSymbol.toLowerCase() === "fxusd" || collateralSymbol.toLowerCase() === "fxsave"
  ? 1.0
  : oraclePriceData.priceUSD;

// Get wrapped rate from oracle to calculate wrapped token price
const wrappedRate =
  oraclePriceData?.maxRate !== undefined
    ? Number(oraclePriceData.maxRate) / 1e18
    : undefined;

// Calculate wrapped collateral price
// IMPORTANT: If CoinGecko returns the wrapped token price directly, use it without multiplying by wrapped rate
// Otherwise, multiply underlying price by wrapped rate
const collateralPriceUSD =
  // If CoinGecko returns the wrapped token price directly (e.g., "wrapped-steth" for wstETH)
  coinGeckoIsWrappedToken && coinGeckoPrice != null
    ? coinGeckoPrice // Use CoinGecko price directly (already wrapped)
    // If CoinGecko returns underlying price and we have wrapped rate, multiply
    : coinGeckoPrice != null && !coinGeckoIsWrappedToken && wrappedRate
    ? underlyingPriceUSD * wrappedRate
    // If CoinGecko returns underlying price but no wrapped rate, use underlying price
    : coinGeckoPrice != null && !coinGeckoIsWrappedToken
    ? underlyingPriceUSD
    // Fallback: use oracle price with wrapped rate if available
    : isWrappedToken && wrappedRate && wrappedRate > 0
    ? underlyingPriceUSD * wrappedRate
    : underlyingPriceUSD;

 // Contract write hooks
 const { writeContractAsync } = useWriteContract();

 const amountBigInt = amount ? parseEther(amount) : 0n;
 // Calculate withdraw amount - if amount equals or exceeds userDeposit, use userDeposit
 const withdrawAmount =
 amountBigInt > 0n && amountBigInt >= userDeposit
 ? userDeposit
 : amountBigInt;

 // Calculate remaining deposit
 const isMaxWithdrawal = amountBigInt > 0n && amountBigInt >= userDeposit;
 const remainingDeposit = isMaxWithdrawal ? 0n : userDeposit - amountBigInt;

 const { data: simulateData, error: simulateError } = useSimulateContract({
 address: genesisAddress as `0x${string}`,
 abi: genesisABI,
 functionName:"withdraw",
 args: [withdrawAmount, address as `0x${string}`],
 chainId: mainnet.id,
 query: {
 enabled:
 !!address &&
 !!genesisAddress &&
 !!amount &&
 parseFloat(amount) > 0 &&
 withdrawAmount > 0n,
 },
 });
 const handleClose = () => {
 // Allow closing even during transaction - transaction will continue in background
 setAmount("");
 setStep("input");
 setError(null);
 setTxHash(null);
 setProgressModalOpen(false);
 setProgressSteps([]);
 setCurrentStepIndex(0);
 onClose();
 };

 const handleMaxClick = () => {
 if (userDeposit > 0n) {
 setAmount(formatEther(userDeposit));
 }
 };

 const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const value = e.target.value;
 // Allow only numbers and decimal point
 if (value ==="" || /^\d*\.?\d*$/.test(value)) {
 // Cap at user deposit if value exceeds it
 if (value && userDeposit > 0n) {
 try {
 const parsed = parseEther(value);
 if (parsed > userDeposit) {
 setAmount(formatEther(userDeposit));
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

 if (userDeposit === 0n) {
 setError("No deposit available to withdraw");
 return false;
 }

 if (amountBigInt > userDeposit) {
 setError("Amount exceeds your deposit");
 return false;
 }

 return true;
 };

 const handleWithdraw = async () => {
 if (!validateAmount()) return;

 // Check if simulation failed
 if (simulateError) {
 setError("Transaction will fail:" + simulateError.message);
 return;
 }

 try {
 // Initialize progress modal
 const steps: TransactionStep[] = [
 {
 id:"withdraw",
 label:"Withdraw from Genesis",
 status:"pending",
 },
 ];
 setProgressSteps(steps);
 setCurrentStepIndex(0);
 setProgressModalOpen(true);

 setStep("withdrawing");
 setError(null);
 setProgressSteps((prev) =>
 prev.map((s) =>
 s.id ==="withdraw" ? { ...s, status:"in_progress" } : s
 )
 );

 const hash = await writeContractAsync({
 address: genesisAddress as `0x${string}`,
 abi: genesisABI,
 functionName:"withdraw",
 args: [withdrawAmount, address as `0x${string}`],
 chainId: mainnet.id,
 });

 setTxHash(hash);
 setProgressSteps((prev) =>
 prev.map((s) => (s.id ==="withdraw" ? { ...s, txHash: hash } : s))
 );
 await publicClient?.waitForTransactionReceipt({ hash });

 setStep("success");
 setProgressSteps((prev) =>
 prev.map((s) =>
 s.id ==="withdraw" ? { ...s, status:"completed" } : s
 )
 );
 if (onSuccess) {
 await onSuccess();
 }
 } catch (err) {
 console.error("Withdrawal error:", err);
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
 setProgressSteps((prev) =>
 prev.map((s, idx) =>
 idx === currentStepIndex
 ? { ...s, status:"error", error: errorMessage }
 : s
 )
 );
 }
 };

 const renderSuccessContent = () => {
// Format the success amount with USD
const successAmountNum = parseFloat(amount || "0");
const successAmountFormatted = successAmountNum > 0 
  ? successAmountNum.toFixed(6).replace(/\.?0+$/, "") 
  : "0";
const successUSD = successAmountNum > 0 && collateralPriceUSD > 0
  ? successAmountNum * collateralPriceUSD
  : null;

 return (
 <div className="space-y-3">
 <div className="p-3 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/30 text-center">
 <p className="text-sm text-[#1E4775]/80">Withdrawal successful!</p>
 {amount && (
<>
 <p className="text-lg font-bold text-[#1E4775] font-mono mt-1">
{successAmountFormatted} {collateralSymbol}
 </p>
{successUSD && (
<p className="text-sm text-[#1E4775]/60">
(≈ ${successUSD < 0.01 ? successUSD.toFixed(4) : successUSD.toFixed(2)})
</p>
)}
</>
 )}
 </div>
 </div>
 );
 };

 if (!isOpen && !progressModalOpen) return null;

  // Withdraw form content
  const formContent = (
    <div className="space-y-4 sm:space-y-6">
 {/* Balance */}
{(() => {
  const depositFmt = formatTokenAmount(
    userDeposit,
    collateralSymbol,
    collateralPriceUSD
  );
  return (
 <div className="text-sm text-[#1E4775]/70">
      Your Deposit:{" "}
 <span className="font-medium text-[#1E4775]">
        {depositFmt.display}
        {depositFmt.usd && <span className="text-[#1E4775]/50 ml-1">({depositFmt.usd})</span>}
 </span>
 </div>
  );
})()}

 {/* Amount Input */}
 <div className="space-y-2">
 {/* Available Balance */}
 <div className="flex justify-between items-center text-xs">
 <span className="text-[#1E4775]/70">Amount</span>
 <span className="text-[#1E4775]/70">
Available: {formatTokenAmount(userDeposit, collateralSymbol).display}
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
 disabled={step ==="withdrawing"}
 />
 <button
 onClick={handleMaxClick}
 className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 rounded-full"
 disabled={step ==="withdrawing"}
 >
 MAX
 </button>
 </div>
 </div>

 {/* Harbor Marks Warning - Always visible */}
 <div className="p-3 bg-orange-50 border border-orange-200 text-sm">
 <div className="flex items-start gap-2">
 <span className="text-orange-600 font-bold text-base">
 ⚠️
 </span>
 <div className="flex-1 space-y-1">
 <div className="font-medium text-orange-800">
 Harbor Marks Warning
 </div>
 <div className="text-orange-700 text-xs leading-relaxed">
 Withdrawing forfeits any Harbor Marks for withdrawn
 assets. Only assets deposited at the end of Maiden Voyage
 are eligible for Harbor Marks earned throughout the Maiden
 Voyage period.
 </div>
 </div>
 </div>
 </div>

 {/* Transaction Preview */}
 {amount && parseFloat(amount ||"0") > 0 && (
 <div className="space-y-3">
 <div className="p-3 bg-[#17395F]/10 border border-[#1E4775]/20 space-y-2 text-sm">
 <div className="font-medium text-[#1E4775]">
 Transaction Preview:
 </div>
{(() => {
  const currentFmt = formatTokenAmount(
    userDeposit,
    collateralSymbol,
    collateralPriceUSD
  );
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[#1E4775]/70">Current Deposit:</span>
 <span className="text-[#1E4775]">
        {currentFmt.display}
        {currentFmt.usd && <span className="text-[#1E4775]/50 ml-1">({currentFmt.usd})</span>}
 </span>
 </div>
  );
})()}
{(() => {
  const withdrawAmt = isMaxWithdrawal ? userDeposit : amountBigInt;
  const withdrawFmt = formatTokenAmount(
    withdrawAmt,
    collateralSymbol,
    collateralPriceUSD
  );
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[#1E4775]/70">- Withdraw Amount:</span>
 <span className="text-red-600">
        -{withdrawFmt.display}
        {withdrawFmt.usd && <span className="text-red-400 ml-1">(-{withdrawFmt.usd})</span>}
 </span>
 </div>
  );
})()}
 <div className="border-t border-[#1E4775]/20 pt-2">
{(() => {
  const remainingFmt = formatTokenAmount(
    remainingDeposit,
    collateralSymbol,
    collateralPriceUSD
  );
  return (
    <div className="flex justify-between items-baseline font-medium">
      <span className="text-[#1E4775]">Remaining Deposit:</span>
      <span className={remainingDeposit === 0n ? "text-orange-600" : "text-[#1E4775]"}>
        {remainingFmt.display}
        {remainingFmt.usd && <span className={`font-normal ml-1 ${remainingDeposit === 0n ? "text-orange-400" : "text-[#1E4775]/50"}`}>({remainingFmt.usd})</span>}
 </span>
 </div>
  );
})()}
 </div>
 </div>
 </div>
 )}

 {/* Error */}
 {error && (
 <div className="p-3 bg-red-50 border border-red-500/30 text-red-600 text-sm">
 {error}
 </div>
 )}

 {/* Transaction Hash */}
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

 {/* Success Message */}
 {step ==="success" && (
 <div className="p-3 bg-[rgb(var(--surface-selected-rgb))]/30 border border-[rgb(var(--surface-selected-border-rgb))]/50 text-[#1E4775] text-sm text-center">
 ✅ Withdrawal successful!
 </div>
 )}

      {/* Submit Button */}
      <div>
 <button
 onClick={handleWithdraw}
 disabled={
            step === "withdrawing" ||
 !amount ||
 parseFloat(amount) <= 0 ||
 userDeposit === 0n ||
 !!simulateError
 }
          className={`w-full py-3 px-4 font-medium transition-colors rounded-full ${
            step === "success"
              ? "bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white"
              : "bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white disabled:bg-gray-300 disabled:text-gray-500"
 }`}
 >
          {step === "withdrawing"
            ? "Withdrawing..."
            : step === "error"
            ? "Try Again"
            : "Withdraw"}
 </button>
      </div>
    </div>
  );

  // If embedded, return just the content + progress modal
  if (embedded) {
    return (
      <>
        {progressModalOpen && (
          <TransactionProgressModal
            isOpen={progressModalOpen}
            onClose={handleClose}
            title="Processing Withdrawal"
            steps={progressSteps}
            currentStepIndex={currentStepIndex}
            canCancel={false}
            errorMessage={error || undefined}
            renderSuccessContent={renderSuccessContent}
          />
        )}
        {!progressModalOpen && formContent}
      </>
    );
  }

  // Full standalone modal
  return (
    <>
      {progressModalOpen && (
        <TransactionProgressModal
          isOpen={progressModalOpen}
          onClose={handleClose}
          title="Processing Withdrawal"
          steps={progressSteps}
          currentStepIndex={currentStepIndex}
          canCancel={true}
          errorMessage={error || undefined}
          renderSuccessContent={renderSuccessContent}
        />
      )}

      {!progressModalOpen && isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          <div
            className="relative bg-white shadow-2xl w-full max-w-md mx-2 sm:mx-4 animate-in fade-in-0 scale-in-95 duration-200 rounded-none max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
            style={{ borderRadius: 0 }}
          >
            <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-[#1E4775]/20">
              <h2 className="text-lg sm:text-2xl font-bold text-[#1E4775]">
                Withdraw from Maiden Voyage
              </h2>
              <button
                onClick={handleClose}
                className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
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

            <div className="p-3 sm:p-4 lg:p-6">
              {formContent}
 </div>
 </div>
 </div>
 )}
 </>
 );
};