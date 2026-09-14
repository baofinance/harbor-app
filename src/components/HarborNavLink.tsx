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

function pathMatchesHref(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * App Router soft-nav can no-op after Earn↔Leverage revisits (Link preventDefaults
 * but never pushStates). Fail over to a full navigation if the URL does not move.
 * Kept as a safety net; layout Suspense + client segment cache were the main suspects.
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
      }, 1000);
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
