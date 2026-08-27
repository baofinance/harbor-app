/**
 * usePermitFlow Hook
 *
 * Composes usePermitCapability and usePermitOrApproval for modal permit flows.
 * Provides permit state (enabled/disabled) that syncs with wallet capability,
 * plus the handler for executing permit or approval.
 */

import { useEffect, useState } from "react";
import { usePermitCapability, type UsePermitCapabilityOptions } from "./usePermitCapability";
import { usePermitOrApproval } from "./usePermitOrApproval";

export interface UsePermitFlowOptions extends UsePermitCapabilityOptions {
  /** Initial permit toggle state; defaults to true for backward compatibility */
  defaultEnabled?: boolean;
}

export interface UsePermitFlowResult {
  /** Whether permit is expected to work */
  isPermitCapable: boolean;
  /** Human-readable reason when permit is disabled (for tooltip) */
  disableReason: string | null;
  /** Loading state while checking capability */
  isLoading: boolean;
  /** Handler to execute permit or fallback to approval */
  handlePermitOrApproval: ReturnType<typeof usePermitOrApproval>["handlePermitOrApproval"];
  /** User's permit toggle state */
  permitEnabled: boolean;
  /** Set permit toggle state */
  setPermitEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Unified permit flow for Genesis, Sail, and Anchor modals.
 * Syncs permitEnabled off when wallet/token is not permit-capable; does not auto-enable.
 */
export function usePermitFlow(
  enabledOrOptions: boolean | UsePermitFlowOptions = true
): UsePermitFlowResult {
  const opts =
    typeof enabledOrOptions === "boolean"
      ? { enabled: enabledOrOptions }
      : enabledOrOptions;

  const { isPermitCapable, disableReason, isLoading } = usePermitCapability(opts);
  const { handlePermitOrApproval } = usePermitOrApproval();
  const defaultEnabled = opts.defaultEnabled ?? true;

  const [permitEnabled, setPermitEnabled] = useState(defaultEnabled);

  useEffect(() => {
    if (!isPermitCapable) setPermitEnabled(false);
  }, [isPermitCapable]);

  return {
    isPermitCapable,
    disableReason,
    isLoading,
    handlePermitOrApproval,
    permitEnabled,
    setPermitEnabled,
  };
}
