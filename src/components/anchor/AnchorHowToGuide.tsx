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
      "Pick between Collateral and Sail stability pools. Collateral pools exchange pegged tokens for collateral during a rebalance. Sail pools exchange pegged tokens for leveraged tokens during a rebalance.",
  },
];

export function AnchorHowToGuide() {
  const [activeStep, setActiveStep] = useState(0);
  const totalSteps = steps.length;

  const goPrev = () => setActiveStep((prev) => Math.max(0, prev - 1));
  const goNext = () =>
    setActiveStep((prev) => Math.min(totalSteps - 1, prev + 1));

  return (
    <div className="border border-white/10 bg-black/[0.08] p-4">
      <div className="text-white/60 text-xs uppercase tracking-wider mb-3">
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
                    ? "border-white text-white font-semibold bg-[#1E4775]"
                    : "border-white/20 text-white/70 hover:border-[#FF8A7A] hover:text-white bg-black/[0.08]"
                }`}
              >
                {index + 1}. {step.title}
              </button>
              {index < steps.length - 1 && (
                <ArrowRightIcon className="h-4 w-4 text-white/60" />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="text-sm text-white/80 mb-4 text-center">
        {steps[activeStep].description}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={activeStep === 0}
          className="rounded-full border border-[#FF8A7A] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#FF8A7A]/10 disabled:opacity-40"
        >
          Previous
        </button>
        {activeStep === totalSteps - 1 ? (
          <Link
            href="/anchor"
            className="inline-flex items-center justify-center rounded-full bg-[#FF8A7A] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#E07A6A]"
          >
            Earn yield
          </Link>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="rounded-full bg-[#FF8A7A] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#E07A6A]"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
