"use client";

import { TokenSelectorDropdown } from "@/components/TokenSelectorDropdown";
import {
  DEPOSIT_AMOUNT_CARD_CLASS,
  DEPOSIT_SECTION_LABEL_CLASS,
} from "@/components/deposit/depositFlowStyles";

export type DepositRewardTokenOption = {
  symbol: string;
  name?: string;
  description?: string;
};

type DepositRewardTokenCardProps = {
  value: string;
  onChange: (token: string) => void;
  options: DepositRewardTokenOption[];
  disabled?: boolean;
  peggedTokenSymbol: string;
  selectedRewardToken: string | null;
  label?: string;
  placeholder?: string;
};

export function DepositRewardTokenCard({
  value,
  onChange,
  options,
  disabled = false,
  peggedTokenSymbol,
  selectedRewardToken,
  label = "Reward token",
  placeholder = "Select a reward token",
}: DepositRewardTokenCardProps) {
  return (
    <div className={DEPOSIT_AMOUNT_CARD_CLASS}>
      <div className="space-y-2">
        <span className={DEPOSIT_SECTION_LABEL_CLASS}>{label}</span>
        <TokenSelectorDropdown
          value={value}
          onChange={onChange}
          options={options.map(({ symbol, name, description }) => ({
            symbol,
            name: name ?? symbol,
            description,
          }))}
          disabled={disabled}
          placeholder={placeholder}
        />
        {selectedRewardToken ? (
          <p className="text-xs text-[#1E4775]/60 flex items-center gap-1">
            <span aria-hidden>ℹ️</span>
            <span>
              You&apos;ll earn {selectedRewardToken} as rewards for providing
              stability to the protocol
            </span>
          </p>
        ) : (
          <p className="text-xs text-[#1E4775]/60 flex items-center gap-1">
            <span aria-hidden>ℹ️</span>
            <span>
              You&apos;ll receive {peggedTokenSymbol} tokens directly to your
              wallet without earning rewards
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
