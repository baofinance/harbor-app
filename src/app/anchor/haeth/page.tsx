import type { Metadata } from "next";
import { markets } from "@/config/markets";
import { AnchorTokenLanding } from "@/components/anchor/AnchorTokenLanding";

const TOKEN_SYMBOL = "haETH";

const tokenMarket = Object.values(markets).find(
  (market) =>
    market.peggedToken?.symbol?.toLowerCase() === TOKEN_SYMBOL.toLowerCase()
);

const pegTarget = tokenMarket?.pegTarget || "ETH";
const tokenName = tokenMarket?.peggedToken?.name || "Harbor Anchored ETH";

export const metadata: Metadata = {
  title: TOKEN_SYMBOL,
  description: `Earn real yield while keeping ${pegTarget}-pegged exposure with ${TOKEN_SYMBOL}.`,
};

export default function HaEthPage() {
  return (
    <AnchorTokenLanding
      tokenSymbol={TOKEN_SYMBOL}
      pegTarget={pegTarget}
      tokenName={tokenName}
    />
  );
}
