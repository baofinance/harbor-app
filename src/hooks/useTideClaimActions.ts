"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useChainId,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import {
  HARBOR_TIDE_DISTRIBUTOR_ABI,
  normalizeVeClaimStatus,
} from "@/abis/harborTideDistributor";
import { TIDE_CONFIG } from "@/config/tide";
import { useTideTransaction } from "@/contexts/TideTransactionContext";
import { useHarborAccount } from "@/hooks/useHarborAccount";
import { useTideClaimSnapshots } from "@/hooks/useTideAllocationSnapshot";
import { useTideDistributorWindow } from "@/hooks/useTideDistributorWindow";
import { runHarborTransactionFlow } from "@/utils/harborTransactionFlow";
import {
  getVeBaoClaimBlockReason,
  parseTideClaimError,
} from "@/utils/tideDistributor";
import { getTideAmountWei, normalizeMerkleProof } from "@/utils/tideClaim";

type ClaimPath = "veBao" | "standard";

const CLAIM_LABELS: Record<ClaimPath, string> = {
  veBao: "veBAO claim",
  standard: "Standard claim",
};

export function useTideClaimActions() {
  const { veBao: veBaoSnapshot, standard: standardSnapshot } =
    useTideClaimSnapshots();
  const {
    isConnected,
    isImpersonating,
    walletAddress,
    walletConnected,
  } = useHarborAccount();
  const connectedChainId = useChainId();
  const txModal = useTideTransaction();
  const {
    status: claimWindowStatus,
    isLoading: isChainLoading,
    windowMessage: claimWindowMessage,
    windowFooter: claimWindowFooter,
  } = useTideDistributorWindow();

  const address = veBaoSnapshot.address;

  const [claimingPath, setClaimingPath] = useState<ClaimPath | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const distributor = TIDE_CONFIG.distributorAddress;
  const veBaoAmount = getTideAmountWei(veBaoSnapshot.allocation);

  const isWrongChain =
    isConnected && connectedChainId !== TIDE_CONFIG.chainId;

  const { data: hasClaimedVeBao, refetch: refetchVeBaoClaimed } = useReadContract({
    address: distributor,
    abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
    functionName: "hasClaimedVeBao",
    args: address ? [address] : undefined,
    chainId: TIDE_CONFIG.chainId,
    query: { enabled: Boolean(address) && !isWrongChain },
  });

  const { data: hasClaimedStandard, refetch: refetchStandardClaimed } =
    useReadContract({
      address: distributor,
      abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
      functionName: "hasClaimedStandard",
      args: address ? [address] : undefined,
      chainId: TIDE_CONFIG.chainId,
      query: { enabled: Boolean(address) && !isWrongChain },
    });

  const { data: veClaimStatusRaw, refetch: refetchVeStatus } = useReadContract({
    address: distributor,
    abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
    functionName: "getVeClaimStatus",
    args:
      address && veBaoAmount !== undefined
        ? [address, veBaoAmount]
        : undefined,
    chainId: TIDE_CONFIG.chainId,
    query: {
      enabled: Boolean(
        address && veBaoAmount !== undefined && veBaoSnapshot.hasAllocation && !isWrongChain
      ),
    },
  });

  const veClaimStatus = normalizeVeClaimStatus(
    veClaimStatusRaw as Parameters<typeof normalizeVeClaimStatus>[0]
  );

  const resolvedClaimWindowMessage = isWrongChain
    ? "Switch to Ethereum mainnet to claim"
    : claimWindowMessage;
  const resolvedClaimWindowFooter = isWrongChain
    ? "Switch to Ethereum mainnet to claim"
    : claimWindowFooter;

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: TIDE_CONFIG.chainId });

  const isSnapshotLoading =
    veBaoSnapshot.isLoading || standardSnapshot.isLoading;

  const veBaoBlockReason = useMemo(() => {
    if (isWrongChain) return resolvedClaimWindowMessage;
    if (!veBaoSnapshot.hasAllocation) return null;
    if (hasClaimedVeBao) return "Already claimed";
    if (claimWindowStatus !== "open") return resolvedClaimWindowMessage;
    if (!veBaoSnapshot.hasProof) return "Missing merkle proof in snapshot";
    return getVeBaoClaimBlockReason(veClaimStatus);
  }, [
    isWrongChain,
    resolvedClaimWindowMessage,
    veBaoSnapshot.hasAllocation,
    veBaoSnapshot.hasProof,
    hasClaimedVeBao,
    claimWindowStatus,
    veClaimStatus,
  ]);

  const standardBlockReason = useMemo(() => {
    if (isWrongChain) return resolvedClaimWindowMessage;
    if (!standardSnapshot.hasAllocation) return null;
    if (hasClaimedStandard) return "Already claimed";
    if (claimWindowStatus !== "open") return resolvedClaimWindowMessage;
    if (!standardSnapshot.hasProof) return "Missing merkle proof in snapshot";
    return null;
  }, [
    isWrongChain,
    resolvedClaimWindowMessage,
    standardSnapshot.hasAllocation,
    standardSnapshot.hasProof,
    hasClaimedStandard,
    claimWindowStatus,
  ]);

  const submitClaim = useCallback(
    async (path: ClaimPath) => {
      const snapshot =
        path === "veBao" ? veBaoSnapshot : standardSnapshot;
      const tideAmount = getTideAmountWei(snapshot.allocation);
      const proof = normalizeMerkleProof(snapshot.allocation?.proof);
      const label = CLAIM_LABELS[path];
      const functionName = path === "veBao" ? "claimVeBao" : "claimStandard";

      if (!walletAddress || tideAmount === undefined || !proof?.length) {
        setClaimError("Missing allocation proof");
        return;
      }

      if (isImpersonating) {
        setClaimError("Connect your wallet to claim — impersonation is read-only");
        return;
      }

      if (isWrongChain) {
        setClaimError("Switch to Ethereum mainnet to claim");
        return;
      }

      setClaimError(null);
      setClaimingPath(path);

      const result = await runHarborTransactionFlow({
        txModal,
        publicClient,
        parseError: parseTideClaimError,
        errorTitle: "Claim failed",
        successTitle: "Claim successful",
        successMessage: () =>
          `Your ${label.toLowerCase()} TIDE has been sent to your wallet.`,
        onComplete: async () => {
          await Promise.all([
            refetchVeBaoClaimed(),
            refetchStandardClaimed(),
            refetchVeStatus(),
          ]);
        },
        steps: [
          {
            title: label,
            simulate: async () => {
              await publicClient?.simulateContract({
                address: distributor,
                abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
                functionName,
                args: [tideAmount, proof],
                account: walletAddress,
              });
            },
            execute: () =>
              writeContractAsync({
                address: distributor,
                abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
                functionName,
                args: [tideAmount, proof],
                chainId: TIDE_CONFIG.chainId,
              }),
          },
        ],
      });

      if (!result.ok) {
        setClaimError(result.message);
      }

      setClaimingPath(null);
    },
    [
      veBaoSnapshot,
      standardSnapshot,
      walletAddress,
      isImpersonating,
      isWrongChain,
      publicClient,
      distributor,
      writeContractAsync,
      refetchVeBaoClaimed,
      refetchStandardClaimed,
      refetchVeStatus,
      txModal,
    ]
  );

  const claimVeBao = useCallback(() => submitClaim("veBao"), [submitClaim]);
  const claimStandard = useCallback(() => submitClaim("standard"), [submitClaim]);

  return {
    isConnected,
    isWrongChain,
    isSnapshotLoading,
    isChainLoading,
    claimWindowStatus,
    claimWindowMessage: resolvedClaimWindowMessage,
    claimWindowFooter: resolvedClaimWindowFooter,
    veBaoAllocation: veBaoSnapshot.allocation,
    standardAllocation: standardSnapshot.allocation,
    hasClaimedVeBao: Boolean(hasClaimedVeBao),
    hasClaimedStandard: Boolean(hasClaimedStandard),
    veClaimStatus,
    veBaoBlockReason,
    standardBlockReason,
    claimingPath,
    claimError,
    claimVeBao,
    claimStandard,
    canClaimVeBao:
      walletConnected &&
      !isImpersonating &&
      veBaoSnapshot.hasAllocation &&
      veBaoSnapshot.hasProof &&
      !hasClaimedVeBao &&
      !isWrongChain &&
      claimWindowStatus === "open" &&
      veBaoBlockReason === null,
    canClaimStandard:
      walletConnected &&
      !isImpersonating &&
      standardSnapshot.hasAllocation &&
      standardSnapshot.hasProof &&
      !hasClaimedStandard &&
      !isWrongChain &&
      claimWindowStatus === "open" &&
      standardBlockReason === null,
  };
}
