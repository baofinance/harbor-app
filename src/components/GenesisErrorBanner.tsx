import React from "react";

type GenesisErrorBannerTone = "danger" | "warning";

const toneStyles: Record<
  GenesisErrorBannerTone,
  {
    wrapper: string;
    icon: string;
    title: string;
    markets: string;
    divider: string;
  }
> = {
  danger: {
    wrapper: "bg-[#FF8A7A]/10 border border-[#FF8A7A]/30",
    icon: "text-[#FF8A7A]",
    title: "text-[#FF8A7A]",
    markets: "text-[#FF8A7A]/90",
    divider: "border-[#FF8A7A]/20",
  },
  warning: {
    wrapper: "bg-yellow-500/10 border border-yellow-500/30",
    icon: "text-yellow-500",
    title: "text-yellow-500",
    markets: "text-yellow-500/90",
    divider: "border-yellow-500/20",
  },
};

interface GenesisErrorBannerProps {
  tone: GenesisErrorBannerTone;
  title: string;
  message: string;
  markets?: string[];
}

export const GenesisErrorBanner = ({
  tone,
  title,
  message,
  markets = [],
}: GenesisErrorBannerProps) => {
  const styles = toneStyles[tone];

  return (
    <div className={`${styles.wrapper} rounded-none p-3 mb-4`}>
      <div className="flex items-start gap-3">
        <div className={`${styles.icon} text-xl mt-0.5`}>⚠️</div>
        <div className="flex-1">
          <p className={`${styles.title} font-semibold text-sm mb-1`}>{title}</p>
          <p className="text-white/70 text-xs mb-2">{message}</p>
          {markets.length > 0 && (
            <div className={`mt-2 pt-2 border-t ${styles.divider}`}>
              <p className={`${styles.markets} text-xs font-medium mb-1`}>
                Markets affected: {markets.join(", ")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
