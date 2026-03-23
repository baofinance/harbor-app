/**
 * Maiden Voyage heading + subtitle — shown in both Basic and Extended layouts.
 */
export function GenesisPageTitleSection() {
  return (
    <div className="mb-2">
      <div className="p-4 flex items-center justify-center mb-0">
        <h1 className="font-bold font-mono text-white text-5xl sm:text-6xl md:text-7xl text-center">
          Maiden Voyage
        </h1>
      </div>
      <div className="flex items-center justify-center mb-2 -mt-2">
        <p className="text-white/80 text-lg text-center">
          Earn rewards for providing initial liquidity for new markets
        </p>
      </div>
    </div>
  );
}
