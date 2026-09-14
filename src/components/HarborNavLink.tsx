"use client";

import Link from "next/link";
import { forwardRef, type ComponentProps } from "react";

type HarborNavLinkProps = ComponentProps<typeof Link>;

/**
 * Soft App Router navigation for primary nav.
 * Prefetch is off to avoid warming heavy segments that have wedged transitions.
 * No hard-nav failsafe — that was causing full reloads when soft-nav was merely slow
 * (especially first paint into `/sail`).
 */
export const HarborNavLink = forwardRef<HTMLAnchorElement, HarborNavLinkProps>(
  function HarborNavLink({ prefetch = false, ...rest }, ref) {
    return <Link ref={ref} prefetch={prefetch} {...rest} />;
  },
);
