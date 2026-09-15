"use client";

import Link from "next/link";
import { forwardRef, type ComponentProps } from "react";

type HarborNavLinkProps = ComponentProps<typeof Link>;

/**
 * Soft App Router navigation for primary nav.
 * Prefetch off to avoid warming heavy segments. No hard-nav failsafe —
 * the Sail chart state-sync loop was the soft-nav wedge; keep navigation soft.
 */
export const HarborNavLink = forwardRef<HTMLAnchorElement, HarborNavLinkProps>(
  function HarborNavLink({ prefetch = false, ...rest }, ref) {
    return <Link ref={ref} prefetch={prefetch} {...rest} />;
  },
);
