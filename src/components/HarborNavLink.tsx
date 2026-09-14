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

const SAIL_VISITED_KEY = "harbor:sail-soft-visited";

function pathMatchesHref(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isSailPath(path: string): boolean {
  return path === "/sail" || path.startsWith("/sail/");
}

/**
 * Soft-nav works for most routes. Revisiting `/sail` via App Router soft-nav
 * can deadlock Next's transition queue (Link preventDefaults, no pushState).
 * Re-entry to Leverage uses a full navigation; a short failsafe remains as backup.
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
      if (isSailPath(pathname) && typeof window !== "undefined") {
        try {
          sessionStorage.setItem(SAIL_VISITED_KEY, "1");
        } catch {
          // Ignore private-mode / unavailable sessionStorage.
        }
      }
    }, [pathname]);

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

      // Avoid the cached soft-nav path that wedges the App Router after a prior
      // Sail visit in this tab. Full load resets the transition queue.
      let sailAlreadyVisited = false;
      try {
        sailAlreadyVisited = sessionStorage.getItem(SAIL_VISITED_KEY) === "1";
      } catch {
        sailAlreadyVisited = false;
      }
      if (
        isSailPath(hrefString) &&
        !isSailPath(pathname) &&
        sailAlreadyVisited
      ) {
        event.preventDefault();
        window.location.assign(hrefString);
        return;
      }

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
