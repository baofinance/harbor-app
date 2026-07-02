import type { ReactNode } from "react";

import { HARBOR_THEME_TEXT_PRIMARY_CLASS } from "@/components/shared/harborTheme";

/** Outer page wrapper — matches nav/footer max width (1300px). */
export const HARBOR_PAGE_SHELL_CLASS =
  `flex min-h-0 flex-1 flex-col ${HARBOR_THEME_TEXT_PRIMARY_CLASS} max-w-[1300px] mx-auto font-sans relative w-full`;

/** Standard index-page main padding and horizontal inset. */
export const HARBOR_PAGE_MAIN_CLASS =
  "container mx-auto px-4 pb-6 pt-2 sm:px-10 sm:pt-4";

export type HarborPageShellProps = {
  children: ReactNode;
  mainClassName?: string;
};

export function HarborPageShell({ children, mainClassName }: HarborPageShellProps) {
  return (
    <div className={HARBOR_PAGE_SHELL_CLASS}>
      <main className={mainClassName ? `${HARBOR_PAGE_MAIN_CLASS} ${mainClassName}` : HARBOR_PAGE_MAIN_CLASS}>
        {children}
      </main>
    </div>
  );
}
