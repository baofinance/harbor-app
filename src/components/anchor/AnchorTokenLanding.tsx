"use client";

import Image from "next/image";
import { useState } from "react";
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

// Genesis / index-card style surfaces (white card on dark background)
const GENESIS_CARD_SHELL =
  "rounded-xl bg-white text-[#1E4775] shadow-[0_16px_40px_-30px_rgba(0,0,0,0.55)] ring-1 ring-black/5";
const GENESIS_CARD_BODY = "px-5 py-5";
const GENESIS_CARD_HEADER = "text-sm font-semibold uppercase tracking-wider text-[#1E4775]";
const GENESIS_CARD_SUBTEXT = "mt-2 text-sm leading-relaxed text-[#1E4775]/80";

const FAQ_ROW_SHELL =
  "w-full rounded-xl bg-white text-[#1E4775] shadow-[0_16px_40px_-34px_rgba(0,0,0,0.5)] ring-1 ring-black/5";
const FAQ_ROW_HOVER = "transition";

export function AnchorTokenLanding({
  tokenSymbol,
  pegTarget,
  tokenName,
}: AnchorTokenLandingProps) {
  const heroIcon = getLogoPath(tokenSymbol);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  return (
    <div className={shellClass}>
      <main className="container mx-auto px-4 pb-10 sm:px-10">
        <header className="relative mb-8 mt-2">
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-md ring-1 ring-black/5 sm:h-24 sm:w-24 md:h-28 md:w-28">
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
          <div className={GENESIS_CARD_SHELL}>
            <div className={GENESIS_CARD_BODY}>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1E4775]/5">
                  <InformationCircleIcon className="h-5 w-5 text-[#1E4775]" />
                </div>
                <div className="min-w-0">
                  <h2 className={GENESIS_CARD_HEADER}>
                    What is <span className="normal-case">{tokenSymbol}</span>?
                  </h2>
                  <p className={GENESIS_CARD_SUBTEXT}>
                    {tokenName} is a pegged token designed to track the value of{" "}
                    {pegTarget} while letting you earn protocol yield.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className={GENESIS_CARD_SHELL}>
            <div className={GENESIS_CARD_BODY}>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1E4775]/5">
                  <WrenchScrewdriverIcon className="h-5 w-5 text-[#1E4775]" />
                </div>
                <div className="min-w-0">
                  <h2 className={GENESIS_CARD_HEADER}>How it works</h2>
                  <p className={GENESIS_CARD_SUBTEXT}>
                    Yield from collateral and trading fees is paid to stability
                    pools for helping protect the protocol.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-8 space-y-4">
          <div className={`${GENESIS_CARD_SHELL} mb-6`}>
            <div className={GENESIS_CARD_BODY}>
              <h3 className="mb-3 text-base font-semibold text-[#1E4775]">
                How to earn yield with {tokenSymbol}
              </h3>
              <AnchorHowToGuide />
            </div>
          </div>

          <h3 className="text-base font-semibold text-white">
            {tokenSymbol} opportunities
          </h3>
          <AnchorStabilityPools tokenSymbol={tokenSymbol} />
        </section>

        <section className="mb-10">
          <h3 className="mb-4 text-base font-semibold text-white">FAQ</h3>
          <div className="space-y-3">
            {[
              {
                id: "what",
                q: `What is ${tokenSymbol}?`,
                a: `${tokenSymbol} is Harbor’s ${pegTarget}-pegged token designed to track ${pegTarget} value while letting users earn yield through protocol rewards.`,
              },
              {
                id: "yield",
                q: "Where does the yield come from?",
                a: "Yield is funded by collateral yield and trading fees and is distributed to stability pools that help protect the protocol.",
              },
              {
                id: "pools",
                q: "What are stability pools?",
                a: `Stability pools are where ${tokenSymbol} holders deposit to earn rewards. Pools help the protocol rebalance by exchanging pegged tokens for collateral or leveraged tokens when needed.`,
              },
              {
                id: "deviate",
                q: `Can ${tokenSymbol} deviate from ${pegTarget}?`,
                a: `${tokenSymbol} is always redeemable for collateral at the market price of ${pegTarget}.`,
              },
            ].map((item) => {
              const isOpen = openFaq === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${FAQ_ROW_SHELL} ${FAQ_ROW_HOVER} px-5 py-4 text-left`}
                  onClick={() =>
                    setOpenFaq((prev) => (prev === item.id ? null : item.id))
                  }
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-semibold text-[#1E4775]">{item.q}</div>
                    <span className="text-[#1E4775]/60" aria-hidden>
                      {isOpen ? "–" : "+"}
                    </span>
                  </div>
                  {isOpen && (
                    <div className="mt-2 text-sm leading-relaxed text-[#1E4775]/80">
                      {item.a}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
