"use client";

import { DepositModalShell } from "@/components/DepositModalShell";
import { DepositModalTabHeader } from "@/components/DepositModalTabHeader";
import { DepositModalLayout } from "@/components/deposit/DepositModalLayout";
import { GenesisHowItWorksContent } from "./GenesisHowItWorksContent";

export type GenesisHowItWorksModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

/** Product-modal chrome for How it works (same Anchor/Sail overlay shell). */
export function GenesisHowItWorksModal({
  isOpen,
  onClose,
}: GenesisHowItWorksModalProps) {
  return (
    <DepositModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Genesis · How it works"
      tabs={
        <DepositModalTabHeader
          tabs={[{ value: "how", label: "Voyage steps" }]}
          activeTab="how"
          onTabChange={() => {}}
        />
      }
    >
      <DepositModalLayout
        scroll={<GenesisHowItWorksContent />}
      />
    </DepositModalShell>
  );
}
