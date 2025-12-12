"use client";

import { useState, useEffect } from"react";
import { Geo } from"next/font/google";
import Link from"next/link";
import { formatEther } from"viem";
import { useWaitForTransactionReceipt } from"wagmi";

const geo = Geo({
 subsets: ["latin"],
 weight:"400",
 display:"swap",
});

interface MintRedeemStatusModalProps {
 isOpen: boolean;
 onClose: () => void;
 transactionType:"mint" |"redeem";
 tokenType:"LONG" |"STEAMED";
 inputAmount: string;
 outputAmount: string;
 inputToken: string;
 outputToken: string;
 transactionHash?: string;
 onTransactionSuccess?: () => void;
}

type TransactionStatus ="pending" |"completed" |"error";

export default function MintRedeemStatusModal({
 isOpen,
 onClose,
 transactionType,
 tokenType,
 inputAmount,
 outputAmount,
 inputToken,
 outputToken,
 transactionHash,
 onTransactionSuccess,
}: MintRedeemStatusModalProps) {
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
 // Call the success callback when transaction is completed
 if (onTransactionSuccess) {
 onTransactionSuccess();
 }
 } else if (isLoading) {
 setStatus("pending");
 }
 }, [transactionHash, isSuccess, isError, isLoading, onTransactionSuccess]);

 if (!isOpen) return null;

 const getStatusIcon = () => {
 switch (status) {
 case"pending":
 return (
 <div className="w-16 h-16 mx-auto mb-4 bg-blue-400/10 border border-blue-400/20 flex items-center justify-center-full">
 <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent-full animate-spin"></div>
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
 const action = transactionType ==="mint" ?"Mint" :"Redeem";
 // Use the actual token name instead of the old tokenType
 const tokenName = transactionType ==="mint" ? outputToken : inputToken;
 switch (status) {
 case"pending":
 return `${action}ing ${tokenName}...`;
 case"completed":
 return `${action} Successful!`;
 case"error":
 return"Transaction Failed";
 }
 };

 const getStatusDescription = () => {
 const action = transactionType ==="mint" ?"mint" :"redeem";
 switch (status) {
 case"pending":
 return transactionHash
 ? `Your ${action} transaction is being processed on the blockchain. This may take a few moments.`
 : `Please sign the transaction in your wallet to proceed with the ${action}.`;
 case"completed":
 return `Your ${action} transaction has been successfully completed.`;
 case"error":
 return"The transaction failed. Please try again or check your wallet for more details.";
 }
 };

 const getTransactionDetails = () => {
 const action = transactionType ==="mint" ?"Minted" :"Redeemed";
 const inputColor =
 inputToken ==="wstETH"
 ?"text-[#2563EB]"
 : inputToken.includes("ZHE")
 ?"text-blue-400"
 :"text-purple-400";
 const outputColor = outputToken.includes("ZHE")
 ?"text-blue-400"
 : outputToken.includes("STEAMED")
 ?"text-purple-400"
 :"text-[#2563EB]";

 return (
 <div className="bg-[#202020] p-4">
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm text-white/60">Transaction Details</span>
 <span className="text-xs text-blue-400">✓ Completed</span>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="text-center">
 <div
 className={`text-lg font-medium ${inputColor} ${geo.className}`}
 >
 {inputAmount}
 </div>
 <div className="text-xs text-white/60">{inputToken}</div>
 </div>
 <div className="text-center">
 <div
 className={`text-lg font-medium ${outputColor} ${geo.className}`}
 >
 {outputAmount}
 </div>
 <div className="text-xs text-white/60">{outputToken}</div>
 </div>
 </div>
 </div>
 );
 };

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

 {/* Transaction Details - Only show when completed */}
 {status ==="completed" && (
 <div className="space-y-3 mb-6">{getTransactionDetails()}</div>
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
