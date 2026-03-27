import Image from "next/image";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { LEDGER_MARKS_HERO_CARD_CLASS } from "@/components/shared/indexMarketsToolbarStyles";

/** Inline Harbor marks glyph (same asset as tooltips / tables). */
function MarksGlyph({ className }: { className?: string }) {
  return (
    <Image
      src="/icons/marks.png"
      alt=""
      width={14}
      height={14}
      className={className}
    />
  );
}

/**
 * Full-width explainer for Ledger Marks — Extended (UI+) layout only.
 */
export function AnchorLedgerMarksHero() {
  return (
    <div className={LEDGER_MARKS_HERO_CARD_CLASS}>
      {/*
        Grid: icon only in column 1 (row 1). Title row 1 col 2. All body row 2 col 2 —
        so copy never flows under the icon (pl-12 is fragile on narrow viewports).
      */}
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-3">
        <div
          className="row-start-1 flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full bg-[#FF8A7A]/20 ring-1 ring-[#FF8A7A]/40"
          aria-hidden
        >
          <Image
            src="/icons/marks.png"
            alt=""
            width={22}
            height={22}
            className="h-5 w-5 object-contain opacity-95"
          />
        </div>
        <h2 className="row-start-1 col-start-2 min-w-0 self-center text-base font-bold leading-tight text-white sm:text-lg">
          What are Ledger Marks?
        </h2>
        <div className="row-start-2 col-start-2 min-w-0 space-y-3 text-sm text-white/90">
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
                <MarksGlyph className="inline-block h-3.5 w-3.5 -translate-y-px align-middle" />{" "}
                per dollar per day during maiden voyage, plus 100{" "}
                <MarksGlyph className="inline-block h-3.5 w-3.5 -translate-y-px align-middle" />{" "}
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
                <MarksGlyph className="inline-block h-3.5 w-3.5 -translate-y-px align-middle" />{" "}
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
                <MarksGlyph className="inline-block h-3.5 w-3.5 -translate-y-px align-middle" />{" "}
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
