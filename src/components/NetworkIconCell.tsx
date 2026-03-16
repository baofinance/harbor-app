"use client";

import Image from "next/image";
import SimpleTooltip from "@/components/SimpleTooltip";
import NetworkIconClient from "@/components/NetworkIconClient";
import { getWeb3iconsNetworkId } from "@/config/web3iconsNetworks";

interface NetworkIconCellProps {
  /** Display name for tooltip (e.g. "Ethereum", "MegaETH") */
  chainName: string;
  /** Optional path for fallback when not in web3icons (e.g. "icons/eth.png") */
  chainLogo?: string;
  className?: string;
  size?: number;
}

/**
 * Renders network icon only; mouseover shows network name.
 * Uses @web3icons NetworkIcon when available, else chain logo image.
 */
export default function NetworkIconCell({
  chainName,
  chainLogo = "icons/eth.png",
  className = "",
  size = 20,
}: NetworkIconCellProps) {
  const networkId = getWeb3iconsNetworkId(chainName);
  const logoPath = chainLogo?.startsWith("/") ? chainLogo : `/${chainLogo}`;

  return (
    <SimpleTooltip label={chainName}>
      <span
        className={`inline-flex items-center justify-center shrink-0 cursor-help ${className}`}
      >
        {networkId ? (
          <NetworkIconClient
            name={networkId}
            size={size}
            variant="branded"
          />
        ) : (
          <Image
            src={logoPath}
            alt=""
            width={size}
            height={size}
            className="rounded-full object-contain"
          />
        )}
      </span>
    </SimpleTooltip>
  );
}
