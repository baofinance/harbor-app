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
import { useTideAllocationSnapshot } from "@/hooks/useTideAllocationSnapshot";
import { useTideTransactionModal } from "@/hooks/useTideTransactionModal";
import {
  formatTideClaimWindowFooter,
  formatTideClaimWindowMessage,
  getTideClaimWindowStatus,
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
  const veBaoSnapshot = useTideAllocationSnapshot("veBao");
  const standardSnapshot = useTideAllocationSnapshot("standard");
  const connectedChainId = useChainId();
  const txModal = useTideTransactionModal();

  const address = veBaoSnapshot.address;
  const isConnected = veBaoSnapshot.isConnected;

  const [claimingPath, setClaimingPath] = useState<ClaimPath | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const distributor = TIDE_CONFIG.distributorAddress;
  const veBaoAmount = getTideAmountWei(veBaoSnapshot.allocation);
  const standardAmount = getTideAmountWei(standardSnapshot.allocation);

  const isWrongChain =
    isConnected && connectedChainId !== TIDE_CONFIG.chainId;

  const { data: startDate, isLoading: isLoadingStart } = useReadContract({
    address: distributor,
    abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
    functionName: "startDate",
    chainId: TIDE_CONFIG.chainId,
  });

  const { data: endDate, isLoading: isLoadingEnd } = useReadContract({
    address: distributor,
    abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
    functionName: "endDate",
    chainId: TIDE_CONFIG.chainId,
  });

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

  const claimWindowStatus = getTideClaimWindowStatus(
    startDate as bigint | undefined,
    endDate as bigint | undefined
  );
  const claimWindowMessage = isWrongChain
    ? "Switch to Ethereum mainnet to claim"
    : formatTideClaimWindowMessage(
        claimWindowStatus,
        startDate as bigint | undefined,
        endDate as bigint | undefined
      );
  const claimWindowFooter = isWrongChain
    ? "Switch to Ethereum mainnet to claim"
    : formatTideClaimWindowFooter(
        claimWindowStatus,
        startDate as bigint | undefined,
        endDate as bigint | undefined
      );

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: TIDE_CONFIG.chainId });

  const isSnapshotLoading =
    veBaoSnapshot.isLoading || standardSnapshot.isLoading;
  const isChainLoading = isLoadingStart || isLoadingEnd;

  const veBaoBlockReason = useMemo(() => {
    if (isWrongChain) return claimWindowMessage;
    if (!veBaoSnapshot.hasAllocation) return null;
    if (hasClaimedVeBao) return "Already claimed";
    if (claimWindowStatus !== "open") return claimWindowMessage;
    if (!veBaoSnapshot.hasProof) return "Missing merkle proof in snapshot";
    return getVeBaoClaimBlockReason(veClaimStatus);
  }, [
    isWrongChain,
    claimWindowMessage,
    veBaoSnapshot.hasAllocation,
    veBaoSnapshot.hasProof,
    hasClaimedVeBao,
    claimWindowStatus,
    veClaimStatus,
  ]);

  const standardBlockReason = useMemo(() => {
    if (isWrongChain) return claimWindowMessage;
    if (!standardSnapshot.hasAllocation) return null;
    if (hasClaimedStandard) return "Already claimed";
    if (claimWindowStatus !== "open") return claimWindowMessage;
    if (!standardSnapshot.hasProof) return "Missing merkle proof in snapshot";
    return null;
  }, [
    isWrongChain,
    claimWindowMessage,
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

      if (!address || tideAmount === undefined || !proof?.length) {
        setClaimError("Missing allocation proof");
        return;
      }

      if (isWrongChain) {
        setClaimError("Switch to Ethereum mainnet to claim");
        return;
      }

      const functionName = path === "veBao" ? "claimVeBao" : "claimStandard";

      setClaimError(null);
      setClaimingPath(path);
      txModal.openAwaitingWallet(
        label,
        "Confirm the transaction in your wallet."
      );

      try {
        await publicClient?.simulateContract({
          address: distributor,
          abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
          functionName,
          args: [tideAmount, proof],
          account: address,
        });

        const hash = await writeContractAsync({
          address: distributor,
          abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
          functionName,
          args: [tideAmount, proof],
          chainId: TIDE_CONFIG.chainId,
        });

        txModal.openConfirming(
          label,
          "Waiting for on-chain confirmation…",
          hash
        );

        await publicClient?.waitForTransactionReceipt({ hash });
        await Promise.all([
          refetchVeBaoClaimed(),
          refetchStandardClaimed(),
          refetchVeStatus(),
        ]);

        txModal.openSuccess(
          "Claim successful",
          `Your ${label.toLowerCase()} TIDE has been sent to your wallet.`,
          hash
        );
      } catch (error) {
        const message = parseTideClaimError(error);
        setClaimError(message);
        txModal.openError("Claim failed", message);
      } finally {
        setClaimingPath(null);
      }
    },
    [
      veBaoSnapshot,
      standardSnapshot,
      address,
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
    claimWindowMessage,
    claimWindowFooter,
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
    txModal: txModal.modal,
    closeTxModal: txModal.close,
    canClaimVeBao:
      veBaoSnapshot.hasAllocation &&
      veBaoSnapshot.hasProof &&
      !hasClaimedVeBao &&
      !isWrongChain &&
      claimWindowStatus === "open" &&
      veBaoBlockReason === null,
    canClaimStandard:
      standardSnapshot.hasAllocation &&
      standardSnapshot.hasProof &&
      !hasClaimedStandard &&
      !isWrongChain &&
      claimWindowStatus === "open" &&
      standardBlockReason === null,
  };
}
