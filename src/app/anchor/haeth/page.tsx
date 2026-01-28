import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  InformationCircleIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { markets } from "@/config/markets";
import { AnchorHowToGuide } from "@/components/anchor/AnchorHowToGuide";
import { AnchorStabilityPools } from "@/components/anchor/AnchorStabilityPools";

const TOKEN_SYMBOL = "haETH";

const tokenMarket = Object.values(markets).find(
  (market) => market.peggedToken?.symbol?.toLowerCase() === TOKEN_SYMBOL.toLowerCase()
);

const pegTarget = tokenMarket?.pegTarget || "ETH";
const tokenName = tokenMarket?.peggedToken?.name || "Harbor Anchored ETH";
const collateralSymbol = tokenMarket?.collateral?.symbol || "fxSAVE";

export const metadata: Metadata = {
  title: `${TOKEN_SYMBOL} — Earn yield on ${pegTarget} exposure`,
  description: `Earn real yield while keeping ${pegTarget}-pegged exposure with ${TOKEN_SYMBOL}.`,
};

export default function HaEthPage() {
  return (
    <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
      <main className="container mx-auto px-4 sm:px-10 pb-10">
        <div className="mb-4">
          <div className="p-4 flex items-center justify-center mb-0">
            <div className="flex items-center gap-4">
              <Image
                src="/icons/haETH.png"
                alt="haETH logo"
                width={128}
                height={128}
                className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24"
                priority
              />
              <h1 className="font-bold font-mono text-white text-5xl sm:text-6xl md:text-7xl text-center">
                {TOKEN_SYMBOL}
              </h1>
            </div>
          </div>
          <div className="flex items-center justify-center mb-2 -mt-3">
            <p className="text-white/80 text-lg text-center">
              Earn yield on {pegTarget}{" "}exposure
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-[#17395F] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center">
                <InformationCircleIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-white text-sm uppercase tracking-wider">
                  What is <span className="normal-case">{TOKEN_SYMBOL}</span>?
                </h2>
                <p className="text-white/80 text-sm mt-2">
                  {tokenName} is a pegged token designed to track the value of{" "}
                  {pegTarget}{" "}while letting you earn protocol yield.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[#17395F] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center">
                <WrenchScrewdriverIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-white text-sm uppercase tracking-wider">
                  How it works
                </h2>
                <p className="text-white/80 text-sm mt-2">
                  Yield from collateral and trading fees is paid to stability pools
                  for helping protect the protocol.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="bg-[#17395F] p-4 mb-4">
            <h3 className="font-semibold text-white text-base mb-2">
              How to earn yield with haETH
            </h3>
            <AnchorHowToGuide />
          </div>

          <h3 className="font-semibold text-white text-base mb-2">
            haETH opportunities
          </h3>
          <AnchorStabilityPools tokenSymbol={TOKEN_SYMBOL} />
        </div>

        <div className="mb-8">
          <h3 className="font-semibold text-white text-base mb-3">FAQ</h3>
          <div className="space-y-3">
            <div className="bg-black/[0.10] border border-white/10 p-4">
              <div className="text-white font-semibold">
                What is haETH?
              </div>
              <div className="text-white/80 text-sm mt-2">
                haETH is Harbor’s ETH-pegged token designed to track ETH value while
                letting users earn yield through protocol rewards.
              </div>
            </div>
            <div className="bg-black/[0.10] border border-white/10 p-4">
              <div className="text-white font-semibold">
                Where does the yield come from?
              </div>
              <div className="text-white/80 text-sm mt-2">
                Yield is funded by collateral yield and trading fees and is distributed
                to stability pools that help protect the protocol.
              </div>
            </div>
            <div className="bg-black/[0.10] border border-white/10 p-4">
              <div className="text-white font-semibold">
                What are stability pools?
              </div>
              <div className="text-white/80 text-sm mt-2">
                Stability pools are where haETH holders deposit to earn rewards. Pools
                help the protocol rebalance by exchanging pegged tokens for collateral
                or leveraged tokens when needed.
              </div>
            </div>
            <div className="bg-black/[0.10] border border-white/10 p-4">
              <div className="text-white font-semibold">
                Can haETH deviate from ETH?
              </div>
              <div className="text-white/80 text-sm mt-2">
                haETH is always redeemable for collateral at the market price of ETH.
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="https://docs.harborfinance.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
          >
            Learn more
          </Link>
          <Link
            href="/transparency"
            className="inline-flex items-center justify-center rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
          >
            View protocol stats
          </Link>
        </div>
      </main>
    </div>
  );
}
