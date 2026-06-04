"use client";

/** Centered section label under modal tabs (Deposit / Withdraw collateral & amount). */
export function DepositModalSectionHeading({ children }: { children: string }) {
  return (
    <div className="flex items-center justify-center border-b border-[#e2e8f0] pb-3 text-sm font-semibold text-[#1E4775]">
      {children}
    </div>
  );
}
