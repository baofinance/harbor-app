import { useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { markets } from "../config/markets";
import { GENESIS_ABI } from "@/abis/shared";

export function useGenesisClaim(marketId: string) {
  const { address } = useAccount();
  const market = (markets as any)[marketId];
  const [lastClaimHash, setLastClaimHash] = useState<string | null>(null);

  const { data: genesisEnded } = useReadContract({
    address: market?.addresses.genesis as `0x${string}`,
    abi: GENESIS_ABI,
    functionName: "genesisIsEnded",
    query: { enabled: !!market },
  });

  const { data: userShares } = useReadContract({
    address: market?.addresses.genesis as `0x${string}`,
    abi: GENESIS_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!market && !!address },
  });

  const { data: claimableAmounts } = useReadContract({
    address: market?.addresses.genesis as `0x${string}`,
    abi: GENESIS_ABI,
    functionName: "claimable",
    args: address ? [address] : undefined,
    query: { enabled: !!market && !!address },
  });

  const {
    writeContract: claim,
    isPending,
    data: claimHash,
  } = useWriteContract();

  const { isSuccess: claimSuccess, data: receipt } =
    useWaitForTransactionReceipt({
      hash: claimHash,
    });

  const claimTokens = async () => {
    if (!address || !market) return;

    claim({
      address: market.addresses.genesis as `0x${string}`,
      abi: GENESIS_ABI,
      functionName: "claim",
      args: [address],
    });
  };

  const withdrawCollateral = async (minAmount: bigint) => {
    if (!address || !market) return;

    await claim({
      address: market.addresses.genesis as `0x${string}`,
      abi: GENESIS_ABI,
      functionName: "withdraw",
      args: [address, minAmount],
    });
  };

  const canClaim = genesisEnded && userShares && userShares > 0n;
  const claimablePegged =
    (claimableAmounts as [bigint, bigint] | undefined)?.[0] || BigInt(0);
  const claimableLeveraged =
    (claimableAmounts as [bigint, bigint] | undefined)?.[1] || BigInt(0);

  return {
    canClaim: !!canClaim,
    genesisEnded: !!genesisEnded,
    userShares: userShares || BigInt(0),
    claimablePegged,
    claimableLeveraged,
    claimTokens,
    withdrawCollateral,
    isPending,
    claimSuccess,
    claimHash,
    market,
  };
}
