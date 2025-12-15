"use client";

import React, { useState } from"react";
import { parseEther, formatEther } from"viem";
import {
  useAccount,
  useBalance,
  useContractRead,
  useWriteContract,
  usePublicClient,
} from"wagmi";
import { BaseError, ContractFunctionRevertedError } from"viem";
import { GENESIS_ABI, ERC20_ABI, contracts } from"../config/contracts";
import { ZAP_ABI, STETH_ABI, WSTETH_ABI } from"@/abis";
import { publicClient as mainnetPublicClient } from "@/config/rpc";
import { useContractRead as useCustomContractRead } from "@/hooks/useContractRead";
import { useCollateralPrice } from "@/hooks/useCollateralPrice";
import {
TransactionProgressModal,
TransactionStep,
} from"./TransactionProgressModal";

interface GenesisDepositModalProps {
isOpen: boolean;
onClose: () => void;
genesisAddress: string;
collateralAddress: string;
collateralSymbol: string;
acceptedAssets: Array<{ symbol: string; name: string }>;
marketAddresses?: {
collateralToken?: string;
wrappedCollateralToken?: string;
priceOracle?: string;
};
onSuccess?: () => void;
}

// Format a bigint token amount with limited decimals and optional USD value
function formatTokenAmount(
  amount: bigint,
  symbol: string,
  priceUSD?: number,
  maxDecimals: number = 6
): { formatted: string; usd: string | null } {
  const numValue = Number(formatEther(amount));
  
  // Format with limited decimals, removing trailing zeros
  let formatted: string;
  if (numValue === 0) {
    formatted = "0";
  } else if (numValue < 0.000001) {
    formatted = numValue.toExponential(2);
  } else {
    formatted = numValue.toFixed(maxDecimals).replace(/\.?0+$/, "");
  }
  
  // Calculate USD value if price is available
  let usd: string | null = null;
  if (priceUSD && priceUSD > 0 && numValue > 0) {
    const usdValue = numValue * priceUSD;
    if (usdValue < 0.01) {
      usd = `$${usdValue.toFixed(4)}`;
    } else if (usdValue < 1000) {
      usd = `$${usdValue.toFixed(2)}`;
    } else {
      usd = `$${usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
  }
  
  return { formatted, usd };
}

type ModalStep ="input" |"approving" |"depositing" |"success" |"error";

export const GenesisDepositModal = ({
 isOpen,
 onClose,
 genesisAddress,
 collateralAddress,
 collateralSymbol,
 acceptedAssets,
 marketAddresses,
 onSuccess,
}: GenesisDepositModalProps) => {
  const { address } = useAccount();
  const wagmiPublicClient = usePublicClient();
  // Use mainnet public client as fallback if wagmi client is not available
  const publicClient = wagmiPublicClient || mainnetPublicClient;
 const [amount, setAmount] = useState("");
 const [selectedAsset, setSelectedAsset] = useState<string>(collateralSymbol);
 const [step, setStep] = useState<ModalStep>("input");
 const [error, setError] = useState<string | null>(null);
 const [txHash, setTxHash] = useState<string | null>(null);
 const [progressModalOpen, setProgressModalOpen] = useState(false);
 const [progressSteps, setProgressSteps] = useState<TransactionStep[]>([]);
 const [currentStepIndex, setCurrentStepIndex] = useState(0);
const [successfulDepositAmount, setSuccessfulDepositAmount] =
useState<string>("");

// Get collateral price for USD display
const { priceUSD: collateralPriceUSD } = useCollateralPrice(
  marketAddresses?.priceOracle as `0x${string}` | undefined,
  { enabled: isOpen && !!marketAddresses?.priceOracle }
);

// Map selected asset to its token address
 const getAssetAddress = (assetSymbol: string): string => {
 const normalized = assetSymbol.toLowerCase();
 if (normalized === collateralSymbol.toLowerCase()) {
 // Collateral token (wstETH)
 return collateralAddress;
 } else if (
 normalized ==="steth" &&
 marketAddresses?.wrappedCollateralToken
 ) {
 // stETH (wrappedCollateralToken in config)
 return marketAddresses.wrappedCollateralToken;
 } else if (normalized ==="eth") {
 // Native ETH - return zero address as marker (will need special handling)
 return"0x0000000000000000000000000000000000000000";
 }
 // Default to collateral address
 return collateralAddress;
 };

const selectedAssetAddress = getAssetAddress(selectedAsset);
const isNativeETH = selectedAsset.toLowerCase() ==="eth";
const isStETH = selectedAsset.toLowerCase() ==="steth";
const zapAddress = contracts.zap as `0x${string}`;
const stETHAddress = contracts.wrappedCollateralToken as `0x${string}`; // stETH
const wstETHAddress = contracts.collateralToken as `0x${string}`; // wstETH

// Get ETH balance for native ETH deposits
const { data: ethBalance, isLoading: isEthBalanceLoading, isError: isEthBalanceError } = useBalance({
  address: address,
  query: {
    enabled: !!address && isOpen && isNativeETH,
  },
});

 // Debug logging
 if (process.env.NODE_ENV ==="development") {
 console.log("[GenesisDepositModal] Balance Debug:", {
 selectedAsset,
 selectedAssetAddress,
 collateralAddress,
 collateralSymbol,
 marketAddresses,
 address,
 isOpen,
 isNativeETH,
 });
 }

 // Contract read hooks - only for ERC20 tokens (not native ETH)
 // Use custom Anvil hook to bypass wagmi chain detection
 const {
 data: balanceData,
 error: balanceError,
 status: balanceStatus,
 } = useCustomContractRead({
 address: selectedAssetAddress as `0x${string}`,
 abi: ERC20_ABI,
 functionName:"balanceOf",
 args: address ? [address] : undefined,
 enabled:
 !!address &&
 isOpen &&
 !isNativeETH &&
 !!selectedAssetAddress &&
 selectedAssetAddress !=="0x0000000000000000000000000000000000000000",
 refetchInterval: 5000,
 });

 // Debug balance result
 if (process.env.NODE_ENV ==="development") {
 console.log("[GenesisDepositModal] Balance Result:", {
 balanceData,
 balanceError,
 balanceStatus,
 formattedBalance: balanceData ? formatEther(balanceData) :"N/A",
 });
 }

// For stETH, check allowance for zap contract; for other tokens, check allowance for genesis
const allowanceTarget = isStETH ? zapAddress : genesisAddress;
const { data: allowanceData, refetch: refetchAllowance } =
  useCustomContractRead({
    address: selectedAssetAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName:"allowance",
    args: address ? [address, allowanceTarget as `0x${string}`] : undefined,
    enabled:
      !!address &&
      isOpen &&
      !isNativeETH &&
      !!selectedAssetAddress &&
      selectedAssetAddress !=="0x0000000000000000000000000000000000000000",
    refetchInterval: 5000,
  });

 // Check if genesis has ended
 const { data: genesisEnded } = useCustomContractRead({
 address: genesisAddress as `0x${string}`,
 abi: GENESIS_ABI,
 functionName:"genesisIsEnded",
 enabled: !!genesisAddress && isOpen,
 });

 // Get current user deposit in Genesis
 const { data: currentDeposit } = useCustomContractRead({
 address: genesisAddress as `0x${string}`,
 abi: GENESIS_ABI,
 functionName:"balanceOf",
 args: address ? [address] : undefined,
 enabled: !!address && !!genesisAddress && isOpen,
 refetchInterval: 5000,
 });

 // Contract write hooks
 const { writeContractAsync } = useWriteContract();

  // For native ETH, use useBalance hook; for ERC20 tokens, use contract read
  // If there's an error or no data, default to 0
  const balance = isNativeETH 
    ? (ethBalance?.value || 0n)
    : balanceError 
    ? 0n 
    : balanceData || 0n;
const allowance = isNativeETH ? 0n : (typeof allowanceData === 'bigint' ? allowanceData : 0n);
const amountBigInt = amount ? parseEther(amount) : 0n;
const needsApproval =
!isNativeETH && amountBigInt > 0 && amountBigInt > allowance;
const userCurrentDeposit: bigint = typeof currentDeposit === 'bigint' ? currentDeposit : 0n;

// Calculate expected wstETH output for ETH deposits (for preview)
// Contract flow: ETH → stETH (via submit, 1:1) → wstETH (via wrap)
// For preview: ETH amount = stETH amount (1:1), then convert to wstETH
const { data: expectedWstETHFromETH } = useCustomContractRead({
  address: wstETHAddress,
  abi: WSTETH_ABI,
  functionName: "getWstETHByStETH",
  args: amountBigInt > 0n && isNativeETH ? [amountBigInt] : undefined, // stETH.submit() gives 1:1 ETH→stETH
  enabled: !!address && isOpen && isNativeETH && amountBigInt > 0n,
});

// Calculate expected wstETH output for stETH deposits (for preview)
const { data: expectedWstETHFromStETH } = useCustomContractRead({
  address: wstETHAddress,
  abi: WSTETH_ABI,
  functionName: "getWstETHByStETH",
  args: amountBigInt > 0n && isStETH ? [amountBigInt] : undefined,
  enabled: !!address && isOpen && isStETH && amountBigInt > 0n,
});

// Helper to safely extract bigint from hook result
const toBigInt = (value: unknown): bigint => {
  if (typeof value === 'bigint') return value;
  return 0n;
};

// Calculate the actual wstETH amount that will be deposited
const actualWstETHDeposit: bigint = isNativeETH
  ? toBigInt(expectedWstETHFromETH)
  : isStETH
  ? toBigInt(expectedWstETHFromStETH)
  : amountBigInt; // For wstETH, use the amount directly

// Calculate new total deposit using actual wstETH amount
const newTotalDepositActual: bigint = userCurrentDeposit + actualWstETHDeposit;

const isNonCollateralAsset =
selectedAsset.toLowerCase() !== collateralSymbol.toLowerCase();

 const handleClose = () => {
 if (step ==="approving" || step ==="depositing") return; // Prevent closing during transactions
 setAmount("");
 setSelectedAsset(collateralSymbol);
 setStep("input");
 setError(null);
 setTxHash(null);
 setSuccessfulDepositAmount("");
 setProgressModalOpen(false);
 setProgressSteps([]);
 setCurrentStepIndex(0);
 onClose();
 };

 const handleShareOnX = () => {
 const shareMessage = `Just secured my @0xharborfi airdrop with their maiden voyage. ⚓️

Predeposits are still open for a limited time - don't miss out!

https://www.harborfinance.io/`;
 const encodedMessage = encodeURIComponent(shareMessage);
 const xUrl = `https://x.com/intent/tweet?text=${encodedMessage}`;
 window.open(xUrl,"_blank","noopener,noreferrer");
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
 if (value && balance) {
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
 if (genesisEnded) {
 setError("Genesis period has ended");
 return false;
 }
 return true;
 };

const handleDeposit = async () => {
if (!validateAmount()) return;
try {
// Capture the current deposit balance BEFORE any transactions
// This prevents race conditions with the refetching hook
const preDepositBalance = userCurrentDeposit;

// Initialize progress modal steps
const steps: TransactionStep[] = [];
 const includeApproval = !isNativeETH && needsApproval;
 if (includeApproval) {
 steps.push({
 id:"approve",
 label: `Approve ${selectedAsset}`,
 status:"pending",
 });
 }
 steps.push({
 id:"deposit",
 label:"Deposit to Genesis",
 status:"pending",
 });
 setProgressSteps(steps);
 setCurrentStepIndex(0);
 setProgressModalOpen(true);

    // For non-native tokens, check and approve if needed
    if (!isNativeETH && needsApproval) {
      setStep("approving");
      setProgressSteps((prev) =>
        prev.map((s) =>
          s.id ==="approve" ? { ...s, status:"in_progress" } : s
        )
      );
      setError(null);
      setTxHash(null);
      const approveHash = await writeContractAsync({
        address: selectedAssetAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName:"approve",
        args: [allowanceTarget as `0x${string}`, amountBigInt],
        // chainId intentionally omitted to let wallet infer the network
      });
      setTxHash(approveHash);
      await publicClient?.waitForTransactionReceipt({ hash: approveHash });
      await refetchAllowance();

      // Give a moment for the blockchain state to update
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Force another refetch to ensure we have the latest allowance
      await refetchAllowance();

      setProgressSteps((prev) =>
        prev.map((s, idx) =>
          s.id ==="approve"
            ? { ...s, status:"completed", txHash: approveHash }
            : s
        )
      );
      setCurrentStepIndex(steps.findIndex((s) => s.id ==="deposit"));
    }

    setStep("depositing");
    setProgressSteps((prev) =>
      prev.map((s) =>
        s.id ==="deposit" ? { ...s, status:"in_progress" } : s
      )
    );
    setCurrentStepIndex(steps.findIndex((s) => s.id ==="deposit"));
    setError(null);
    setTxHash(null);

    // Use zap contract for ETH and stETH deposits
    let depositHash: `0x${string}`;
    if (isNativeETH) {
      // Use zapEth for ETH deposits with slippage protection
      // Contract flow: ETH → stETH (via submit, 1:1) → wstETH (via wrap) → Genesis
      // stETH.submit() returns stETH tokens 1:1 with ETH (not shares)
      const stETHAmount = amountBigInt; // ETH amount = stETH amount (1:1 from submit)
      
      // Get expected wstETH from stETH amount
      const expectedWstETH = await publicClient.readContract({
        address: wstETHAddress,
        abi: WSTETH_ABI,
        functionName: "getWstETHByStETH",
        args: [stETHAmount],
      });
      
      // Apply 1% slippage buffer (99% of expected)
      const minWstETHOut = (expectedWstETH * 99n) / 100n;
      
      depositHash = await writeContractAsync({
        address: zapAddress,
        abi: ZAP_ABI,
        functionName:"zapEth",
        args: [address as `0x${string}`, minWstETHOut],
        value: amountBigInt,
      });
    } else if (isStETH) {
      // Use zapStEth for stETH deposits with slippage protection
      // Get expected wstETH from stETH amount
      const expectedWstETH = await publicClient.readContract({
        address: wstETHAddress,
        abi: WSTETH_ABI,
        functionName: "getWstETHByStETH",
        args: [amountBigInt],
      });
      
      // Apply 1% slippage buffer (99% of expected)
      const minWstETHOut = (expectedWstETH * 99n) / 100n;
      
      depositHash = await writeContractAsync({
        address: zapAddress,
        abi: ZAP_ABI,
        functionName:"zapStEth",
        args: [amountBigInt, address as `0x${string}`, minWstETHOut],
      });
    } else {
      // For other tokens (wstETH), use standard genesis deposit
      depositHash = await writeContractAsync({
        address: genesisAddress as `0x${string}`,
        abi: GENESIS_ABI,
        functionName:"deposit",
        args: [amountBigInt, address as `0x${string}`],
      });
    }
setTxHash(depositHash);
const receipt = await publicClient?.waitForTransactionReceipt({ hash: depositHash });

// For zap transactions (stETH or ETH), get the actual wstETH deposited from transaction
// by reading the user's new balance in the Genesis contract
let actualDepositedAmount = amount;
if (isNativeETH || isStETH) {
  try {
    // Read the user's new deposit balance from Genesis
    const newBalance = await publicClient.readContract({
      address: genesisAddress as `0x${string}`,
      abi: GENESIS_ABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    });
    // Calculate the difference (new balance - old balance = amount deposited)
    // Use preDepositBalance captured at start of transaction to avoid race conditions
    const depositedWstETH = (newBalance as bigint) - preDepositBalance;
    if (depositedWstETH > 0n) {
      actualDepositedAmount = formatEther(depositedWstETH);
    }
  } catch (err) {
    console.error("Failed to read actual deposit amount:", err);
    // Fall back to the expected amount
    if (actualWstETHDeposit > 0n) {
      actualDepositedAmount = formatEther(actualWstETHDeposit);
    }
  }
}

setStep("success");
setSuccessfulDepositAmount(actualDepositedAmount);
 setProgressSteps((prev) =>
 prev.map((s) =>
 s.id ==="deposit"
 ? { ...s, status:"completed", txHash: depositHash }
 : s
 )
 );
 setCurrentStepIndex(steps.findIndex((s) => s.id ==="deposit"));
 if (onSuccess) {
 await onSuccess();
 }
 } catch (err) {
 console.error("Full transaction error object:", err);
 let errorMessage ="Transaction failed";

 // Helper to check if error is user rejection
 const isUserRejection = (error: any): boolean => {
 if (!error) return false;
 const errorMessage = error.message?.toLowerCase() ||"";
 const errorCode = error.code;
 const errorName = error.name?.toLowerCase() ||"";

 // Check for common rejection messages
 if (
 errorMessage.includes("user rejected") ||
 errorMessage.includes("user denied") ||
 errorMessage.includes("rejected") ||
 errorMessage.includes("denied") ||
 errorMessage.includes("action rejected") ||
 errorMessage.includes("user cancelled") ||
 errorMessage.includes("user canceled") ||
 errorName.includes("userrejected") ||
 errorName.includes("rejected")
 ) {
 return true;
 }

 // Check for common rejection error codes
 // 4001 = MetaMask user rejection, 4900 = Uniswap user rejection, etc.
 if (errorCode === 4001 || errorCode === 4900) {
 return true;
 }

 return false;
 };

 // Handle user rejection first
 if (isUserRejection(err)) {
 errorMessage ="Transaction was rejected. Please try again.";
 setError(errorMessage);
 setStep("error");
 return;
 }

 // Check for RPC errors by examining error properties
 const errObj = err as any;
 if (
 errObj &&
 (errObj.code !== undefined ||
 errObj.name?.includes("Rpc") ||
 errObj.name?.includes("RPC"))
 ) {
 const rpcCode = errObj.code;
 console.error("RPC Error details:", {
 code: rpcCode,
 message: errObj.message,
 shortMessage: errObj.shortMessage,
 name: errObj.name,
 data: errObj.data,
 });

 // Map common RPC error codes to user-friendly messages
 if (rpcCode !== undefined) {
 switch (rpcCode) {
 case -32000:
 errorMessage =
"Transaction execution failed. Please check your balance and try again.";
 break;
 case -32002:
 errorMessage =
"Transaction already pending. Please wait for the previous transaction to complete.";
 break;
 case -32003:
 errorMessage ="Transaction was rejected by the network.";
 break;
 case -32602:
 errorMessage ="Invalid transaction parameters.";
 break;
 case -32603:
 errorMessage ="Internal RPC error. Please try again later.";
 break;
 default:
 // Try to extract meaningful error message
 if (errObj.shortMessage) {
 errorMessage = errObj.shortMessage;
 } else if (errObj.message) {
 errorMessage = errObj.message;
 } else {
 errorMessage = `RPC error (code: ${rpcCode}). Please try again.`;
 }
 }
 } else if (errObj.shortMessage) {
 errorMessage = errObj.shortMessage;
 } else if (errObj.message) {
 errorMessage = errObj.message;
 } else {
 errorMessage ="RPC error occurred. Please try again.";
 }
 setError(errorMessage);
 setStep("error");
 return;
 }

 // Handle BaseError (viem errors)
 if (err instanceof BaseError) {
 const revertError = err.walk(
 (err) => err instanceof ContractFunctionRevertedError
 );
 if (revertError instanceof ContractFunctionRevertedError) {
 const errorName = revertError.data?.errorName;
 switch (errorName) {
 case"GenesisAlreadyEnded":
 errorMessage ="Genesis period has already ended";
 break;
 case"GenesisNotActive":
 errorMessage ="Genesis is not currently active";
 break;
 case"ZeroAmount":
 errorMessage ="Amount cannot be zero";
 break;
 case"InvalidAmount":
 errorMessage ="Invalid amount specified";
 break;
 case"InsufficientBalance":
 errorMessage ="Insufficient token balance";
 break;
 case"TransferFailed":
 errorMessage ="Token transfer failed";
 break;
 case"Unauthorized":
 errorMessage ="Unauthorized operation";
 break;
 default:
 errorMessage = `Contract error: ${errorName ||"Unknown error"}`;
 }
 } else {
 // Check for common error patterns in the message
 const errorMsg = err.shortMessage || err.message ||"";
 const lowerMsg = errorMsg.toLowerCase();

 if (
 lowerMsg.includes("insufficient funds") ||
 lowerMsg.includes("insufficient balance")
 ) {
 errorMessage ="Insufficient balance for this transaction";
 } else if (lowerMsg.includes("gas") || lowerMsg.includes("fee")) {
 errorMessage =
"Transaction failed due to gas estimation. Please try again.";
 } else if (lowerMsg.includes("network") || lowerMsg.includes("rpc")) {
 errorMessage =
"Network error. Please check your connection and try again.";
 } else if (lowerMsg.includes("nonce")) {
 errorMessage ="Transaction nonce error. Please try again.";
 } else {
 errorMessage = errorMsg ||"Transaction failed";
 }
 }
 } else if (err && typeof err ==="object" &&"message" in err) {
 const errObj = err as { message: string; code?: number };
 const msg = errObj.message ||"";
 const lowerMsg = msg.toLowerCase();

 // Check for user rejection patterns
 if (
 lowerMsg.includes("user rejected") ||
 lowerMsg.includes("user denied") ||
 lowerMsg.includes("rejected") ||
 errObj.code === 4001 ||
 errObj.code === 4900
 ) {
 errorMessage ="Transaction was rejected. Please try again.";
 } else if (lowerMsg.includes("rpc") || lowerMsg.includes("network")) {
 errorMessage =
"Network error. Please check your connection and try again.";
 } else {
 errorMessage = msg;
 }
 } else {
 errorMessage ="An unknown error occurred. Please try again.";
 }

 // Log detailed error information for debugging
 if (process.env.NODE_ENV ==="development") {
 console.error("Error details:", {
 error: err,
 errorMessage,
 type: err?.constructor?.name,
 stack: err instanceof Error ? err.stack : undefined,
 });
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
 return needsApproval ?"Approve & Deposit" :"Deposit";
 }
 };

 const handleMainButtonClick = () => {
 if (step ==="error") {
 setStep("input");
 setError(null);
 } else if (step ==="success") {
 // Reset to input step for a new deposit
 setStep("input");
 setAmount("");
 setError(null);
 setTxHash(null);
 } else {
 handleDeposit();
 }
 };

 const isButtonDisabled = () => {
 if (step ==="success") return false; // Always enable the button when successful
 return (
 step ==="approving" ||
 step ==="depositing" ||
 !amount ||
 parseFloat(amount) <= 0 ||
 genesisEnded
 );
 };

const renderSuccessContent = () => {
// Format the success amount with USD
const successAmountNum = parseFloat(successfulDepositAmount || "0");
const successAmountFormatted = successAmountNum > 0 
  ? successAmountNum.toFixed(6).replace(/\.?0+$/, "") 
  : "0";
const successUSD = successAmountNum > 0 && collateralPriceUSD > 0
  ? successAmountNum * collateralPriceUSD
  : null;

return (
<div className="space-y-4">
<div className="p-4 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/30 text-center">
<p className="text-sm text-[#1E4775]/80">
Thank you for joining the Maiden Voyage!
</p>
{successfulDepositAmount && (
<>
<p className="text-lg font-bold text-[#1E4775] font-mono mt-2">
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
 <div className="space-y-2 bg-[#17395F]/5 border border-[#1E4775]/15 p-4">
 <div className="text-base font-semibold text-[#1E4775]">
 Boost your airdrop
 </div>
 <p className="text-sm text-[#1E4775]/80">
 Boost your airdrop with our community marketing program: Share your
 deposit on X and post a link in our Discord booster channel.
 </p>
 <button
 onClick={handleShareOnX}
 className="w-full py-3 px-4 bg-black hover:bg-gray-800 text-white font-medium rounded-full transition-colors flex items-center justify-center gap-2"
 >
 <svg
 viewBox="0 0 24 24"
 className="w-5 h-5 fill-current"
 aria-hidden="true"
 >
 <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
 </svg>
 <span>Share on X</span>
 </button>
 </div>
 </div>
 );
 };

 if (!isOpen && !progressModalOpen) return null;

 return (
 <>
 {progressModalOpen && (
 <TransactionProgressModal
 isOpen={progressModalOpen}
 onClose={handleClose}
 title="Processing Deposit"
 steps={progressSteps}
 currentStepIndex={currentStepIndex}
 canCancel={false}
 errorMessage={error || undefined}
 renderSuccessContent={renderSuccessContent}
 />
 )}

 {!progressModalOpen && isOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 {/* Backdrop */}
 <div
 className="absolute inset-0 bg-black/40 backdrop-blur-sm"
 onClick={handleClose}
 />

 {/* Modal */}
 <div className="relative bg-white shadow-2xl w-full max-w-md mx-4 animate-in fade-in-0 scale-in-95 duration-200">
 {/* Header */}
 <div className="flex items-center justify-between p-6 border-b border-[#1E4775]/20">
 <h2 className="text-2xl font-bold text-[#1E4775]">
 Deposit in Maiden Voyage
 </h2>
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

 {/* Content */}
 <div className="p-6 space-y-6">
 {/* Genesis Status Warning */}
 {genesisEnded && (
 <div className="p-3 bg-red-50 border border-red-500/30 text-red-600 text-sm">
 ⚠️ Genesis period has ended. Deposits are no longer accepted.
 </div>
 )}

{/* Current Deposit */}
{(() => {
  const currentFmt = formatTokenAmount(userCurrentDeposit, collateralSymbol, collateralPriceUSD);
  return (
    <div className="text-sm text-[#1E4775]/70">
      Current Deposit:{" "}
      <span className="font-medium text-[#1E4775]">
        {currentFmt.formatted} {collateralSymbol}
        {currentFmt.usd && <span className="text-[#1E4775]/50 ml-1">({currentFmt.usd})</span>}
      </span>
    </div>
  );
})()}

 {/* Deposit Asset Selection */}
 <div className="space-y-2">
 <label className="text-sm text-[#1E4775]/70">
 Deposit Asset
 </label>
 <select
 value={selectedAsset}
 onChange={(e) => setSelectedAsset(e.target.value)}
 className="w-full h-12 px-4 bg-white text-[#1E4775] border border-[#1E4775]/30 focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-lg font-mono"
 disabled={
 step ==="approving" ||
 step ==="depositing" ||
 genesisEnded
 }
 >
 {acceptedAssets.map((asset) => (
 <option key={asset.symbol} value={asset.symbol}>
 {asset.name} ({asset.symbol})
 </option>
 ))}
 </select>
 {isNonCollateralAsset && (
 <div className="p-3 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/30 text-[#1E4775] text-sm">
 ℹ️ Your deposit will be converted to {collateralSymbol} on
 deposit. Withdrawals will be in {collateralSymbol} only.
 </div>
 )}
 </div>

{/* Amount Input */}
<div className="space-y-2">
{/* Available Balance - AMM Style */}
<div className="flex justify-between items-center text-xs">
<span className="text-[#1E4775]/70">Amount</span>
<span className="text-[#1E4775]/70">
Balance:{""}
{isNativeETH ? (
  // ETH balance display
  isEthBalanceError ? (
    <span className="text-red-500">Error loading balance</span>
  ) : isEthBalanceLoading ? (
    <span className="text-[#1E4775]/50">Loading...</span>
  ) : (
    formatEther(balance)
  )
) : (
  // ERC20 balance display
  balanceError ? (
    <span
      className="text-red-500"
      title={balanceError.message}
    >
      Error loading balance
    </span>
  ) : balanceStatus ==="pending" ? (
    <span className="text-[#1E4775]/50">Loading...</span>
  ) : (
    formatEther(balance)
  )
)}{""}
{selectedAsset}
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
 disabled={
 step ==="approving" ||
 step ==="depositing" ||
 genesisEnded
 }
 />
 <button
 onClick={handleMaxClick}
 className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 rounded-full"
 disabled={
 step ==="approving" ||
 step ==="depositing" ||
 genesisEnded
 }
 >
 MAX
 </button>
 </div>
 <div className="text-right text-xs text-[#1E4775]/50">
 {selectedAsset}
 </div>
 </div>

{/* Transaction Preview - Always visible */}
<div className="p-3 bg-[#17395F]/10 border border-[#1E4775]/20 space-y-2 text-sm">
<div className="font-medium text-[#1E4775]">
Transaction Preview:
</div>
{(() => {
  const currentFmt = formatTokenAmount(userCurrentDeposit, collateralSymbol, collateralPriceUSD);
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[#1E4775]/70">Current Deposit:</span>
      <span className="text-[#1E4775]">
        {currentFmt.formatted} {collateralSymbol}
        {currentFmt.usd && <span className="text-[#1E4775]/50 ml-1">({currentFmt.usd})</span>}
      </span>
    </div>
  );
})()}
{amount && parseFloat(amount) > 0 ? (
<>
{(() => {
  const depositAmt = isNativeETH || isStETH ? actualWstETHDeposit : amountBigInt;
  const depositFmt = formatTokenAmount(depositAmt, collateralSymbol, collateralPriceUSD);
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[#1E4775]/70">+ Deposit Amount:</span>
      <span className="text-[#1E4775]">
        {depositAmt > 0n ? (
          <>
            +{depositFmt.formatted} {collateralSymbol}
            {depositFmt.usd && <span className="text-[#1E4775]/50 ml-1">(+{depositFmt.usd})</span>}
          </>
        ) : (
          "Calculating..."
        )}
      </span>
    </div>
  );
})()}
{(isNativeETH || isStETH) && actualWstETHDeposit > 0n && (
<div className="text-xs text-[#1E4775]/50 italic">
({parseFloat(amount).toFixed(6)} {selectedAsset} ≈ {formatTokenAmount(actualWstETHDeposit, collateralSymbol).formatted} {collateralSymbol})
</div>
)}
<div className="border-t border-[#1E4775]/30 pt-2">
{(() => {
  const totalFmt = formatTokenAmount(newTotalDepositActual, collateralSymbol, collateralPriceUSD);
  return (
    <div className="flex justify-between items-baseline font-medium">
      <span className="text-[#1E4775]">New Total Deposit:</span>
      <span className="text-[#1E4775]">
        {totalFmt.formatted} {collateralSymbol}
        {totalFmt.usd && <span className="text-[#1E4775]/50 font-normal ml-1">({totalFmt.usd})</span>}
      </span>
    </div>
  );
})()}
</div>
</>
) : (
<div className="text-xs text-[#1E4775]/50 italic">
Enter an amount to see deposit preview
</div>
)}
</div>

 {/* Error */}
 {error && (
 <div className="p-3 bg-red-50 border border-red-500/30 text-red-600 text-sm">
 {error}
 </div>
 )}

 {/* Step Indicator */}
 {needsApproval &&
 (step ==="approving" || step ==="depositing") && (
 <div className="space-y-2">
 <div className="flex items-center gap-4 text-sm">
 <div
 className={`w-2 h-2 rounded-full ${
 step ==="approving"
 ?"bg-[#1E4775] animate-pulse"
 :"bg-[#1E4775]"
 }`}
 />
 <span
 className={
 step ==="approving"
 ?"text-[#1E4775]"
 :"text-[#1E4775]/70"
 }
 >
 Step 1: Approve {collateralSymbol}
 </span>
 </div>
 <div className="flex items-center gap-4 text-sm">
 <div
 className={`w-2 h-2 rounded-full ${
 step ==="depositing"
 ?"bg-[#1E4775] animate-pulse"
 : step ==="approving"
 ?"bg-gray-300"
 :"bg-[#1E4775]"
 }`}
 />
 <span
 className={
 step ==="depositing"
 ?"text-[#1E4775]"
 :"text-[#1E4775]/70"
 }
 >
 Step 2: Deposit to Genesis
 </span>
 </div>
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
 </div>

 {/* Footer */}
 <div className="flex gap-4 p-6 border-t border-[#1E4775]/20">
 <button
 onClick={handleClose}
 className="flex-1 py-2 px-4 text-[#1E4775]/70 hover:text-[#1E4775] transition-colors rounded-full"
 disabled={step ==="approving" || step ==="depositing"}
 >
 {step ==="success" ?"Close" :"Cancel"}
 </button>
 <button
 onClick={handleMainButtonClick}
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
 )}
 </>
 );
};
