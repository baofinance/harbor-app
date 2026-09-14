"use client";

import Link from "next/link";
import {
  forwardRef,
  useEffect,
  useRef,
  type ComponentProps,
  type MouseEvent,
} from "react";
import { usePathname } from "next/navigation";

type HarborNavLinkProps = ComponentProps<typeof Link>;

/** Soft-nav into /sail can take >1s; keep this above that so we don't hard-reload early. */
const SOFT_NAV_FAILSAFE_MS = 2500;

function pathMatchesHref(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Soft App Router navigation for primary nav (`prefetch` off).
 * If the App Router wedges (Link preventDefaults, no pushState — common into
 * `/sail`), hard-navigate after a short wait so the app stays usable.
 */
export const HarborNavLink = forwardRef<HTMLAnchorElement, HarborNavLinkProps>(
  function HarborNavLink(
    { href, onClick, prefetch = false, ...rest },
    ref,
  ) {
    const pathname = usePathname() ?? "";
    const failSafeTimer = useRef<number | null>(null);
    const hrefString = typeof href === "string" ? href : href.pathname || "";

    useEffect(() => {
      if (failSafeTimer.current != null) {
        window.clearTimeout(failSafeTimer.current);
        failSafeTimer.current = null;
      }
    }, [pathname]);

    useEffect(
      () => () => {
        if (failSafeTimer.current != null) {
          window.clearTimeout(failSafeTimer.current);
        }
      },
      [],
    );

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      if (event.button !== 0) return;
      if (!hrefString.startsWith("/")) return;

      if (failSafeTimer.current != null) {
        window.clearTimeout(failSafeTimer.current);
      }
      failSafeTimer.current = window.setTimeout(() => {
        failSafeTimer.current = null;
        if (!pathMatchesHref(window.location.pathname, hrefString)) {
          window.location.assign(hrefString);
        }
      }, SOFT_NAV_FAILSAFE_MS);
    };

    return (
      <Link
        ref={ref}
        href={href}
        prefetch={prefetch}
        onClick={handleClick}
        {...rest}
      />
    );
  },
);
