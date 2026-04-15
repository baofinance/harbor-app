import { IndexPageTitleSection } from "@/components/shared/IndexPageTitleSection";

/**
 * Maiden Voyage heading + subtitle — shown in both Basic and Extended layouts.
 */
export function GenesisPageTitleSection() {
  return (
    <>
      <IndexPageTitleSection
        title="Maiden voyage"
        titleAccentSuffix="2.0"
        subtitle="Become a shareholder of new markets."
      />
      <p className="mx-auto max-w-2xl px-4 text-center text-sm text-white/70 leading-snug -mt-0.5 mb-1">
        The USD cap only sizes how much of the maiden-voyage pool you own.
        After genesis, a per-market share of mint/redeem fee and collateral carry
        revenue (see each market) is credited to that pool; your slice earns from
        what is credited. Anchor +
        Sail liquidity can raise your voyage boost on marks and yield weight.{" "}
        <a
          href="https://docs.harborfinance.io/maiden-voyage"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#FF8A7A] hover:text-[#ffb4a8] underline decoration-white/30 underline-offset-2 font-medium whitespace-nowrap"
        >
          Maiden voyage docs →
        </a>
      </p>
    </>
  );
}
