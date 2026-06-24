import type { ComponentType } from "react";

export type HarborConfigBadgeVariant = {
  label: string;
  /** Single surface token (preferred over bg+text). */
  surfaceClass?: string;
  bg?: string;
  text?: string;
  icon?: ComponentType<{ className?: string }>;
};

export type HarborConfigBadgeProps = {
  config: HarborConfigBadgeVariant;
  size?: "sm" | "md";
};

export function HarborConfigBadge({
  config,
  size = "md",
}: HarborConfigBadgeProps) {
  const { label, surfaceClass, bg = "", text = "", icon: Icon } = config;
  const surface = surfaceClass ?? `${bg} ${text}`.trim();

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px] gap-1 rounded-md"
      : "px-2 py-0.5 text-xs gap-1 rounded-full";

  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span
      className={`inline-flex items-center font-medium ${sizeClasses} ${surface}`}
    >
      {Icon ? <Icon className={iconSize} /> : null}
      {label}
    </span>
  );
}
