/**
 * Icon components for the Flow/Map Room page
 */

export function ExternalLinkIcon({
  className = "inline-block w-4 h-4 align-[-2px] ml-1",
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M14 3h7v7h-2V6.414l-9.293 9.293-1.414-1.414L17.586 5H14V3z" />
      <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7z" />
    </svg>
  );
}

export function ChevronIcon({
  className = "w-3 h-3 text-[#1E4775]",
  expanded = false,
}: {
  className?: string;
  expanded?: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} transition-transform ${
        expanded ? "rotate-90" : ""
      }`}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

