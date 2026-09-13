"use client";

import {
  DEPOSIT_AMOUNT_CARD_CLASS,
  DEPOSIT_SECTION_LABEL_CLASS,
} from "@/components/deposit/depositFlowStyles";
import type { AnchorRedeemPosition } from "@/utils/anchorRedeemPositions";
import { isRequestedRedeemPosition } from "@/utils/anchorRedeemPositions";
import { AnchorRedeemPositionRow } from "./AnchorRedeemPositionRow";

export type AnchorRedeemPositionListProps = {
  positions: readonly AnchorRedeemPosition[];
  peggedTokenSymbol: string;
  selectedKey: string | null;
  disabled?: boolean;
  onSelect: (position: AnchorRedeemPosition) => void;
};

function PositionSection({
  label,
  positions,
  peggedTokenSymbol,
  selectedKey,
  disabled,
  onSelect,
  listLabel,
}: {
  label: string;
  positions: readonly AnchorRedeemPosition[];
  peggedTokenSymbol: string;
  selectedKey: string | null;
  disabled?: boolean;
  onSelect: (position: AnchorRedeemPosition) => void;
  listLabel: string;
}) {
  if (positions.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className={DEPOSIT_SECTION_LABEL_CLASS}>{label}</p>
      <ul className="space-y-1.5" role="listbox" aria-label={listLabel}>
        {positions.map((position) => (
          <li key={position.key}>
            <AnchorRedeemPositionRow
              position={position}
              peggedTokenSymbol={peggedTokenSymbol}
              selected={position.key === selectedKey}
              disabled={disabled}
              onSelect={() => onSelect(position)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnchorRedeemPositionList({
  positions,
  peggedTokenSymbol,
  selectedKey,
  disabled = false,
  onSelect,
}: AnchorRedeemPositionListProps) {
  if (positions.length === 0) {
    return (
      <div className={`${DEPOSIT_AMOUNT_CARD_CLASS} px-3 py-6 text-center`}>
        <p className="text-sm font-semibold text-[#1E4775]">No positions</p>
        <p className="mt-1 text-xs leading-snug text-[#1E4775]/65">
          You don&apos;t hold any {peggedTokenSymbol} in your wallet or
          stability pools yet. Mint first to get started.
        </p>
      </div>
    );
  }

  const activePositions = positions.filter((p) => !isRequestedRedeemPosition(p));
  const requestedPositions = positions.filter(isRequestedRedeemPosition);

  return (
    <div className="space-y-3.5">
      <PositionSection
        label="Your positions"
        listLabel="Active redeem positions"
        positions={activePositions}
        peggedTokenSymbol={peggedTokenSymbol}
        selectedKey={selectedKey}
        disabled={disabled}
        onSelect={onSelect}
      />
      <PositionSection
        label="Requested withdrawals"
        listLabel="Requested withdrawal positions"
        positions={requestedPositions}
        peggedTokenSymbol={peggedTokenSymbol}
        selectedKey={selectedKey}
        disabled={disabled}
        onSelect={onSelect}
      />
    </div>
  );
}
