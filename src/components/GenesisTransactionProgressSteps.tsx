import React from "react";
import { TransactionStep } from "./TransactionProgressModal";

interface GenesisTransactionProgressStepsProps {
  steps: TransactionStep[];
  currentStepIndex: number;
}

const getStepStyles = (step: TransactionStep, isCurrent: boolean) => {
  if (step.status === "completed") {
    return {
      dot: "bg-green-500 border-green-500",
      label: "text-[#1E4775]",
      line: "bg-green-500",
    };
  }
  if (step.status === "error") {
    return {
      dot: "bg-red-500 border-red-500",
      label: "text-red-600",
      line: "bg-red-300",
    };
  }
  if (isCurrent || step.status === "in_progress") {
    return {
      dot: "bg-[#1E4775] border-[#1E4775]",
      label: "text-[#1E4775]",
      line: "bg-[#1E4775]/40",
    };
  }
  return {
    dot: "bg-white border-[#1E4775]/30",
    label: "text-[#1E4775]/60",
    line: "bg-[#1E4775]/20",
  };
};

export const GenesisTransactionProgressSteps = ({
  steps,
  currentStepIndex,
}: GenesisTransactionProgressStepsProps) => {
  if (steps.length === 0) return null;

  if (steps.length === 1) {
    const step = steps[0];
    const styles = getStepStyles(step, currentStepIndex === 0);
    const inactiveStyles = getStepStyles(
      { ...step, status: "pending" },
      false
    );
    return (
      <div className="flex items-center">
        <div className="flex w-full flex-col items-center gap-2">
          <div className="flex w-full items-center">
            <div className={`h-3 w-3 shrink-0 rounded-full border-2 ${styles.dot}`} />
            <div className={`h-0.5 min-w-2 flex-1 ${styles.line}`} />
            <div className={`h-0.5 min-w-2 flex-1 ${inactiveStyles.line}`} />
            <div
              className={`h-3 w-3 shrink-0 rounded-full border-2 ${inactiveStyles.dot}`}
            />
          </div>
          <div
            className={`text-[11px] min-w-0 break-words text-center ${styles.label}`}
          >
            {step.label}
          </div>
        </div>
      </div>
    );
  }

  // Match one-step layout: circle | line | line | circle (two line segments between circles)
  const n = steps.length;
  return (
    <div className="w-full">
      <div className="flex w-full items-center">
        {steps.map((step, index) => {
          const isCurrent = index === currentStepIndex;
          const styles = getStepStyles(step, isCurrent);
          const showRight = index < n - 1;
          const nextStyles = showRight
            ? getStepStyles(steps[index + 1], index + 1 === currentStepIndex)
            : null;
          return (
            <React.Fragment key={`${step.id}-stepper`}>
              <div
                className={`h-3 w-3 shrink-0 rounded-full border-2 ${styles.dot}`}
              />
              {showRight && nextStyles ? (
                <>
                  <div className={`h-0.5 min-w-2 flex-1 ${styles.line}`} />
                  <div className={`h-0.5 min-w-2 flex-1 ${nextStyles.line}`} />
                </>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
      <div className="mt-2 flex w-full">
        {steps.map((step, index) => {
          const isCurrent = index === currentStepIndex;
          const styles = getStepStyles(step, isCurrent);
          return (
            <div
              key={step.id}
              className="flex min-w-0 flex-1 flex-col items-center justify-center"
            >
              <span
                className={`text-center text-[11px] leading-tight break-words ${styles.label}`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
