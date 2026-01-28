"use client";

import { useState, useEffect } from "react";
import { Geo } from "next/font/google";
import Link from "next/link";
import { formatEther } from "viem";
import { useWaitForTransactionReceipt } from "wagmi";
import { GenesisTransactionProgressSteps } from "./GenesisTransactionProgressSteps";
import { TransactionStep } from "./TransactionProgressModal";

const geo = Geo({
 subsets: ["latin"],
 weight:"400",
 display:"swap",
});

interface GenesisClaimStatusModalProps {
 isOpen: boolean;
 onClose: () => void;
 market: any;
 claimedPegged: bigint;
 claimedLeveraged: bigint;
 transactionHash?: string;
 onClaimSuccess?: () => void;
}

type TransactionStatus ="pending" |"completed" |"error";

export default function GenesisClaimStatusModal({
 isOpen,
 onClose,
 market,
 claimedPegged,
 claimedLeveraged,
 transactionHash,
 onClaimSuccess,
}: GenesisClaimStatusModalProps) {
 const [isAddingToWallet, setIsAddingToWallet] = useState<string | null>(null);
 const [status, setStatus] = useState<TransactionStatus>("pending");

 // Track transaction status
 const { isSuccess, isError, isLoading } = useWaitForTransactionReceipt({
 hash: transactionHash as `0x${string}` | undefined,
 });

 // Update status based on transaction state
 useEffect(() => {
 if (!transactionHash) {
 setStatus("pending"); // Show pending when no transaction hash yet
 } else if (isError) {
 setStatus("error");
 } else if (isSuccess) {
 setStatus("completed");
 // Call the success callback when claim is completed
 if (onClaimSuccess) {
 onClaimSuccess();
 }
 } else if (isLoading) {
 setStatus("pending");
 }
 }, [transactionHash, isSuccess, isError, isLoading, onClaimSuccess]);

 if (!isOpen) return null;

 const addToWallet = async (
 tokenAddress: string,
 tokenSymbol: string,
 tokenDecimals: number
 ) => {
 if (typeof window ==="undefined" || !window.ethereum) {
 alert("MetaMask or another wallet is required to add tokens");
 return;
 }

 setIsAddingToWallet(tokenSymbol);

 try {
 await window.ethereum.request({
 method:"wallet_watchAsset",
 params: {
 type:"ERC20",
 options: {
 address: tokenAddress,
 symbol: tokenSymbol,
 decimals: tokenDecimals,
 },
 },
 });
 } catch (error) {
 console.error("Failed to add token to wallet:", error);
 } finally {
 setIsAddingToWallet(null);
 }
 };

 const getStatusIcon = () => {
 switch (status) {
 case"pending":
 return (
 <div className="w-16 h-16 mx-auto mb-4 bg-harbor/10 border border-harbor/20 flex items-center justify-center-full">
 <div className="w-8 h-8 border-2 border-harbor border-t-transparent-full animate-spin"></div>
 </div>
 );
 case"completed":
 return (
 <div className="w-16 h-16 mx-auto mb-4 bg-blue-400/10 border border-blue-400/20 flex items-center justify-center-full">
 <svg
 className="w-8 h-8 text-blue-400"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M5 13l4 4L19 7"
 />
 </svg>
 </div>
 );
 case"error":
 return (
 <div className="w-16 h-16 mx-auto mb-4 bg-red-400/10 border border-red-400/20 flex items-center justify-center-full">
 <svg
 className="w-8 h-8 text-red-400"
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
 </div>
 );
 }
 };

 const getStatusTitle = () => {
 switch (status) {
 case"pending":
 return"Processing Claim...";
 case"completed":
 return"Claim Successful!";
 case"error":
 return"Transaction Failed";
 }
 };

 const getStatusDescription = () => {
 switch (status) {
 case"pending":
 return transactionHash
 ?"Your claim transaction is being processed on the blockchain. This may take a few moments."
 :"Please sign the transaction in your wallet to proceed with the claim.";
 case"completed":
 return"Your tokens have been successfully claimed and transferred to your wallet.";
 case"error":
 return"The transaction failed. Please try again or check your wallet for more details.";
 }
 };

 const claimSteps: TransactionStep[] = [
   { id: "sign", label: "Sign", status: "pending" },
   { id: "confirm", label: "Confirm", status: "pending" },
   { id: "complete", label: "Complete", status: "pending" },
 ];

 if (!transactionHash) {
   claimSteps[0].status = "in_progress";
 } else if (status === "pending") {
   claimSteps[0].status = "completed";
   claimSteps[1].status = "in_progress";
 } else if (status === "completed") {
   claimSteps.forEach((step) => {
     step.status = "completed";
   });
 } else if (status === "error") {
   claimSteps[0].status = transactionHash ? "completed" : "in_progress";
   claimSteps[1].status = "error";
 }

 const claimCurrentStepIndex = claimSteps.findIndex(
   (step) => step.status === "in_progress"
 );
 const currentClaimStepIndex =
   claimCurrentStepIndex === -1 ? claimSteps.length - 1 : claimCurrentStepIndex;

 return (
 <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
 <div className="bg-zinc-900/50 max-w-md w-full p-6">
 {/* Status Icon */}
 <div className="text-center mb-6">
 {getStatusIcon()}
 <h2
 className={`text-xl font-medium text-white mb-2 ${geo.className}`}
 >
 {getStatusTitle()}
 </h2>
 <p className="text-sm text-white/60">{getStatusDescription()}</p>
 </div>

 {/* Horizontal progress */}
 <div className="mb-6">
   <GenesisTransactionProgressSteps
     steps={claimSteps}
     currentStepIndex={currentClaimStepIndex}
   />
 </div>

 {/* Transaction Hash */}
 {transactionHash && (
 <div className="mb-6">
 <div className="bg-[#202020] p-3">
 <div className="text-xs text-white/60 mb-1">
 Transaction Hash
 </div>
 <div className="text-xs text-white font-mono break-all">
 {transactionHash}
 </div>
 </div>
 </div>
 )}

 {/* Claimed Tokens - Only show when completed */}
 {status ==="completed" && (
 <div className="space-y-3 mb-6">
 <div className="bg-[#202020] p-4">
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm text-white/60">
 Claimed Amount
 </span>
 <span className="text-xs text-blue-400">✓ Transferred</span>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="text-center">
 <div
 className={`text-lg font-medium text-blue-400 ${geo.className}`}
 >
 {formatEther(claimedPegged)}
 </div>
 <div className="text-xs text-white/60">
 {market?.peggedToken?.name ||"Pegged Token"}
 </div>
 </div>
 <div className="text-center">
 <div
 className={`text-lg font-medium text-purple-400 ${geo.className}`}
 >
 {formatEther(claimedLeveraged)}
 </div>
 <div className="text-xs text-white/60">
 {market?.leveragedToken?.name ||"Leveraged Token"}
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Add to Wallet Buttons - Only show when completed */}
 {status ==="completed" && (
 <div className="space-y-2 mb-6">
 <h3
 className={`text-sm font-medium text-white mb-3 ${geo.className}`}
 >
 Add to Wallet
 </h3>
 <div className="grid grid-cols-2 gap-4">
 <button
 onClick={() =>
 addToWallet(
 market?.addresses?.peggedToken,
 market?.peggedToken?.symbol ||"ZHE",
 18
 )
 }
 disabled={
 isAddingToWallet === (market?.peggedToken?.symbol ||"ZHE")
 }
 className="flex items-center justify-center gap-4 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 disabled:bg-gray-600/30 disabled:cursor-not-allowed text-blue-400 text-sm transition-colors"
 >
 {isAddingToWallet === (market?.peggedToken?.symbol ||"ZHE") ? (
 <>
 <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent-full animate-spin"></div>
 Adding...
 </>
 ) : (
 <>
 <svg
 className="w-4 h-4"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M12 6v6m0 0v6m0-6h6m-6 0H6"
 />
 </svg>
 {market?.peggedToken?.symbol ||"ZHE"}
 </>
 )}
 </button>
 <button
 onClick={() =>
 addToWallet(
 market?.addresses?.leveragedToken,
 market?.leveragedToken?.symbol ||"STEAMED",
 18
 )
 }
 disabled={
 isAddingToWallet ===
 (market?.leveragedToken?.symbol ||"STEAMED")
 }
 className="flex items-center justify-center gap-4 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 disabled:bg-gray-600/30 disabled:cursor-not-allowed text-purple-400 text-sm transition-colors"
 >
 {isAddingToWallet ===
 (market?.leveragedToken?.symbol ||"STEAMED") ? (
 <>
 <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent-full animate-spin"></div>
 Adding...
 </>
 ) : (
 <>
 <svg
 className="w-4 h-4"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M12 6v6m0 0v6m0-6h6m-6 0H6"
 />
 </svg>
 {market?.leveragedToken?.symbol ||"STEAMED"}
 </>
 )}
 </button>
 </div>
 </div>
 )}

 {/* Navigation Links - Only show when completed */}
 {status ==="completed" && (
 <div className="space-y-2 mb-6">
 <h3
 className={`text-sm font-medium text-white mb-3 ${geo.className}`}
 >
 What's Next?
 </h3>
 <div className="space-y-2">
 <Link
 href="/earn"
 className="flex items-center justify-between p-3 bg-[#202020] hover:bg-[#2A2A2A] transition-colors"
 >
 <div className="flex items-center gap-4">
 <div className="w-8 h-8 bg-blue-400/10 border border-blue-400/20 flex items-center justify-center">
 <svg
 className="w-4 h-4 text-blue-400"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
 />
 </svg>
 </div>
 <div>
 <div className="text-sm font-medium text-white">
 Earn Page
 </div>
 <div className="text-xs text-white/60">
 Stake tokens and earn rewards
 </div>
 </div>
 </div>
 <svg
 className="w-4 h-4 text-white/40"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M9 5l7 7-7 7"
 />
 </svg>
 </Link>
 <Link
 href="/mint-redeem"
 className="flex items-center justify-between p-3 bg-[#202020] hover:bg-[#2A2A2A] transition-colors"
 >
 <div className="flex items-center gap-4">
 <div className="w-8 h-8 bg-blue-400/10 border border-blue-400/20 flex items-center justify-center">
 <svg
 className="w-4 h-4 text-blue-400"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M7 11l5-5m0 0l5 5m-5-5v12"
 />
 </svg>
 </div>
 <div>
 <div className="text-sm font-medium text-white">
 Mint/Redeem
 </div>
 <div className="text-xs text-white/60">
 Trade and manage your tokens
 </div>
 </div>
 </div>
 <svg
 className="w-4 h-4 text-white/40"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M9 5l7 7-7 7"
 />
 </svg>
 </Link>
 </div>
 </div>
 )}

 {/* Close Button */}
 <button
 onClick={onClose}
 className={`w-full py-3 font-medium transition-colors ${
 status ==="error"
 ?"bg-red-600 hover:bg-red-700 text-white"
 :"bg-blue-600 hover:bg-blue-700 text-white"
 }`}
 >
 {status ==="error" ?"Try Again" :"Close"}
 </button>
 </div>
 </div>
 );
}
