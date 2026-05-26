import SafeAppsSDK from "@safe-global/safe-apps-sdk";
import { TREASURY_SAFE_ADDRESS } from "@/config/treasury";

export type AdminBatchCall = {
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
  label: string;
};

export type SafeInfo = {
  safeAddress: `0x${string}`;
  chainId: number;
};

export function copyToClipboard(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  void navigator.clipboard.writeText(text).catch(() => {});
}

export function isSafeContext(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function buildSafeTxBuilderJson(
  txs: AdminBatchCall[],
  meta: { name: string; description: string },
  chainId = "1"
): string {
  return JSON.stringify(
    {
      version: "1.0",
      chainId,
      createdAt: Date.now(),
      meta,
      transactions: txs.map((t) => ({
        to: t.to,
        value: t.value.toString(),
        data: t.data,
      })),
    },
    null,
    2
  );
}

export type ProposeSafeBatchResult =
  | { ok: true; safeTxHash?: string }
  | { ok: false; error: string };

export async function proposeSafeBatch(
  txs: AdminBatchCall[],
  safeInfo: SafeInfo | null,
  expectedTreasurySafe = TREASURY_SAFE_ADDRESS,
  expectedChainId = 1
): Promise<ProposeSafeBatchResult> {
  if (txs.length === 0) {
    return { ok: false, error: "No transactions generated." };
  }

  if (!safeInfo) {
    return {
      ok: false,
      error:
        "Open this page inside the Treasury Safe app to propose a batch, or copy Safe JSON and import it manually.",
    };
  }

  if (safeInfo.chainId !== expectedChainId) {
    return {
      ok: false,
      error: `Wrong chain: Safe is on chainId ${safeInfo.chainId}, expected ${expectedChainId}.`,
    };
  }

  if (
    safeInfo.safeAddress.toLowerCase() !==
    expectedTreasurySafe.toLowerCase()
  ) {
    return {
      ok: false,
      error: `Wrong Safe: expected ${expectedTreasurySafe}, but you're in ${safeInfo.safeAddress}.`,
    };
  }

  try {
    const sdk = new SafeAppsSDK();
    const res = await sdk.txs.send({
      txs: txs.map((t) => ({
        to: t.to,
        value: t.value.toString(),
        data: t.data,
      })),
    });
    const safeTxHash = (res as { safeTxHash?: string })?.safeTxHash;
    return { ok: true, safeTxHash };
  } catch (e: unknown) {
    const msg =
      e instanceof Error
        ? e.message
        : "Failed to propose Safe transaction via Safe Apps SDK.";
    return { ok: false, error: msg };
  }
}
