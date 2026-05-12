"use client";

import { useParams, notFound } from "next/navigation";
import { markets } from "@/config/markets";
import { AnchorTokenLanding } from "@/components/anchor/AnchorTokenLanding";

const findMarketBySymbol = (symbol: string) => {
  return Object.values(markets).find(
    (market) =>
      market.peggedToken?.symbol?.toLowerCase() === symbol.toLowerCase()
  );
};

export default function AnchorTokenPage() {
  const params = useParams();
  const symbol = params.symbol as string;
  const tokenMarket = findMarketBySymbol(symbol);

  if (!tokenMarket) {
    notFound();
  }

  const tokenSymbol = tokenMarket.peggedToken?.symbol || symbol;
  const pegTarget = tokenMarket.pegTarget || "ETH";
  const tokenName =
    tokenMarket.peggedToken?.name || `Harbor Anchored ${pegTarget}`;

  return (
    <AnchorTokenLanding
      tokenSymbol={tokenSymbol}
      pegTarget={pegTarget}
      tokenName={tokenName}
    />
  );
}
