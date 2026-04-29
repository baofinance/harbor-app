/**
 * Outline infinity (∞) at 24×24 with stroke 1.5 — matches Heroicons outline weight.
 * Heroicons does not ship an infinity glyph; use this where you want the same look.
 */
export function InfinityOutlineIcon({
  className,
  strokeWidth = 1.5,
  "aria-hidden": ariaHidden = true,
}: {
  className?: string;
  /** Outline weight; Heroicons outline uses 1.5. */
  strokeWidth?: number;
  "aria-hidden"?: boolean | "true" | "false";
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={ariaHidden}
    >
      <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z" />
    </svg>
  );
}
