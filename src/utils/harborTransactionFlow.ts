import type { Hash, PublicClient } from "viem";
import type { HarborTransactionModalControls } from "@/hooks/useHarborTransactionModal";

export type HarborTransactionStep = {
  title: string;
  awaitingMessage?: string;
  confirmingMessage?: string;
  execute: () => Promise<Hash>;
  simulate?: () => Promise<void>;
};

export async function runHarborTransactionFlow(params: {
  txModal: HarborTransactionModalControls;
  publicClient: PublicClient | undefined;
  steps: HarborTransactionStep[];
  successTitle: string;
  successMessage: (lastHash: Hash) => string;
  errorTitle: string;
  parseError: (error: unknown) => string;
  onComplete?: () => Promise<void>;
}): Promise<{ ok: true; hash: Hash } | { ok: false; message: string }> {
  const {
    txModal,
    publicClient,
    steps,
    successTitle,
    successMessage,
    errorTitle,
    parseError,
    onComplete,
  } = params;

  try {
    let lastHash: Hash | undefined;

    for (const step of steps) {
      txModal.openAwaitingWallet(
        step.title,
        step.awaitingMessage ?? "Confirm the transaction in your wallet."
      );

      if (step.simulate) {
        await step.simulate();
      }

      lastHash = await step.execute();

      txModal.openConfirming(
        step.title,
        step.confirmingMessage ?? "Waiting for on-chain confirmation…",
        lastHash
      );

      await publicClient?.waitForTransactionReceipt({ hash: lastHash });
    }

    if (!lastHash) {
      throw new Error("No transaction hash");
    }

    await onComplete?.();

    txModal.openSuccess(successTitle, successMessage(lastHash), lastHash);
    return { ok: true, hash: lastHash };
  } catch (error) {
    const message = parseError(error);
    txModal.openError(errorTitle, message);
    return { ok: false, message };
  }
}
