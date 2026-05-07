"use client";

import Image from "next/image";
import Link from "next/link";
import {
  InformationCircleIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { AnchorHowToGuide } from "@/components/anchor/AnchorHowToGuide";
import { AnchorStabilityPools } from "@/components/anchor/AnchorStabilityPools";
import { getLogoPath } from "@/lib/logos";

export type AnchorTokenLandingProps = {
  tokenSymbol: string;
  pegTarget: string;
  tokenName: string;
};

const shellClass =
  "flex min-h-0 flex-1 flex-col text-white max-w-[1300px] mx-auto font-sans relative w-full";
const panelClass =
  "rounded-xl border border-white/10 bg-[#17395F]/90 p-5 shadow-sm";
const faqItemClass =
  "rounded-xl border border-white/10 bg-black/[0.10] p-4";

export function AnchorTokenLanding({
  tokenSymbol,
  pegTarget,
  tokenName,
}: AnchorTokenLandingProps) {
  const heroIcon = getLogoPath(tokenSymbol);

  return (
    <div className={shellClass}>
      <main className="container mx-auto px-4 pb-10 sm:px-10">
        <header className="mb-8 mt-2">
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/25 bg-white/5 shadow-md ring-1 ring-white/15 sm:h-24 sm:w-24 md:h-28 md:w-28">
              <Image
                src={heroIcon}
                alt={`${tokenSymbol} logo`}
                width={112}
                height={112}
                className="h-[85%] w-[85%] object-contain"
                priority
              />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <h1 className="font-mono text-4xl font-bold text-white sm:text-5xl md:text-6xl">
                {tokenSymbol}
              </h1>
              <p className="mt-2 text-lg text-white/80">
                Earn yield on {pegTarget} exposure
              </p>
            </div>
          </div>
        </header>

        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <div className={panelClass}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
                <InformationCircleIcon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                  What is <span className="normal-case">{tokenSymbol}</span>?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/80">
                  {tokenName} is a pegged token designed to track the value of{" "}
                  {pegTarget} while letting you earn protocol yield.
                </p>
              </div>
            </div>
          </div>
          <div className={panelClass}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
                <WrenchScrewdriverIcon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                  How it works
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/80">
                  Yield from collateral and trading fees is paid to stability
                  pools for helping protect the protocol.
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-8 space-y-4">
          <div className={`${panelClass} mb-6`}>
            <h3 className="mb-3 text-base font-semibold text-white">
              How to earn yield with {tokenSymbol}
            </h3>
            <AnchorHowToGuide />
          </div>

          <h3 className="text-base font-semibold text-white">
            {tokenSymbol} opportunities
          </h3>
          <AnchorStabilityPools tokenSymbol={tokenSymbol} />
        </section>

        <section className="mb-10">
          <h3 className="mb-4 text-base font-semibold text-white">FAQ</h3>
          <div className="space-y-3">
            <div className={faqItemClass}>
              <div className="font-semibold text-white">
                What is {tokenSymbol}?
              </div>
              <div className="mt-2 text-sm leading-relaxed text-white/80">
                {tokenSymbol} is Harbor’s {pegTarget}-pegged token designed to
                track {pegTarget} value while letting users earn yield through
                protocol rewards.
              </div>
            </div>
            <div className={faqItemClass}>
              <div className="font-semibold text-white">
                Where does the yield come from?
              </div>
              <div className="mt-2 text-sm leading-relaxed text-white/80">
                Yield is funded by collateral yield and trading fees and is
                distributed to stability pools that help protect the protocol.
              </div>
            </div>
            <div className={faqItemClass}>
              <div className="font-semibold text-white">
                What are stability pools?
              </div>
              <div className="mt-2 text-sm leading-relaxed text-white/80">
                Stability pools are where {tokenSymbol} holders deposit to earn
                rewards. Pools help the protocol rebalance by exchanging pegged
                tokens for collateral or leveraged tokens when needed.
              </div>
            </div>
            <div className={faqItemClass}>
              <div className="font-semibold text-white">
                Can {tokenSymbol} deviate from {pegTarget}?
              </div>
              <div className="mt-2 text-sm leading-relaxed text-white/80">
                {tokenSymbol} is always redeemable for collateral at the market
                price of {pegTarget}.
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="https://docs.harborfinance.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-[10rem] items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
          >
            Learn more
          </Link>
          <Link
            href="/transparency"
            className="inline-flex min-w-[10rem] items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
          >
            View protocol stats
          </Link>
        </footer>
      </main>
    </div>
  );
}
