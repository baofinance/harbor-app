import { SparklesIcon } from "@heroicons/react/24/solid";

/**
 * Full-width explainer for Ledger Marks — Extended (UI+) layout only.
 */
export function AnchorLedgerMarksHero() {
  return (
    <div className="mt-1 mb-2 rounded-xl border border-white/15 bg-[#0a1628]/90 px-4 py-4 sm:px-5 sm:py-5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.45)] backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF8A7A]/20 ring-1 ring-[#FF8A7A]/40"
          aria-hidden
        >
          <SparklesIcon className="h-5 w-5 text-[#FF8A7A]" />
        </div>
        <div className="min-w-0 flex-1 space-y-3 text-sm text-white/90">
          <h2 className="text-base font-bold text-white sm:text-lg">
            What are Ledger Marks?
          </h2>
          <p className="leading-relaxed text-white/85">
            A ledger is both a record of truth and a core DeFi symbol — and a
            mark is what every sailor leaves behind on a voyage.
          </p>
          <p className="leading-relaxed text-white/85">
            Each Ledger Mark is proof that you were here early, helping
            stabilize the first Harbor markets and guide them through calm launch
            conditions.
          </p>
          <ul className="space-y-2.5 text-white/85">
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1.5 inline-flex shrink-0" aria-hidden>
                <SparklesIcon className="h-4 w-4 text-[#FF8A7A]" />
              </span>
              <span>
                <span className="font-semibold text-white">
                  Maiden Voyage Deposits:
                </span>{" "}
                Earn 10{" "}
                <SparklesIcon className="inline h-3.5 w-3.5 -translate-y-px text-[#FF8A7A]" />{" "}
                per dollar per day during maiden voyage, plus 100{" "}
                <SparklesIcon className="inline h-3.5 w-3.5 -translate-y-px text-[#FF8A7A]" />{" "}
                per dollar bonus at maiden voyage end.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1.5 inline-flex shrink-0" aria-hidden>
                <SparklesIcon className="h-4 w-4 text-[#FF8A7A]" />
              </span>
              <span>
                <span className="font-semibold text-white">
                  Holding Anchor Tokens:
                </span>{" "}
                Earn 1{" "}
                <SparklesIcon className="inline h-3.5 w-3.5 -translate-y-px text-[#FF8A7A]" />{" "}
                per dollar per day.
              </span>
            </li>
            <li className="flex gap-2 leading-relaxed">
              <span className="mt-1.5 inline-flex shrink-0" aria-hidden>
                <SparklesIcon className="h-4 w-4 text-[#FF8A7A]" />
              </span>
              <span>
                <span className="font-semibold text-white">
                  Holding Sail Tokens:
                </span>{" "}
                Earn 10{" "}
                <SparklesIcon className="inline h-3.5 w-3.5 -translate-y-px text-[#FF8A7A]" />{" "}
                per dollar per day.
              </span>
            </li>
            <li className="pl-6 leading-relaxed text-white/85">
              When $TIDE surfaces, these marks will convert into your share of
              rewards and governance power.
            </li>
          </ul>
          <div className="border-t border-white/15 pt-3">
            <p className="text-sm italic leading-relaxed text-white/70">
              Think of them as a record of your journey — every mark, a line in
              Harbor&apos;s logbook.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
