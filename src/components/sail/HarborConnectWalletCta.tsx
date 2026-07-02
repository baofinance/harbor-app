"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useHarborWalletConnectors } from "@/hooks/useHarborWalletConnectors";
import { HarborWalletModal } from "@/components/Wallet";
import { SAIL_TRADE_PRIMARY_BUY_CLASS } from "@/components/sail/advanced/sailAdvancedStyles";

type HarborConnectWalletCtaProps = {
  className?: string;
  label?: string;
};

/** Full-width solid mint CTA that opens the shared Harbor wallet modal. */
export function HarborConnectWalletCta({
  className,
  label = "Connect wallet",
}: HarborConnectWalletCtaProps) {
  const [showModal, setShowModal] = useState(false);
  const { isConnected } = useAccount();
  const { reset } = useHarborWalletConnectors();

  useEffect(() => {
    if (isConnected) {
      setShowModal(false);
    }
  }, [isConnected]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setShowModal(true);
        }}
        className={className ?? SAIL_TRADE_PRIMARY_BUY_CLASS}
      >
        {label}
      </button>
      {showModal ? (
        <HarborWalletModal
          onClose={() => {
            reset();
            setShowModal(false);
          }}
          onConnected={() => setShowModal(false)}
        />
      ) : null}
    </>
  );
}
