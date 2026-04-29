/**
 * Desktop column header for the Sail leverage markets table (hidden on small screens).
 */
export function SailMarketsTableHeader() {
  return (
    <div className="hidden md:block bg-white py-1.5 px-2 overflow-x-auto mb-2 rounded-md border border-[#1E4775]/15 shadow-sm">
      <div className="grid grid-cols-[32px_2.2fr_0.92fr_0.82fr_0.92fr_0.92fr_0.96fr_0.72fr] gap-3 lg:gap-3.5 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold">
        <div className="min-w-0" aria-label="Network" />
        <div className="min-w-0 text-center">Long / Short</div>
        <div className="text-center min-w-0">Token</div>
        <div className="text-center min-w-0">Leverage</div>
        <div className="text-center min-w-0">Your Position</div>
        <div className="text-center min-w-0">Current Value</div>
        <div className="text-center min-w-0">Mint / Redeem Fee</div>
        <div className="text-center min-w-0">Action</div>
      </div>
    </div>
  );
}
