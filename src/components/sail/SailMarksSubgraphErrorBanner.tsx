/**
 * Subgraph unavailable banner — Extended layout; mirrors Genesis campaign error tone.
 */
export function SailMarksSubgraphErrorBanner() {
  return (
    <div className="bg-[#FF8A7A]/10 border border-[#FF8A7A]/30 rounded p-3 mb-4">
      <div className="flex items-start gap-3">
        <div className="text-[#FF8A7A] text-xl mt-0.5">⚠️</div>
        <div className="flex-1">
          <p className="text-[#FF8A7A] font-semibold text-sm mb-1">
            Harbor Marks Subgraph Error
          </p>
          <p className="text-white/70 text-xs">
            Unable to load Harbor Marks data. This may be due to rate limiting or
            service issues. Your positions and core functionality remain
            unaffected.
          </p>
        </div>
      </div>
    </div>
  );
}
