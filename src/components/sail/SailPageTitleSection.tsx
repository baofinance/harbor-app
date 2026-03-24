/**
 * Sail index title + subtitle — shown in Basic and Extended layouts.
 */
export function SailPageTitleSection() {
  return (
    <>
      <div className="p-4 flex items-center justify-center mb-0">
        <h1 className="font-bold font-mono text-white text-5xl sm:text-6xl md:text-7xl text-center">
          Sail
        </h1>
      </div>
      <div className="flex items-center justify-center mb-2 -mt-6">
        <p className="text-white/80 text-lg text-center">
          Variable leverage tokens
        </p>
      </div>
    </>
  );
}
