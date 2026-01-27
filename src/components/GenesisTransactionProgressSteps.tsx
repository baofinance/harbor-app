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
        <div className="flex w-full flex-col items-start gap-2">
          <div className="flex w-full items-center">
            <div className={`h-3 w-3 rounded-full border-2 ${styles.dot}`} />
            <div className={`h-0.5 flex-1 ${styles.line}`} />
            <div
              className={`h-3 w-3 rounded-full border-2 ${inactiveStyles.dot}`}
            />
          </div>
          <div className={`text-[11px] ${styles.label}`}>{step.label}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isCurrent = index === currentStepIndex;
        const styles = getStepStyles(step, isCurrent);
        const showLeft = index > 0;
        const showRight = index < steps.length - 1;

        return (
          <div
            key={step.id}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <div className="flex w-full items-center">
              {showLeft && <div className={`h-0.5 flex-1 ${styles.line}`} />}
              <div
                className={`h-3 w-3 rounded-full border-2 ${styles.dot}`}
              />
              {showRight && (
                <div className={`h-0.5 flex-1 ${styles.line}`} />
              )}
            </div>
            <div className={`text-[11px] ${styles.label}`}>{step.label}</div>
          </div>
        );
      })}
    </div>
  );
};
