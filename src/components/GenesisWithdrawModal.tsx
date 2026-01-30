"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
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
import { formatTokenAmount, formatBalance, formatUSD } from "@/utils/formatters";
import {
  DEFAULT_MODAL_OPTIONS,
  MODAL_ERROR_MESSAGES,
  DEFAULT_AMOUNT,
  DEFAULT_ERROR,
  DEFAULT_TX_HASH,
  DEFAULT_PROGRESS_MODAL_OPEN,
  DEFAULT_PROGRESS_STEPS,
  DEFAULT_CURRENT_STEP_INDEX,
} from "@/utils/modal";
import { validateAmountForWithdraw, validateAmountInput } from "@/utils/validation";
import { useWrappedCollateralPrice } from "@/hooks/useWrappedCollateralPrice";
import { AmountInputBlock } from "@/components/AmountInputBlock";
import {
  ActionButtons,
  ErrorBanner,
  NotificationsSection,
  TransactionOverviewCard,
  type OverviewRow,
  type NotificationItem,
} from "@/components/modal";
import { GENESIS_ABI } from "@/abis/shared";

interface GenesisWithdrawalModalProps {
 isOpen: boolean;
 onClose: () => void;
 genesisAddress: string;
 collateralSymbol: string;
 userDeposit: bigint;
priceOracleAddress?: string;
 coinGeckoId?: string;
 peggedTokenSymbol?: string; // haToken symbol (e.g., "haETH", "haBTC", "haEUR")
 onSuccess?: () => void;
 embedded?: boolean;
 hideSectionHeading?: boolean;
}

// formatTokenAmount is now imported from utils/formatters

type ModalStep ="input" |"withdrawing" |"success" |"error";

export const GenesisWithdrawModal = ({
 isOpen,
 onClose,
 genesisAddress,
 collateralSymbol,
 userDeposit,
priceOracleAddress,
 coinGeckoId,
 peggedTokenSymbol,
 onSuccess,
 embedded = false,
 hideSectionHeading = false,
}: GenesisWithdrawalModalProps) => {
 const { address } = useAccount();
 const [amount, setAmount] = useState(DEFAULT_AMOUNT);
 const [step, setStep] = useState<ModalStep>("input");
 const [error, setError] = useState<string | null>(DEFAULT_ERROR);
 const [txHash, setTxHash] = useState<string | null>(DEFAULT_TX_HASH);
 const [progressModalOpen, setProgressModalOpen] = useState(DEFAULT_PROGRESS_MODAL_OPEN);
 const [progressSteps, setProgressSteps] = useState(DEFAULT_PROGRESS_STEPS);
 const [currentStepIndex, setCurrentStepIndex] = useState(DEFAULT_CURRENT_STEP_INDEX);
 const [showNotifications, setShowNotifications] = useState(DEFAULT_MODAL_OPTIONS.showNotifications);
 const publicClient = usePublicClient();

const wrappedPriceData = useWrappedCollateralPrice({
  isOpen,
  collateralSymbol,
  coinGeckoId,
  priceOracle: priceOracleAddress as `0x${string}` | undefined,
});
const collateralPriceUSD = wrappedPriceData.priceUSD;

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
 abi: GENESIS_ABI,
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
   if (!validateAmountInput(value)) return;
   if (value && userDeposit > 0n) {
     try {
       const parsed = parseEther(value);
       if (parsed > userDeposit) {
         setAmount(formatEther(userDeposit));
         setError(null);
         return;
       }
     } catch {
       /* allow partial input */
     }
   }
   setAmount(value);
   setError(null);
 };

 const validateAmount = (): boolean => {
   const result = validateAmountForWithdraw(amount, userDeposit, {
     invalidAmountMessage: MODAL_ERROR_MESSAGES.INVALID_AMOUNT,
     exceedsMaxMessage: MODAL_ERROR_MESSAGES.AMOUNT_EXCEEDS_DEPOSIT,
     noMaxMessage: MODAL_ERROR_MESSAGES.NO_DEPOSIT_TO_WITHDRAW,
   });
   if (!result.valid) {
     setError(result.error ?? MODAL_ERROR_MESSAGES.INVALID_AMOUNT);
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
 abi: GENESIS_ABI,
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

 const errAny = err as { code?: number; message?: string; name?: string };
 const errCode = typeof errAny?.code === "number" ? errAny.code : undefined;
 const errMsg = (errAny?.message ?? "") + (errAny?.name ?? "");
 const lowerMessage = errMsg.toLowerCase();
 const isUserRejection =
   lowerMessage.includes("user rejected") ||
   lowerMessage.includes("user denied") ||
   lowerMessage.includes("rejected the request") ||
   errAny?.name === "UserRejectedRequestError" ||
   errCode === 4001 ||
   errCode === 4900;

 if (isUserRejection) {
   errorMessage = "Transaction was rejected. Please try again.";
 } else if (err instanceof BaseError) {
   const revertError = err.walk(
     (e) => e instanceof ContractFunctionRevertedError
   );
   if (revertError instanceof ContractFunctionRevertedError) {
     errorMessage = `Contract error: ${
       revertError.data?.errorName || "Unknown error"
     }`;
   } else {
     errorMessage = err.shortMessage || err.message;
   }
 }

 setError(errorMessage);
 setStep("error");
 setProgressModalOpen(false);
 setProgressSteps([]);
 setCurrentStepIndex(0);
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
      {!hideSectionHeading && (
        <div className="flex items-center justify-center text-xs text-[#1E4775]/50 pb-3 border-b border-[#d1d7e5]">
          <div className="text-[#1E4775] font-semibold">
            Withdraw Collateral & Amount
          </div>
        </div>
      )}
 {/* Balance */}
{(() => {
  const depositFmt = formatTokenAmount(
    userDeposit,
    collateralSymbol,
    collateralPriceUSD
  );
  return (
 <div className="flex justify-between items-center text-sm">
      <span className="font-semibold text-[#1E4775]">Your Position:</span>
 <span className="text-[#1E4775]">
        {depositFmt.display}
        {depositFmt.usd && <span className="text-[#1E4775]/50 ml-1">({depositFmt.usd})</span>}
 </span>
 </div>
  );
})()}

 {/* Notifications Section */}
 <NotificationsSection
   notifications={[
     {
       tone: "warning",
       title: "Harbor Marks Warning: ",
       icon: <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />,
       content:
         "Withdrawing forfeits any Harbor Marks for withdrawn assets. Only assets deposited at the end of Maiden Voyage are eligible for Harbor Marks earned throughout the Maiden Voyage period.",
     },
   ]}
   expanded={showNotifications}
   onToggle={() => setShowNotifications((prev) => !prev)}
   badgeCount={1}
   badgeColor="amber"
 />

 {/* Amount Input */}
 <AmountInputBlock
   label="Enter Amount"
   value={amount}
   onChange={handleAmountChange}
   onMax={handleMaxClick}
   disabled={step === "withdrawing"}
   error={error}
   balanceContent={
     <>
       Available: {formatTokenAmount(userDeposit, collateralSymbol).display}
     </>
   }
   inputClassName={`w-full px-3 pr-20 py-2 bg-white text-[#1E4775] border ${
     error ? "border-red-500" : "border-[#1E4775]/30"
   } focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-lg font-mono`}
 />

{/* Transaction Overview */}
{amount && parseFloat(amount || "0") > 0 && (() => {
  const currentFmt = formatTokenAmount(userDeposit, collateralSymbol, collateralPriceUSD);
  const withdrawAmt = isMaxWithdrawal ? userDeposit : amountBigInt;
  const withdrawFmt = formatTokenAmount(withdrawAmt, collateralSymbol, collateralPriceUSD);
  const remainingFmt = formatTokenAmount(remainingDeposit, collateralSymbol, collateralPriceUSD);
  const remainingUSD =
    remainingDeposit > 0n && collateralPriceUSD > 0
      ? (Number(remainingDeposit) / 1e18) * collateralPriceUSD
      : 0;
  const remainingUSDFormatted = remainingUSD > 0 ? formatUSD(remainingUSD) : undefined;
  const rows: OverviewRow[] = [
    {
      label: "Current Deposit:",
      value: currentFmt.display,
      subValue: currentFmt.usd ? `(${currentFmt.usd})` : undefined,
    },
    {
      label: "- Withdraw Amount:",
      value: `-${withdrawFmt.display}`,
      subValue: withdrawFmt.usd ? `(-${withdrawFmt.usd})` : undefined,
    },
    {
      label: "Remaining Deposit:",
      value:
        remainingDeposit === 0n ? (
          <span className="text-orange-600">{remainingFmt.display}</span>
        ) : (
          remainingFmt.display
        ),
      subValue: remainingUSDFormatted ?? undefined,
      subValueClassName: remainingDeposit === 0n ? "text-orange-400" : undefined,
    },
  ];
  return <TransactionOverviewCard rows={rows} />;
})()}

 {/* Error - beneath transaction overview */}
 {error && <ErrorBanner message={error} />}

 {/* Transaction Hash */}
 {txHash && (
 <div className="text-xs text-center text-[#1E4775]/70">
 Tx:{" "}
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
      <ActionButtons
        primaryLabel={
          step === "withdrawing" ? "Withdrawing..." : step === "error" ? "Try Again" : "Withdraw"
        }
        primaryAction={handleWithdraw}
        primaryDisabled={
          step === "withdrawing" ||
          !amount ||
          parseFloat(amount) <= 0 ||
          userDeposit === 0n ||
          !!simulateError
        }
        variant="pearl"
      />
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
            progressVariant="horizontal"
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
          progressVariant="horizontal"
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