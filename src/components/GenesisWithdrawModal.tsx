"use client";

import React, { useState } from "react";
import { parseEther, formatEther } from "viem";
import {
  useAccount,
  useWriteContract,
  usePublicClient,
  useSimulateContract,
} from "wagmi";
import { anvil } from "wagmi/chains";
import { Geo } from "next/font/google";
import { BaseError, ContractFunctionRevertedError } from "viem";

const geo = Geo({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

interface GenesisWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  genesisAddress: string;
  collateralSymbol: string;
  userDeposit: bigint;
  onSuccess?: () => void;
}

const genesisABI = [
  {
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "withdraw",
    outputs: [{ type: "uint256", name: "collateralOut" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

type ModalStep = "input" | "withdrawing" | "success" | "error";

export const GenesisWithdrawModal = ({
  isOpen,
  onClose,
  genesisAddress,
  collateralSymbol,
  userDeposit,
  onSuccess,
}: GenesisWithdrawalModalProps) => {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<ModalStep>("input");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const publicClient = usePublicClient();

  // Contract write hooks
  const { writeContractAsync } = useWriteContract();

  const amountBigInt = amount ? parseEther(amount) : 0n;
  // Support "max" withdrawal with MaxUint256
  const withdrawAmount =
    amount === "max" || amountBigInt >= userDeposit
      ? BigInt(
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        ) // MaxUint256
      : amountBigInt;

  // Calculate remaining deposit
  const isMaxWithdrawal = amount === "max" || amountBigInt >= userDeposit;
  const remainingDeposit = isMaxWithdrawal ? 0n : userDeposit - amountBigInt;

  const { data: simulateData, error: simulateError } = useSimulateContract({
    address: genesisAddress as `0x${string}`,
    abi: genesisABI,
    functionName: "withdraw",
    args: [withdrawAmount, address as `0x${string}`],
    chainId: anvil.id,
    query: {
      enabled:
        !!address &&
        (!!amount || amount === "max") &&
        parseFloat(amount || "0") > 0,
    },
  });
  const handleClose = () => {
    if (step === "withdrawing") return; // Prevent closing during transaction
    setAmount("");
    setStep("input");
    setError(null);
    setTxHash(null);
    onClose();
  };

  const handleMaxClick = () => {
    setAmount("max");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point, or "max"
    if (value === "" || value === "max" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
    }
  };

  const validateAmount = (): boolean => {
    if (!amount || (amount !== "max" && parseFloat(amount) <= 0)) {
      setError("Please enter a valid amount");
      return false;
    }

    if (amount !== "max" && amountBigInt > userDeposit) {
      setError("Amount exceeds your deposit");
      return false;
    }

    return true;
  };

  const handleWithdraw = async () => {
    if (!validateAmount()) return;

    // Check if simulation failed
    if (simulateError) {
      setError("Transaction will fail: " + simulateError.message);
      return;
    }

    try {
      setStep("withdrawing");
      setError(null);

      const hash = await writeContractAsync({
        address: genesisAddress as `0x${string}`,
        abi: genesisABI,
        functionName: "withdraw",
        args: [withdrawAmount, address as `0x${string}`],
        chainId: anvil.id,
      });

      setTxHash(hash);
      await publicClient?.waitForTransactionReceipt({ hash });

      setStep("success");
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      console.error("Withdrawal error:", err);
      let errorMessage = "Transaction failed";

      if (err instanceof BaseError) {
        const revertError = err.walk(
          (err) => err instanceof ContractFunctionRevertedError
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
    }
  };

  const getButtonText = () => {
    switch (step) {
      case "withdrawing":
        return "Withdrawing...";
      case "success":
        return "Withdraw";
      case "error":
        return "Try Again";
      default:
        return "Withdraw";
    }
  };

  const handleMainButtonClick = () => {
    if (step === "error") {
      setStep("input");
      setError(null);
    } else if (step === "success") {
      // Reset to input step for a new withdrawal
      setStep("input");
      setError(null);
      setTxHash(null);
    } else {
      handleWithdraw();
    }
  };

  const isButtonDisabled = () => {
    if (step === "success") return false; // Always enable the button when successful
    return (
      step === "withdrawing" ||
      !amount ||
      (amount !== "max" && parseFloat(amount) <= 0) ||
      !!simulateError
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900/50  shadow-2xl w-full max-w-md mx-4 animate-in fade-in-0 scale-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1E4775]/20">
          <h2 className={`text-xl font-medium text-white ${geo.className}`}>
            Withdraw from Genesis
          </h2>
          <button
            onClick={handleClose}
            className="text-white/50 hover:text-white transition-colors"
            disabled={step === "withdrawing"}
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
          {/* Balance */}
          <div className="text-sm text-white/70">
            Your Deposit:{" "}
            <span className="font-medium text-white">
              {formatEther(userDeposit)} {collateralSymbol}
            </span>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.0"
                className={`w-full h-12 px-4 pr-20 bg-[#0D0D0D] text-white border ${
                  error ? "border-red-500" : "border-zinc-700/50"
                } focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-lg font-mono`}
                disabled={step === "withdrawing"}
              />
              <button
                onClick={handleMaxClick}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-zinc-600"
                disabled={step === "withdrawing"}
              >
                MAX
              </button>
            </div>
            <div className="text-right text-xs text-white/50">
              {collateralSymbol}
            </div>
          </div>

          {/* Transaction Preview */}
          {amount && parseFloat(amount || "0") > 0 && (
            <div className="p-3 bg-[#0F0F0F]/90  space-y-2 text-sm">
              <div className="font-medium text-white">
                Transaction Preview:
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Current Deposit:</span>
                <span>
                  {formatEther(userDeposit)} {collateralSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">- Withdraw Amount:</span>
                <span className="text-red-400">
                  -{isMaxWithdrawal ? formatEther(userDeposit) : amount}{" "}
                  {collateralSymbol}
                </span>
              </div>
              <div className="border-t border-[#1E4775]/20 pt-2">
                <div className="flex justify-between font-medium">
                  <span className="text-white">Remaining Deposit:</span>
                  <span
                    className={
                      remainingDeposit === 0n
                        ? "text-orange-400"
                        : "text-[#1E4775]"
                    }
                  >
                    {formatEther(remainingDeposit)} {collateralSymbol}
                  </span>
                </div>
              </div>
              {isMaxWithdrawal && (
                <div className="text-xs text-yellow-400 mt-2">
                  ⚠️ This will remove you from Genesis and forfeit potential
                  rewards
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Transaction Hash */}
          {txHash && (
            <div className="text-xs text-center text-zinc-400">
              Tx:{" "}
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </a>
            </div>
          )}

          {/* Success Message */}
          {step === "success" && (
            <div className="p-3 bg-harbor/10 border border-harbor/30 text-harbor text-sm text-center">
              ✅ Withdrawal successful!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-4 p-6 border-t border-harbor/20">
          <button
            onClick={handleClose}
            className={`flex-1 py-2 px-4 text-white/70 hover:text-white transition-colors rounded-full ${geo.className}`}
            disabled={step === "withdrawing"}
          >
            {step === "success" ? "Close" : "Cancel"}
          </button>
          <button
            onClick={handleMainButtonClick}
            disabled={isButtonDisabled()}
            className={`flex-1 py-2 px-4 font-medium transition-colors rounded-full ${
              geo.className
            } ${
              step === "success"
                ? "bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white"
                : "bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white disabled:bg-zinc-800 disabled:text-zinc-500"
            }`}
          >
            {getButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
};
