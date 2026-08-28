"use client";

import type { AnchorDepositWithdrawModalProps } from "./types";
import { useAnchorDepositWithdrawModal } from "./useAnchorDepositWithdrawModal";
import { AnchorDepositWithdrawModalView } from "./AnchorDepositWithdrawModalView";

export type {
  AnchorDepositWithdrawModalProps,
  AnchorDepositWithdrawTab,
} from "./types";

export const AnchorDepositWithdrawModal = (
  props: AnchorDepositWithdrawModalProps,
) => {
  const vm = useAnchorDepositWithdrawModal(props);
  if (!vm.shouldRender) return null;
  return <AnchorDepositWithdrawModalView {...vm} />;
};
