import React from "react";

type InfoCalloutTone = "info" | "success" | "warning" | "pearl";

const toneStyles: Record<InfoCalloutTone, { wrapper: string; icon: string }> = {
  info: {
    wrapper: "bg-blue-50 border-blue-200 text-blue-700",
    icon: "bg-blue-600 text-white",
  },
  success: {
    wrapper: "bg-green-50 border-green-200 text-green-700",
    icon: "bg-green-600 text-white",
  },
  warning: {
    wrapper: "bg-amber-50 border-amber-200 text-amber-700",
    icon: "bg-amber-600 text-white",
  },
  pearl: {
    wrapper: "bg-[#FFF1E5] border-[#F3C7A6] text-[#8A4B20]",
    icon: "bg-[#D57A3D] text-white",
  },
};

interface InfoCalloutProps {
  tone?: InfoCalloutTone;
  icon?: React.ReactNode;
  title?: string;
  children: React.ReactNode;
}

export const InfoCallout = ({
  tone = "info",
  icon,
  title,
  children,
}: InfoCalloutProps) => {
  const styles = toneStyles[tone];
  // Support both JSX elements and component references (e.g. icon={RefreshCw}) to avoid "Objects are not valid as a React child"
  const iconEl =
    icon == null
      ? null
      : React.isValidElement(icon)
        ? icon
        : typeof icon === "function" || (typeof icon === "object" && icon !== null && "$$typeof" in icon)
          ? React.createElement(icon as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 flex-shrink-0" })
          : icon;

  return (
    <div className={`p-2.5 border text-xs ${styles.wrapper}`}>
      <div className="flex items-start gap-2">
        {iconEl ?? (
          <span
            className={`w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold mt-0.5 ${styles.icon}`}
          >
            !
          </span>
        )}
        <div>
          {title && <span className="font-semibold">{title}</span>} {children}
        </div>
      </div>
    </div>
  );
};
