"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { STABILITY_POOL_MANAGER_ABI } from "@/abis/shared";

export function useHarvestAction(
  stabilityPoolManagerAddress: `0x${string}` | undefined,
  minBounty: bigint = BigInt(0)
) {
  const { address } = useAccount();
  const [isPending, setIsPending] = useState(false);

  const {
    writeContract,
    data: hash,
    error: writeError,
    isPending: isWriting,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Reset pending state when transaction completes
  useEffect(() => {
    if (isConfirmed || receiptError) {
      if (isPending) {
        setIsPending(false);
      }
    }
  }, [isConfirmed, receiptError, isPending]);

  const harvest = async () => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    if (!stabilityPoolManagerAddress) {
      throw new Error("Stability pool manager address not available");
    }

    setIsPending(true);
    try {
      writeContract({
        address: stabilityPoolManagerAddress,
        abi: STABILITY_POOL_MANAGER_ABI,
        functionName: "harvest",
        args: [address, minBounty], // User receives the bounty
      });
    } catch (error) {
      setIsPending(false);
      throw error;
    }
  };

  return {
    harvest,
    hash,
    isPending: isPending || isWriting || isConfirming,
    isSuccess: isConfirmed,
    error: writeError || receiptError,
  };
}

