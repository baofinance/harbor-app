"use client";

import { useMemo } from "react";

export type ChainOption = {
  name: string;
  logo: string;
};

interface ChainFilterProps {
  /** Market entries [id, market] - each market may have chain: { name, logo } */
  marketEntries: Array<[string, { chain?: { name: string; logo: string } }]>;
  value: string | null;
  onChange: (chainName: string | null) => void;
  className?: string;
}

function ChainBadge({ chain, selected }: { chain: ChainOption; selected?: boolean }) {
  const src = chain.logo.startsWith("/") ? chain.logo : `/${chain.logo}`;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5 font-medium border transition-colors ${
        selected
          ? "bg-white/15 text-white border-white/40"
          : "bg-white/5 text-white/80 border-white/20 hover:bg-white/10 hover:border-white/30"
      }`}
    >
      <img
        src={src}
        alt=""
        className="w-3.5 h-3.5 rounded-full object-contain flex-shrink-0"
      />
      {chain.name}
    </span>
  );
}

export default function ChainFilter({
  marketEntries,
  value,
  onChange,
  className = "",
}: ChainFilterProps) {
  const uniqueChains = useMemo(() => {
    const seen = new Set<string>();
    const chains: ChainOption[] = [];
    for (const [, m] of marketEntries) {
      const chain = m?.chain;
      if (chain?.name && !seen.has(chain.name)) {
        seen.add(chain.name);
        chains.push({ name: chain.name, logo: chain.logo || "icons/eth.png" });
      }
    }
    return chains.sort((a, b) => a.name.localeCompare(b.name));
  }, [marketEntries]);

  if (uniqueChains.length <= 1) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs text-white/60 mr-1">Chain:</span>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`inline-flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5 font-medium border transition-colors ${
          value === null
            ? "bg-white/15 text-white border-white/40"
            : "bg-white/5 text-white/80 border-white/20 hover:bg-white/10 hover:border-white/30"
        }`}
      >
        All
      </button>
      {uniqueChains.map((chain) => (
        <button
          key={chain.name}
          type="button"
          onClick={() => onChange(value === chain.name ? null : chain.name)}
          className="focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-1 focus:ring-offset-[#0f172a] rounded-md"
        >
          <ChainBadge chain={chain} selected={value === chain.name} />
        </button>
      ))}
    </div>
  );
}
