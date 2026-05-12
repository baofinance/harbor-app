"use client";

import { useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

type Step = {
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    title: "Select exposure",
    description:
      "On the Anchor page, click Manage for your desired token to open the modal.",
  },
  {
    title: "Select your deposit token",
    description:
      "Choose the token you want to deposit. It will be swapped into your chosen Anchor token and become market-owned collateral.",
  },
  {
    title: "Choose your stability pool",
    description:
      "Pick between Collateral and Sail stability pools. Collateral pools exchange anchor tokens for collateral during a rebalance. Sail pools exchange anchor tokens for sail tokens during a rebalance.",
  },
];

export function AnchorHowToGuide() {
  const [activeStep, setActiveStep] = useState(0);
  const totalSteps = steps.length;

  const goPrev = () => setActiveStep((prev) => Math.max(0, prev - 1));
  const goNext = () =>
    setActiveStep((prev) => Math.min(totalSteps - 1, prev + 1));

  return (
    <div className="rounded-xl border border-[#1E4775]/12 bg-[#F8FAFC] p-4 shadow-[0_14px_40px_-34px_rgba(0,0,0,0.25)] ring-1 ring-black/5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#1E4775]/60">
        Step {activeStep + 1} of {totalSteps}
      </div>
      <div className="relative mb-4">
        <div className="relative flex flex-wrap items-center justify-center gap-3">
          {steps.map((step, index) => (
            <div key={step.title} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveStep(index)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors relative z-10 ${
                  index === activeStep
                    ? "border-[#1E4775]/25 bg-white text-[#1E4775] font-semibold shadow-sm"
                    : "border-[#1E4775]/15 bg-white/60 text-[#1E4775]/65 hover:border-[#FF8A7A]/60 hover:text-[#1E4775]"
                }`}
              >
                {index + 1}. {step.title}
              </button>
              {index < steps.length - 1 && (
                <ArrowRightIcon className="h-4 w-4 text-[#1E4775]/45" />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mb-4 flex min-h-[2.75rem] items-center justify-center text-center text-sm leading-relaxed text-[#1E4775]/80">
        {steps[activeStep].description}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={activeStep === 0}
          className="rounded-full border border-[#FF8A7A]/55 bg-white px-4 py-1.5 text-sm font-semibold text-[#1E4775] transition hover:bg-[#FF8A7A]/10 disabled:opacity-40"
        >
          Previous
        </button>
        {activeStep === totalSteps - 1 ? (
          <Link
            href="/anchor"
            className="inline-flex items-center justify-center rounded-full bg-[#FF8A7A] px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#E07A6A]"
          >
            Earn yield
          </Link>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="rounded-full bg-[#FF8A7A] px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#E07A6A]"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
