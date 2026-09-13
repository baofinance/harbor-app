"use client";

import React, { useState } from "react";
import { AlertOctagon, AlertTriangle, Bell } from "lucide-react";
import { parseEther, formatEther } from "viem";
import {
 useAccount,
 useWriteContract,
 usePublicClient,
 useSimulateContract,
 useSwitchChain,
 useChainId,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import { BaseError, ContractFunctionRevertedError } from "viem";
import {
 TransactionProgressModal,
 TransactionStep,
} from "./TransactionProgressModal";
import { useTransactionProgress } from "@/hooks/useTransactionProgress";
import { formatTokenAmount } from "@/utils/formatters";
import { useWrappedCollateralPrice } from "@/hooks/useWrappedCollateralPrice";
import { ModalNotificationsPanel } from "@/components/ModalNotificationsPanel";
import { DepositModalShell } from "@/components/DepositModalShell";
import { DepositModalFlowOverview } from "@/components/DepositModalFlowOverview";
import { DepositModalTitle } from "@/components/DepositModalTitle";
import { DepositModalTabHeader } from "@/components/DepositModalTabHeader";
import { DepositModalLayout } from "@/components/deposit/DepositModalLayout";
import { GenesisWithdrawTransactionOverview } from "@/components/genesis/GenesisWithdrawTransactionOverview";
import { DepositAmountCard } from "@/components/deposit/DepositAmountCard";
import { DepositActionFooter } from "@/components/deposit/DepositActionFooter";
import type { DepositPrimaryAction } from "@/utils/depositFormState";
import { genesisWithdrawFlowParts } from "@/components/depositModalFlowSteps";
import { depositModalNotificationBadgeClass } from "@/components/depositModalNotificationStyles";
import { InfoCallout } from "@/components/InfoCallout";

interface GenesisWithdrawalModalProps {
 isOpen: boolean;
 onClose: () => void;
 genesisAddress: string;
 collateralSymbol: string;
 userDeposit: bigint;
 priceOracleAddress?: string;
 coinGeckoId?: string;
 /** Chain ID where the genesis contract lives (e.g. 1 mainnet, 4326 MegaETH). Defaults to mainnet. */
 chainId?: number;
 onSuccess?: () => void;
 embedded?: boolean;
 /** Optional chrome above the form (e.g. Deposit|Withdraw tabs) when embedded. */
 panelHeader?: React.ReactNode;
}

// formatTokenAmount is now imported from utils/formatters
import { GENESIS_ABI } from "@/abis/shared";

type ModalStep ="input" |"withdrawing" |"success" |"error";

export const GenesisWithdrawModal = ({
 isOpen,
 onClose,
 genesisAddress,
 collateralSymbol,
 userDeposit,
 priceOracleAddress,
 coinGeckoId,
 chainId = mainnet.id,
 onSuccess,
 embedded = false,
 panelHeader,
}: GenesisWithdrawalModalProps) => {
 const { address } = useAccount();
 const [amount, setAmount] = useState("");
 const [step, setStep] = useState<ModalStep>("input");
 const [error, setError] = useState<string | null>(null);
 const [txHash, setTxHash] = useState<string | null>(null);
 const [showNotifications, setShowNotifications] = useState(false);
 const progress = useTransactionProgress();
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
 const { switchChain } = useSwitchChain();
 const connectedChainId = useChainId();
 const marketChainId = chainId ?? mainnet.id;

 const ensureCorrectNetwork = async (): Promise<boolean> => {
   if (connectedChainId === marketChainId) return true;
   try {
     await switchChain({ chainId: marketChainId });
     return true;
   } catch (err) {
     if (process.env.NODE_ENV === "development") console.warn("[GenesisWithdraw] Switch network rejected:", err);
     setError(`Please switch to ${marketChainId === 4326 ? "MegaETH" : "Ethereum Mainnet"} to withdraw.`);
     return false;
   }
 };

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
 chainId,
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
 progress.reset();
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

 // Switch to market chain only when user starts the transaction (not on modal open)
 if (!(await ensureCorrectNetwork())) return;

 try {
 const steps: TransactionStep[] = [
 {
 id:"withdraw",
 label:"Withdraw from Genesis",
 status:"pending",
 },
 ];
 progress.open(steps, "Processing Withdrawal");
 setStep("withdrawing");
 setError(null);
 progress.updateStep("withdraw", { status: "in_progress" });

 const hash = await writeContractAsync({
 address: genesisAddress as `0x${string}`,
 abi: GENESIS_ABI,
 functionName:"withdraw",
 args: [withdrawAmount, address as `0x${string}`],
 chainId,
 });

 setTxHash(hash);
 progress.updateStep("withdraw", { txHash: hash });
 await publicClient?.waitForTransactionReceipt({ hash });

 setStep("success");
 progress.updateStep("withdraw", { status: "completed" });
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
 progress.updateStep("withdraw", { status: "error", error: errorMessage });
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

 if (!isOpen && !progress.isOpen) return null;

  const depositFmt = formatTokenAmount(
    userDeposit,
    collateralSymbol,
    collateralPriceUSD
  );
  const hasWithdrawPreview = Boolean(amount && parseFloat(amount) > 0);
  const isProcessing = step === "withdrawing";
  const withdrawDisabled =
    step === "error"
      ? false
      : isProcessing ||
        !amount ||
        parseFloat(amount) <= 0 ||
        userDeposit === 0n ||
        !!simulateError;

  // Withdraw form content (Anchor-style layout)
  const primaryAction: DepositPrimaryAction = (() => {
    if (step === "error") return { kind: "retry" };
    if (isProcessing) {
      return { kind: "enter_amount", label: "Withdrawing..." };
    }
    if (withdrawDisabled) {
      return { kind: "enter_amount", label: "Withdraw" };
    }
    return { kind: "submit", label: "Withdraw", variant: "navy" };
  })();

  const formContent = (
    <DepositModalLayout
      header={embedded ? panelHeader : undefined}
      className={embedded ? "h-full pt-2.5 sm:pt-3" : undefined}
      flowOverview={
        <DepositModalFlowOverview parts={genesisWithdrawFlowParts()} />
      }
      scroll={
        <>
      {!embedded ? (
        <ModalNotificationsPanel
          expanded={showNotifications}
          onToggle={() => setShowNotifications((prev) => !prev)}
          badge={
            <span
              className={`flex items-center gap-1 px-2 py-0.5 text-xs ${depositModalNotificationBadgeClass.coral}`}
            >
              <Bell className="h-3 w-3" />
              1
            </span>
          }
        >
          <InfoCallout
            tone="pearl"
            icon={
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#D57A3D]" />
            }
            title="Harbor Marks Warning:"
          >
            Withdrawing forfeits any <span className="font-semibold">Harbor Marks</span>{" "}
            for withdrawn assets. Only assets still deposited at genesis close are
            eligible for completion bonus marks earned during the genesis period.
          </InfoCallout>
        </ModalNotificationsPanel>
      ) : null}

      <DepositAmountCard
        showTokenSelector={false}
        amount={{
          value: amount,
          setValue: setAmount,
          balance: userDeposit,
          decimals: 18,
          disabled: isProcessing,
          error,
          capAtBalance: false,
          onErrorClear: () => setError(null),
          balanceSymbol: collateralSymbol,
          balanceMaxDecimals: 6,
          customHandleChange: handleAmountChange,
          customHandleMax: handleMaxClick,
        }}
        betweenTokenAndAmount={
          <div className="text-xs text-[#1E4775]/70">
            Your deposit: {depositFmt.display}
            {depositFmt.usd ? ` (${depositFmt.usd})` : ""}
          </div>
        }
        disabled={isProcessing}
      />
{error ? (
        <div className="p-3 bg-red-50 border border-red-500/30 text-red-600 text-sm text-center flex items-center justify-center gap-2">
          <AlertOctagon className="w-4 h-4 flex-shrink-0" aria-hidden />
          {error}
        </div>
      ) : null}

      {isProcessing && !progress.isOpen ? (
        <div className="text-center py-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-[#1E4775]" />
          <p className="mt-2 text-sm text-[#1E4775]">Withdrawing collateral...</p>
        </div>
      ) : null}
        </>
      }
      overview={
        <GenesisWithdrawTransactionOverview
          amount={amount}
          collateralSymbol={collateralSymbol}
          userDeposit={userDeposit}
          withdrawAmount={isMaxWithdrawal ? userDeposit : amountBigInt}
          remainingDeposit={remainingDeposit}
          collateralPriceUSD={collateralPriceUSD}
          hasPreview={hasWithdrawPreview}
        />
      }
            footer={
        isProcessing ? undefined : (
          <DepositActionFooter
            layout={embedded ? "embedded" : "modal"}
            showCancel={!embedded}
            cancelLabel="Cancel"
            onCancel={handleClose}
            action={primaryAction}
            onSubmit={handleWithdraw}
            onRetry={handleWithdraw}
          />
        )
      }
    />
  );

  // If embedded, return just the content + progress modal
  if (embedded) {
    return (
      <>
        {progress.isOpen && (
          <TransactionProgressModal
            isOpen={progress.isOpen}
            onClose={handleClose}
            title={progress.title}
            steps={progress.steps}
            currentStepIndex={progress.currentStepIndex}
            progressVariant="horizontal"
            canCancel={false}
            errorMessage={error || undefined}
            renderSuccessContent={renderSuccessContent}
          />
        )}
        {!progress.isOpen && (
          <div className="flex h-full min-h-0 flex-col">{formContent}</div>
        )}
      </>
    );
  }

  // Full standalone modal
  return (
    <>
      {progress.isOpen && (
        <TransactionProgressModal
          isOpen={progress.isOpen}
          onClose={handleClose}
          title={progress.title}
          steps={progress.steps}
          currentStepIndex={progress.currentStepIndex}
          progressVariant="horizontal"
          canCancel={true}
          errorMessage={error || undefined}
          renderSuccessContent={renderSuccessContent}
        />
      )}

      {!progress.isOpen && isOpen && (
        <DepositModalShell
          isOpen={isOpen}
          onClose={handleClose}
          title={
            <DepositModalTitle
              protocolName="Genesis"
              tokenSymbol={collateralSymbol}
              actionLabel="Withdraw"
            />
          }
          tabs={
            <DepositModalTabHeader
              tabs={[{ value: "withdraw", label: "Withdraw" }]}
              activeTab="withdraw"
              onTabChange={() => {}}
            />
          }
        >
          {formContent}
        </DepositModalShell>
      )}
 </>
 );
};