"use client";

import { useImpersonation } from "@/contexts/ImpersonationContext";
import { HARBOR_FROSTED_ACTIVE_PILL } from "@/components/shared/harborFrostedSurfaceStyles";

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ImpersonationBanner() {
  const { impersonatedAddress, isImpersonating, clearImpersonation } =
    useImpersonation();

  if (!isImpersonating || !impersonatedAddress) return null;

  return (
    <div
      className="relative z-40 w-full border-b border-[#FF8A7A]/40 bg-[#FF8A7A]/15 px-4 py-2 text-center text-sm text-[#1E4775]"
      role="status"
    >
      <span className="font-medium">Viewing as</span>{" "}
      <span className="font-mono font-semibold">
        {shortenAddress(impersonatedAddress)}
      </span>
      <span className="text-[#1E4775]/70">
        {" "}
        — read-only preview. Transactions use your connected wallet.
      </span>
      <button
        type="button"
        onClick={clearImpersonation}
        className={`ml-2 inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${HARBOR_FROSTED_ACTIVE_PILL} ring-1 ring-[#1E4775]/20 hover:bg-white`}
      >
        Exit
      </button>
    </div>
  );
}
