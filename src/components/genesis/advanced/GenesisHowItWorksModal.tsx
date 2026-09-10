"use client";

import { DepositModalShell } from "@/components/DepositModalShell";
import { DepositModalTabHeader } from "@/components/DepositModalTabHeader";
import { GenesisHowItWorksContent } from "./GenesisHowItWorksContent";

export type GenesisHowItWorksModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

/** Product-modal chrome for How it works (same overlay as deposit manage). */
export function GenesisHowItWorksModal({
  isOpen,
  onClose,
}: GenesisHowItWorksModalProps) {
  return (
    <DepositModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="How it works"
      tabs={
        <DepositModalTabHeader
          tabs={[{ value: "how", label: "Voyage steps" }]}
          activeTab="how"
          onTabChange={() => {}}
        />
      }
    >
      <div className="px-1 py-2 sm:px-0.5">
        <GenesisHowItWorksContent />
      </div>
    </DepositModalShell>
  );
}
