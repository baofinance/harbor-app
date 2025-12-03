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
import { useAnvilContractRead } from "@/hooks/useAnvilContractRead";
import { shouldUseAnvil } from "@/config/environment";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { ERC20_ABI } from "../config/contracts";
import { minterABI } from "@/abis/minter";
import Image from "next/image";
import SimpleTooltip from "@/components/SimpleTooltip";

interface SailManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketId: string;
  market: any;
  initialTab?: "mint" | "redeem";
  onSuccess?: () => void;
}

type ModalStep =
  | "input"
  | "approving"
  | "minting"
  | "redeeming"
  | "success"
  | "error";

// Helper function to get accepted deposit assets
function getAcceptedDepositAssets(
  collateralSymbol: string
): Array<{ symbol: string; name: string }> {
  const normalized = collateralSymbol.toLowerCase();
  if (normalized === "fxsave") {
    return [
      { symbol: "fxSAVE", name: "fxSAVE" },
      { symbol: "fxUSD", name: "fxUSD" },
      { symbol: "USDC", name: "USDC" },
    ];
  } else if (normalized === "wsteth" || normalized === "steth") {
    return [
      { symbol: "ETH", name: "Ethereum" },
      { symbol: "stETH", name: "Lido Staked ETH" },
      { symbol: "wstETH", name: "Wrapped Staked ETH" },
    ];
  }
  return [];
}

function getLogoPath(symbol: string): string {
  const normalized = symbol.toLowerCase();
  if (normalized === "hapb") return "/icons/haETH.png";
  if (normalized === "hspb") return "/icons/hsUSDETH.png";
  if (normalized === "hausd") return "/icons/haUSD2.png";
  if (normalized === "hsusdeth") return "/icons/hsUSDETH.png";
  return `/icons/${symbol}.png`;
}

export const SailManageModal = ({
  isOpen,
  onClose,
  marketId,
  market,
  initialTab = "mint",
  onSuccess,
}: SailManageModalProps) => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [activeTab, setActiveTab] = useState<"mint" | "redeem">(initialTab);
  const [amount, setAmount] = useState("");
  const [selectedDepositAsset, setSelectedDepositAsset] = useState<string | null>(
    null
  );
  const [step, setStep] = useState<ModalStep>("input");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

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

  const collateralSymbol = market.collateral?.symbol || "ETH";
  const leveragedTokenSymbol = market.leveragedToken?.symbol || "hs";

  // Get accepted deposit assets
  const acceptedAssets = useMemo(
    () => getAcceptedDepositAssets(collateralSymbol),
    [collateralSymbol]
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
    if (normalized === "eth") return undefined; // Native ETH
    // wstETH is the collateral token
    if (normalized === "wsteth") return market.addresses?.collateralToken;
    // stETH is the wrapped collateral token
    if (normalized === "steth") return market.addresses?.wrappedCollateralToken;
    return market.addresses?.collateralToken; // Default
  }, [selectedDepositAsset, market.addresses]);

  // Get native ETH balance (when ETH is selected) - use useBalance
  const { data: nativeEthBalance } = useBalance({
    address: address,
    query: {
      enabled: isOpen && !!address && activeTab === "mint" && selectedDepositAsset === "ETH",
      refetchInterval: 5000,
    },
  });

  // Get user balance for deposit asset (wstETH, stETH, etc.) - use useContractRead like anchor modal
  const useAnvilForBalance = shouldUseAnvil();
  
  const anvilDepositAssetBalance = useAnvilContractRead({
    address: depositAssetAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        isOpen &&
        !!address &&
        activeTab === "mint" &&
        !!depositAssetAddress &&
        selectedDepositAsset !== "ETH" &&
        useAnvilForBalance,
      refetchInterval: 5000,
    },
  });

  const wagmiDepositAssetBalance = useContractRead({
    address: depositAssetAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        isOpen &&
        !!address &&
        activeTab === "mint" &&
        !!depositAssetAddress &&
        selectedDepositAsset !== "ETH" &&
        !useAnvilForBalance,
      refetchInterval: 5000,
      retry: 1,
    },
  });

  const depositAssetBalanceData = useAnvilForBalance
    ? anvilDepositAssetBalance.data
    : wagmiDepositAssetBalance.data;

  // Get user leveraged token balance - use Anvil for local dev
  const { data: leveragedTokenBalanceAnvil } = useAnvilContractRead({
    address: leveragedTokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isOpen && !!address && !!leveragedTokenAddress && activeTab === "redeem" && shouldUseAnvil(),
    },
  });

  const { data: leveragedTokenBalanceWagmi } = useContractRead({
    address: leveragedTokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isOpen && !!address && !!leveragedTokenAddress && activeTab === "redeem" && !shouldUseAnvil(),
    },
  });

  const leveragedTokenBalance = shouldUseAnvil()
    ? leveragedTokenBalanceAnvil
    : leveragedTokenBalanceWagmi;

  // Get allowance for deposit asset
  const { data: depositAssetAllowance } = useContractRead({
    address: depositAssetAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
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
        activeTab === "mint",
    },
  });

  // Get allowance for leveraged token
  const { data: leveragedTokenAllowance } = useContractRead({
    address: leveragedTokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
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
        activeTab === "redeem",
    },
  });

  // Parse amount safely
  const parsedAmount = useMemo(() => {
    if (!amount || amount === "") return undefined;
    try {
      return parseEther(amount);
    } catch {
      return undefined;
    }
  }, [amount]);

  // Dry run for mint
  const mintDryRunEnabled =
    activeTab === "mint" &&
    !!parsedAmount &&
    !!minterAddress &&
    parsedAmount > 0n;

  const { data: mintDryRunData, error: mintDryRunError } = useAnvilContractRead({
    address: minterAddress,
    abi: minterABI,
    functionName: "mintLeveragedTokenDryRun",
    args: parsedAmount ? [parsedAmount] : undefined,
    query: {
      enabled: mintDryRunEnabled && shouldUseAnvil(),
    },
  });

  const { data: mintDryRunDataProd, error: mintDryRunErrorProd } =
    useContractRead({
      address: minterAddress,
      abi: minterABI,
      functionName: "mintLeveragedTokenDryRun",
      args: parsedAmount ? [parsedAmount] : undefined,
      query: {
        enabled: mintDryRunEnabled && !shouldUseAnvil(),
      },
    });

  const mintDryRunResult = shouldUseAnvil()
    ? mintDryRunData
    : mintDryRunDataProd;
  const mintDryRunErr = shouldUseAnvil()
    ? mintDryRunError
    : mintDryRunErrorProd;

  // Dry run for redeem
  const redeemDryRunEnabled =
    activeTab === "redeem" &&
    !!parsedAmount &&
    !!minterAddress &&
    parsedAmount > 0n;

  const { data: redeemDryRunData, error: redeemDryRunError } =
    useAnvilContractRead({
      address: minterAddress,
      abi: minterABI,
      functionName: "redeemLeveragedTokenDryRun",
      args: parsedAmount ? [parsedAmount] : undefined,
      query: {
        enabled: redeemDryRunEnabled && shouldUseAnvil(),
      },
    });

  const { data: redeemDryRunDataProd, error: redeemDryRunErrorProd } =
    useContractRead({
      address: minterAddress,
      abi: minterABI,
      functionName: "redeemLeveragedTokenDryRun",
      args: parsedAmount ? [parsedAmount] : undefined,
      query: {
        enabled: redeemDryRunEnabled && !shouldUseAnvil(),
      },
    });

  const redeemDryRunResult = shouldUseAnvil()
    ? redeemDryRunData
    : redeemDryRunDataProd;
  const redeemDryRunErr = shouldUseAnvil()
    ? redeemDryRunError
    : redeemDryRunErrorProd;

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
      bigint,
    ];
    return wrappedFee;
  }, [mintDryRunResult, parsedAmount]);

  const mintFeePercentage = useMemo(() => {
    if (!mintFee || !parsedAmount || parsedAmount === 0n) return 0;
    return (Number(mintFee) / Number(parsedAmount)) * 100;
  }, [mintFee, parsedAmount]);

  const expectedMintOutput = useMemo(() => {
    if (!mintDryRunResult || !parsedAmount || parsedAmount === 0n) return undefined;
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
      bigint,
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
    ] = redeemDryRunResult as [
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
    ];
    return wrappedFee;
  }, [redeemDryRunResult, parsedAmount]);

  const redeemFeePercentage = useMemo(() => {
    if (!redeemFee || !parsedAmount || parsedAmount === 0n) return 0;
    return (Number(redeemFee) / Number(parsedAmount)) * 100;
  }, [redeemFee, parsedAmount]);

  const expectedRedeemOutput = useMemo(() => {
    if (!redeemDryRunResult || !parsedAmount || parsedAmount === 0n) return undefined;
    const [
      incentiveRatio,
      wrappedFee,
      leveragedRedeemed,
      wrappedCollateralReturned,
      price,
      rate,
    ] = redeemDryRunResult as [
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
    ];
    return wrappedCollateralReturned;
  }, [redeemDryRunResult, parsedAmount]);

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
  const handleTabChange = (tab: "mint" | "redeem") => {
    if (step === "input") {
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

    if (activeTab === "mint") {
      // Use native ETH balance if ETH is selected, otherwise use deposit asset balance
      let balance = 0n;
      if (selectedDepositAsset === "ETH") {
        balance = nativeEthBalance?.value || 0n;
      } else {
        // Handle both direct bigint and { result: bigint } formats for ERC20 tokens
        if (depositAssetBalanceData) {
          if (typeof depositAssetBalanceData === "object" && "result" in depositAssetBalanceData) {
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
        if (typeof leveragedTokenBalance === "object" && "result" in leveragedTokenBalance) {
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

  // Handle mint
  const handleMint = async () => {
    if (!validateAmount() || !address || !minterAddress || !parsedAmount) return;

    setError(null);
    setStep("approving");

    try {
      // Check if we need to wrap ETH first
      if (selectedDepositAsset === "ETH" && !wrappedCollateralAddress) {
        throw new Error("Wrapped collateral token address not found");
      }

      // For non-native tokens, check and approve
      if (depositAssetAddress) {
        const allowance = (depositAssetAllowance as bigint) || 0n;
        if (allowance < parsedAmount) {
          const approveHash = await writeContractAsync({
            address: depositAssetAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [minterAddress, parsedAmount],
          });
          await publicClient?.waitForTransactionReceipt({
            hash: approveHash,
          });
        }
      }

      // Calculate min output (99% of expected)
      const minOutput = expectedMintOutput
        ? (expectedMintOutput * 99n) / 100n
        : 0n;

      setStep("minting");

      // Mint leveraged token
      const mintHash = await writeContractAsync({
        address: minterAddress,
        abi: minterABI,
        functionName: "mintLeveragedToken",
        args: [parsedAmount, address, minOutput],
      });
      setTxHash(mintHash);
      await publicClient?.waitForTransactionReceipt({
        hash: mintHash,
      });

      setStep("success");
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Mint error:", err);
      setStep("error");
      if (err instanceof BaseError) {
        const revertError = err.walk(
          (e) => e instanceof ContractFunctionRevertedError
        );
        if (revertError instanceof ContractFunctionRevertedError) {
          setError(revertError.reason || "Transaction failed");
        } else {
          setError(err.message || "Transaction failed");
        }
      } else {
        setError("Transaction failed");
      }
    }
  };

  // Handle redeem
  const handleRedeem = async () => {
    if (!validateAmount() || !address || !minterAddress || !parsedAmount) return;

    setError(null);
    setStep("approving");

    try {
      // Check and approve leveraged token
      const allowance = (leveragedTokenAllowance as bigint) || 0n;
      if (allowance < parsedAmount) {
        const approveHash = await writeContractAsync({
          address: leveragedTokenAddress!,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [minterAddress, parsedAmount],
        });
        await publicClient?.waitForTransactionReceipt({
          hash: approveHash,
        });
      }

      // Calculate min output (99% of expected)
      const minOutput = expectedRedeemOutput
        ? (expectedRedeemOutput * 99n) / 100n
        : 0n;

      setStep("redeeming");

      // Redeem leveraged token
      const redeemHash = await writeContractAsync({
        address: minterAddress,
        abi: minterABI,
        functionName: "redeemLeveragedToken",
        args: [parsedAmount, address, minOutput],
      });
      setTxHash(redeemHash);
      await publicClient?.waitForTransactionReceipt({
        hash: redeemHash,
      });

      setStep("success");
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Redeem error:", err);
      setStep("error");
      if (err instanceof BaseError) {
        const revertError = err.walk(
          (e) => e instanceof ContractFunctionRevertedError
        );
        if (revertError instanceof ContractFunctionRevertedError) {
          setError(revertError.reason || "Transaction failed");
        } else {
          setError(err.message || "Transaction failed");
        }
      } else {
        setError("Transaction failed");
      }
    }
  };

  // Handle close
  const handleClose = () => {
    if (step === "approving" || step === "minting" || step === "redeeming") {
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
    step === "approving" || step === "minting" || step === "redeeming";
  
  // Get current balance based on selected asset and tab
  const currentBalance = useMemo(() => {
    if (activeTab === "mint") {
      if (selectedDepositAsset === "ETH") {
        return nativeEthBalance?.value || 0n;
      }
      // Handle both direct bigint and { result: bigint } formats for ERC20 tokens
      if (depositAssetBalanceData) {
        if (typeof depositAssetBalanceData === "object" && "result" in depositAssetBalanceData) {
          return (depositAssetBalanceData.result as bigint) || 0n;
        }
        return depositAssetBalanceData as bigint;
      }
      return 0n;
    } else {
      // Handle both direct bigint and { result: bigint } formats
      if (leveragedTokenBalance && typeof leveragedTokenBalance === "object" && "result" in leveragedTokenBalance) {
        return (leveragedTokenBalance.result as bigint) || 0n;
      }
      return (leveragedTokenBalance as bigint) || 0n;
    }
  }, [activeTab, selectedDepositAsset, nativeEthBalance, depositAssetBalanceData, leveragedTokenBalance]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-white shadow-2xl w-full max-w-md mx-4 animate-in fade-in-0 scale-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-[#1E4775]/20">
          <h2 className="text-xl font-bold text-[#1E4775]">Manage</h2>
          <button
            onClick={handleClose}
            className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors disabled:opacity-30"
            disabled={isProcessing}
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

        {/* Tabs */}
        <div className="flex border-b border-[#1E4775]/20">
          <button
            onClick={() => handleTabChange("mint")}
            disabled={isProcessing}
            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === "mint"
                ? "text-[#1E4775] border-b-2 border-[#1E4775]"
                : "text-[#1E4775]/50 hover:text-[#1E4775]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Mint
          </button>
          <button
            onClick={() => handleTabChange("redeem")}
            disabled={isProcessing}
            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === "redeem"
                ? "text-[#1E4775] border-b-2 border-[#1E4775]"
                : "text-[#1E4775]/50 hover:text-[#1E4775]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Redeem
          </button>
        </div>

        <div className="p-4">
          {step === "success" ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✓</div>
              <h3 className="text-xl font-bold text-[#1E4775] mb-2">
                Transaction Successful!
              </h3>
              <p className="text-sm text-[#1E4775]/70 mb-4">
                {activeTab === "mint"
                  ? "Your sail tokens have been minted successfully."
                  : "Your sail tokens have been redeemed successfully."}
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
          ) : step === "error" ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4 text-red-500">✗</div>
              <h3 className="text-xl font-bold text-red-600 mb-2">
                Transaction Failed
              </h3>
              <p className="text-sm text-red-500 mb-4">{error}</p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold rounded-lg hover:bg-[#1E4775]/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={
                    activeTab === "mint" ? handleMint : handleRedeem
                  }
                  className="flex-1 py-2 px-4 bg-[#1E4775] text-white font-semibold rounded-lg hover:bg-[#17395F] transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Input Section */}
              <div>
                <label className="block text-sm font-semibold text-[#1E4775] mb-1.5">
                  {activeTab === "mint" ? "Deposit Amount" : "Redeem Amount"}
                </label>
                {activeTab === "mint" && (
                  <div className="mb-2">
                    <label className="block text-xs text-[#1E4775]/70 mb-1">
                      Deposit Asset
                    </label>
                    <select
                      value={selectedDepositAsset || ""}
                      onChange={(e) => setSelectedDepositAsset(e.target.value)}
                      disabled={isProcessing}
                      className="w-full px-3 py-2 border border-[#1E4775]/30 rounded-lg text-sm text-[#1E4775] bg-white focus:outline-none focus:ring-2 focus:ring-[#1E4775]/20 disabled:opacity-50"
                    >
                      {acceptedAssets.map((asset) => (
                        <option key={asset.symbol} value={asset.symbol}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setAmount(value);
                        setError(null);
                      }
                    }}
                    placeholder="0.0"
                    disabled={isProcessing}
                    className="flex-1 px-3 py-2 border border-[#1E4775]/30 rounded-lg text-sm text-[#1E4775] focus:outline-none focus:ring-2 focus:ring-[#1E4775]/20 disabled:opacity-50"
                  />
                  <button
                    onClick={() => {
                      if (currentBalance) {
                        setAmount(formatEther(currentBalance));
                        setError(null);
                      }
                    }}
                    disabled={isProcessing || !currentBalance}
                    className="px-4 py-2 text-xs font-medium bg-[#1E4775]/10 text-[#1E4775] rounded-lg hover:bg-[#1E4775]/20 transition-colors disabled:opacity-50"
                  >
                    MAX
                  </button>
                </div>
                <div className="mt-1 text-xs text-[#1E4775]/70">
                  Balance:{" "}
                  {currentBalance
                    ? formatEther(currentBalance)
                    : "0.00"}{" "}
                  {activeTab === "mint"
                    ? selectedDepositAsset || collateralSymbol
                    : leveragedTokenSymbol}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                  {error}
                </div>
              )}

              {/* Fee Display */}
              {activeTab === "mint" && (
                <div className="p-2 bg-[#B8EBD5]/30 border border-[#B8EBD5]/50 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-[#1E4775]/70">
                      Mint Fee:
                    </span>
                    <span
                      className={`text-base font-bold font-mono ${
                        mintFeePercentage > 2
                          ? "text-red-600"
                          : "text-[#1E4775]"
                      }`}
                    >
                      {parsedAmount && parsedAmount > 0n && mintFeePercentage > 0
                        ? `${mintFeePercentage.toFixed(2)}%`
                        : "-"}
                    </span>
                  </div>
                  {parsedAmount && parsedAmount > 0n && mintFee > 0n && (
                    <div className="text-xs text-[#1E4775]/70">
                      Fee Amount: {formatEther(mintFee)} {selectedDepositAsset || collateralSymbol}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "redeem" && (
                <div className="p-2 bg-[#B8EBD5]/30 border border-[#B8EBD5]/50 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-[#1E4775]/70">
                      Redeem Fee:
                    </span>
                    <span
                      className={`text-base font-bold font-mono ${
                        redeemFeePercentage > 2
                          ? "text-red-600"
                          : "text-[#1E4775]"
                      }`}
                    >
                      {parsedAmount && parsedAmount > 0n && redeemFeePercentage > 0
                        ? `${redeemFeePercentage.toFixed(2)}%`
                        : "-"}
                    </span>
                  </div>
                  {parsedAmount && parsedAmount > 0n && redeemFee > 0n && (
                    <div className="text-xs text-[#1E4775]/70">
                      Fee Amount: {formatEther(redeemFee)} {leveragedTokenSymbol}
                    </div>
                  )}
                </div>
              )}

              {/* Transaction Summary */}
              {activeTab === "mint" && (
                <div className="p-2 bg-[#17395F]/5 border border-[#17395F]/20 rounded">
                  <h4 className="text-xs font-semibold text-[#1E4775] mb-1.5">
                    Transaction Summary
                  </h4>
                  <div className="space-y-1 text-xs text-[#1E4775]/80">
                    <div className="flex justify-between">
                      <span>You deposit:</span>
                      <span className="font-mono">
                        {parsedAmount && parsedAmount > 0n
                          ? `${formatEther(parsedAmount)} ${selectedDepositAsset || collateralSymbol}`
                          : "0.00"}
                      </span>
                    </div>
                    {parsedAmount && parsedAmount > 0n && mintFee > 0n && (
                      <div className="flex justify-between">
                        <span>Fee:</span>
                        <span className="font-mono">
                          {formatEther(mintFee)} {selectedDepositAsset || collateralSymbol}
                          {mintFeePercentage > 0 && (
                            <span className="ml-1 text-[#1E4775]/60">
                              ({mintFeePercentage.toFixed(2)}%)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>You receive:</span>
                      <span className="font-mono">
                        {expectedMintOutput && parsedAmount && parsedAmount > 0n
                          ? `${formatEther(expectedMintOutput)} ${leveragedTokenSymbol}`
                          : "0.00"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "redeem" && (
                <div className="p-2 bg-[#17395F]/5 border border-[#17395F]/20 rounded">
                  <h4 className="text-xs font-semibold text-[#1E4775] mb-1.5">
                    Transaction Summary
                  </h4>
                  <div className="space-y-1 text-xs text-[#1E4775]/80">
                    <div className="flex justify-between">
                      <span>You redeem:</span>
                      <span className="font-mono">
                        {parsedAmount && parsedAmount > 0n
                          ? `${formatEther(parsedAmount)} ${leveragedTokenSymbol}`
                          : "0.00"}
                      </span>
                    </div>
                    {parsedAmount && parsedAmount > 0n && redeemFee > 0n && (
                      <div className="flex justify-between">
                        <span>Fee:</span>
                        <span className="font-mono">
                          {formatEther(redeemFee)} {leveragedTokenSymbol}
                          {redeemFeePercentage > 0 && (
                            <span className="ml-1 text-[#1E4775]/60">
                              ({redeemFeePercentage.toFixed(2)}%)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>You receive:</span>
                      <span className="font-mono">
                        {expectedRedeemOutput && parsedAmount && parsedAmount > 0n
                          ? `${formatEther(expectedRedeemOutput)} ${collateralSymbol}`
                          : "0.00"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Processing Indicator */}
              {isProcessing && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E4775]"></div>
                  <p className="mt-2 text-sm text-[#1E4775]">
                    {step === "approving"
                      ? "Approving..."
                      : step === "minting"
                      ? "Minting sail tokens..."
                      : "Redeeming sail tokens..."}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {!isProcessing && (
                <div className="flex gap-3 pt-2 border-t border-[#1E4775]/20">
                  {(step === "error" || step === "input") && (
                    <button
                      onClick={handleClose}
                      className="flex-1 py-2 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold rounded-lg hover:bg-[#1E4775]/5 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={activeTab === "mint" ? handleMint : handleRedeem}
                    disabled={
                      !isConnected ||
                      !amount ||
                      parseFloat(amount) <= 0 ||
                      (activeTab === "mint" &&
                        parsedAmount &&
                        parsedAmount > currentBalance) ||
                      (activeTab === "redeem" &&
                        parsedAmount &&
                        parsedAmount > currentBalance)
                    }
                    className="flex-1 py-2 px-4 bg-[#1E4775] text-white font-semibold rounded-lg hover:bg-[#17395F] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    {activeTab === "mint" ? "Mint" : "Redeem"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

