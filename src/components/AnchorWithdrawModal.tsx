"use client";

import React, { useState } from "react";
import { parseEther, formatEther } from "viem";
import {
  useAccount,
  useContractRead,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { ERC20_ABI } from "../config/contracts";

const minterABI = [
  {
    inputs: [
      { name: "peggedIn", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "minCollateralOut", type: "uint256" },
    ],
    name: "redeemPeggedToken",
    outputs: [{ type: "uint256", name: "collateralAmount" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "peggedAmount", type: "uint256" }],
    name: "calculateRedeemPeggedTokenOutput",
    outputs: [{ type: "uint256", name: "collateralAmount" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface AnchorWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketId: string;
  market: any;
  onSuccess?: () => void;
}

type ModalStep = "input" | "withdrawing" | "success" | "error";

export const AnchorWithdrawModal = ({
  isOpen,
  onClose,
  marketId,
  market,
  onSuccess,
}: AnchorWithdrawModalProps) => {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<ModalStep>("input");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const publicClient = usePublicClient();

  const minterAddress = market?.addresses?.minter;
  const peggedTokenAddress = market?.addresses?.peggedToken;
  const collateralSymbol = market?.collateral?.symbol || "ETH";
  const peggedTokenSymbol = market?.peggedToken?.symbol || "ha";

  // Contract read hooks
  const { data: balanceData } = useContractRead({
    address: peggedTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isOpen, refetchInterval: 5000 },
  });

  // Calculate expected output
  const { data: expectedOutput } = useContractRead({
    address: minterAddress as `0x${string}`,
    abi: minterABI,
    functionName: "calculateRedeemPeggedTokenOutput",
    args: amount ? [parseEther(amount)] : undefined,
    query: { enabled: !!minterAddress && !!amount && parseFloat(amount) > 0 && isOpen },
  });

  // Contract write hooks
  const { writeContractAsync } = useWriteContract();

  const balance = balanceData || 0n;
  const amountBigInt = amount ? parseEther(amount) : 0n;

  const handleClose = () => {
    if (step === "withdrawing") return;
    setAmount("");
    setStep("input");
    setError(null);
    setTxHash(null);
    onClose();
  };

  const handleMaxClick = () => {
    if (balance) {
      setAmount(formatEther(balance));
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
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

  const handleWithdraw = async () => {
    if (!validateAmount() || !address || !minterAddress) return;

    try {
      setStep("withdrawing");
      setError(null);
      setTxHash(null);

      // Calculate minimum output (with 1% slippage tolerance)
      const minCollateralOut = expectedOutput
        ? (expectedOutput * 99n) / 100n
        : 0n;

      const withdrawHash = await writeContractAsync({
        address: minterAddress as `0x${string}`,
        abi: minterABI,
        functionName: "redeemPeggedToken",
        args: [amountBigInt, address as `0x${string}`, minCollateralOut],
      });
      setTxHash(withdrawHash);
      await publicClient?.waitForTransactionReceipt({ hash: withdrawHash });

      setStep("success");
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      console.error("Withdraw error:", err);
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

  const isButtonDisabled = () => {
    if (step === "success") return false;
    return (
      step === "withdrawing" ||
      !amount ||
      parseFloat(amount) <= 0 ||
      amountBigInt > balance
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
          <h2 className="text-2xl font-bold text-[#1E4775]">Withdraw</h2>
          <button
            onClick={handleClose}
            className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors"
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

        <div className="p-6 space-y-6">
          <div className="text-sm text-[#1E4775]/70">
            Withdraw {peggedTokenSymbol} to receive {collateralSymbol}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#1E4775]/70">Amount</span>
              <span className="text-[#1E4775]/70">
                Balance: {formatEther(balance)} {peggedTokenSymbol}
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.0"
                className={`w-full h-12 px-4 pr-20 bg-white text-[#1E4775] border ${
                  error ? "border-red-500" : "border-[#1E4775]/30"
                } focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-lg font-mono`}
                disabled={step === "withdrawing"}
              />
              <button
                onClick={handleMaxClick}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 rounded-full"
                disabled={step === "withdrawing"}
              >
                MAX
              </button>
            </div>
            <div className="text-right text-xs text-[#1E4775]/50">
              {peggedTokenSymbol}
            </div>
            {expectedOutput && amount && parseFloat(amount) > 0 && (
              <div className="mt-3 p-3 bg-[#B8EBD5]/30 border border-[#B8EBD5]/50 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#1E4775]/70">You will receive:</span>
                  <span className="text-lg font-bold text-[#1E4775]">
                    {formatEther(expectedOutput)} {collateralSymbol}
                  </span>
                </div>
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

          {step === "success" && (
            <div className="p-3 bg-[#B8EBD5]/20 border border-[#B8EBD5]/30 text-[#1E4775] text-sm text-center">
              ✅ Withdrawal successful!
            </div>
          )}
        </div>

        <div className="flex gap-4 p-6 border-t border-[#1E4775]/20">
          <button
            onClick={handleClose}
            className="flex-1 py-2 px-4 text-[#1E4775]/70 hover:text-[#1E4775] transition-colors rounded-full"
            disabled={step === "withdrawing"}
          >
            {step === "success" ? "Close" : "Cancel"}
          </button>
          <button
            onClick={handleWithdraw}
            disabled={isButtonDisabled()}
            className={`flex-1 py-2 px-4 font-medium transition-colors rounded-full ${
              step === "success"
                ? "bg-[#1E4775] hover:bg-[#17395F] text-white"
                : "bg-[#1E4775] hover:bg-[#17395F] text-white disabled:bg-gray-300 disabled:text-gray-500"
            }`}
          >
            {getButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
};




