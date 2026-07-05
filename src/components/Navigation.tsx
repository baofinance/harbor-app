"use client";
import { Suspense, useState } from "react";
import {
  HARBOR_NAV_DROPDOWN_ITEM_ACTIVE_CLASS,
  HARBOR_NAV_DROPDOWN_ITEM_IDLE_CLASS,
  HARBOR_NAV_ICON_BUTTON_CLASS,
  HARBOR_NAV_LINK_ACTIVE_CLASS,
  HARBOR_NAV_LINK_IDLE_CLASS,
  HARBOR_NAV_MOBILE_LINK_IDLE_CLASS,
  HARBOR_NAV_MOBILE_MENU_BUTTON_CLASS,
  HARBOR_NAV_POPOVER_SHELL_CLASS,
} from "@/components/shared/harborNavStyles";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Popover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ConnectWallet } from "@/components/Wallet";
import { PageLayoutToggle } from "@/components/PageLayoutToggle";
import { useAppBackground } from "@/contexts/AppBackgroundContext";
import { ImpersonateDialog } from "@/components/ImpersonateDialog";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { IMPERSONATION_ENABLED } from "@/config/impersonation";

/** Desktop popover + mobile “More”: lower-traffic destinations only. */
const MORE_NAV: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/ledger-marks", label: "Leaderboard" },
  { href: "/hytoken", label: "Harbor Yield" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Example() {
  const pathname = usePathname();
  const { mode: backgroundMode } = useAppBackground();
  const { isImpersonating } = useImpersonation();
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const navBgClass =
    backgroundMode === "megaeth" ? "bg-[#10141A]" : "bg-[#1E4775]";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  const linkClass = (href: string) =>
    `shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium transition-colors sm:px-2.5 ${
      isActive(href) ? HARBOR_NAV_LINK_ACTIVE_CLASS : HARBOR_NAV_LINK_IDLE_CLASS
    }`;

  return (
    <>
    {IMPERSONATION_ENABLED ? (
      <>
        <ImpersonationBanner />
        <ImpersonateDialog
          isOpen={impersonateOpen}
          onClose={() => setImpersonateOpen(false)}
        />
      </>
    ) : null}
    <Disclosure<"nav">
      as="nav"
      className={`app-nav-shell relative w-full max-w-[1300px] shrink-0 ${navBgClass} after:pointer-events-none mx-auto after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white/20 mb-4 sm:mb-6`}
    >
      {/* Match index pages: `max-w-[1300px]` + `px-4 sm:px-10` on main */}
      <div className="w-full px-4 sm:px-10">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
            <a
              href="https://harborfinance.io"
              className="relative mr-0 h-10 w-auto shrink-0 sm:mr-0"
            >
              <Image
                src="/logo.svg"
                alt="Logo"
                width={100}
                height={40}
                className="object-contain h-full w-auto"
                priority
              />
            </a>
            <div className="hidden min-w-0 flex-1 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-1.5 sm:gap-y-1 md:gap-x-2 lg:gap-x-3">
              <Link
                href="/genesis"
                className={`${linkClass("/genesis")} inline-flex min-w-0 shrink-0 items-center justify-center gap-1`}
                aria-current={isActive("/genesis") ? "page" : undefined}
              >
                <span>Maiden Voyage</span>
                <span
                  className={`shrink-0 rounded border px-1 py-0.5 text-[10px] font-bold leading-none font-mono ${
                    isActive("/genesis")
                      ? "border-[#1E4775]/25 bg-[#1E4775]/10 text-[#1E4775]"
                      : "border-white/40 bg-white/10 text-white"
                  }`}
                >
                  2.0
                </span>
              </Link>
              <Link
                href="/anchor"
                className={`${linkClass("/anchor")} flex shrink-0 items-center justify-center`}
                aria-current={isActive("/anchor") ? "page" : undefined}
              >
                Earn
              </Link>
              <Link
                href="/sail"
                className={`${linkClass("/sail")} flex shrink-0 items-center justify-center`}
                aria-current={isActive("/sail") ? "page" : undefined}
              >
                Leverage
              </Link>
              <Link
                href="/tide"
                className={`${linkClass("/tide")} flex shrink-0 items-center justify-center`}
                aria-current={isActive("/tide") ? "page" : undefined}
              >
                Tide
              </Link>
              <Link
                href="/transparency"
                className={`${linkClass("/transparency")} flex shrink-0 items-center justify-center`}
                aria-current={isActive("/transparency") ? "page" : undefined}
              >
                Transparency
              </Link>
            </div>
          </div>
          <div className="hidden shrink-0 sm:flex sm:items-center sm:gap-2 lg:gap-3">
            <Suspense fallback={null}>
              <PageLayoutToggle />
            </Suspense>
            <ConnectWallet />
            <Popover className="relative">
              <PopoverButton
                className={HARBOR_NAV_ICON_BUTTON_CLASS}
                aria-label="More navigation"
              >
                <Bars3Icon aria-hidden="true" className="size-6" />
              </PopoverButton>
              <PopoverPanel
                transition
                anchor={{ to: "bottom end", gap: 8 }}
                className={`z-[100] w-56 origin-top-right overflow-hidden rounded-lg py-1 outline-none transition data-closed:scale-95 data-closed:opacity-0 ${HARBOR_NAV_POPOVER_SHELL_CLASS}`}
              >
                {MORE_NAV.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                      isActive(href)
                        ? HARBOR_NAV_DROPDOWN_ITEM_ACTIVE_CLASS
                        : HARBOR_NAV_DROPDOWN_ITEM_IDLE_CLASS
                    }`}
                    aria-current={isActive(href) ? "page" : undefined}
                  >
                    {label}
                  </Link>
                ))}
                {IMPERSONATION_ENABLED ? (
                  <>
                    <div className="my-1 border-t border-[#1E4775]/10" />
                    <button
                      type="button"
                      onClick={() => setImpersonateOpen(true)}
                      className={`block w-full px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                        isImpersonating
                          ? HARBOR_NAV_DROPDOWN_ITEM_ACTIVE_CLASS
                          : HARBOR_NAV_DROPDOWN_ITEM_IDLE_CLASS
                      }`}
                    >
                      Impersonate
                      {isImpersonating ? (
                        <span className="ml-1 text-xs font-normal text-[#1E4775]/60">
                          (active)
                        </span>
                      ) : null}
                    </button>
                  </>
                ) : null}
              </PopoverPanel>
            </Popover>
          </div>
          <div className="-mr-2 flex sm:hidden">
            {/* Mobile menu button */}
            <DisclosureButton className={`group relative inline-flex items-center justify-center ${HARBOR_NAV_MOBILE_MENU_BUTTON_CLASS}`}>
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open main menu</span>
              <Bars3Icon
                aria-hidden="true"
                className="block size-6 group-data-open:hidden"
              />
              <XMarkIcon
                aria-hidden="true"
                className="hidden size-6 group-data-open:block"
              />
            </DisclosureButton>
          </div>
        </div>
      </div>

      <DisclosurePanel className={`sm:hidden fixed inset-0 z-50 ${navBgClass} overflow-y-auto`} style={{ height: '100dvh', maxHeight: '100dvh' }}>
        <div className="flex flex-col min-h-full px-6 py-4 pb-24 space-y-2">
          <div className="flex justify-end mb-2 flex-shrink-0">
            <DisclosureButton className={`inline-flex items-center justify-center rounded-full ${HARBOR_NAV_MOBILE_MENU_BUTTON_CLASS}`}>
              <span className="sr-only">Close main menu</span>
              <XMarkIcon
                aria-hidden="true"
                className="size-6"
              />
            </DisclosureButton>
          </div>
          <div className="flex flex-col items-center justify-center mb-4 flex-shrink-0 gap-3 w-full max-w-sm mx-auto">
            <Suspense fallback={null}>
              <PageLayoutToggle />
            </Suspense>
            <ConnectWallet />
          </div>
          <div className="flex flex-col w-full items-stretch justify-center space-y-2.5 py-2">
            <DisclosureButton
              as={Link}
              href="/genesis"
              className={`block w-full max-w-sm mx-auto px-6 py-4 text-base font-medium rounded-full transition-colors flex-shrink-0 text-center ${
                isActive("/genesis")
                  ? HARBOR_NAV_LINK_ACTIVE_CLASS
                  : HARBOR_NAV_MOBILE_LINK_IDLE_CLASS
              }`}
              aria-current={isActive("/genesis") ? "page" : undefined}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <span>Maiden Voyage</span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-xs font-bold font-mono ${
                    isActive("/genesis")
                      ? "border-[#1E4775]/25 bg-[#1E4775]/10 text-[#1E4775]"
                      : "border-white/40 bg-white/10 text-white"
                  }`}
                >
                  2.0
                </span>
              </span>
            </DisclosureButton>
            <DisclosureButton
              as={Link}
              href="/anchor"
              className={`block w-full max-w-sm mx-auto px-6 py-4 text-base font-medium rounded-full transition-colors flex-shrink-0 text-center ${
                isActive("/anchor")
                  ? HARBOR_NAV_LINK_ACTIVE_CLASS
                  : HARBOR_NAV_MOBILE_LINK_IDLE_CLASS
              }`}
              aria-current={isActive("/anchor") ? "page" : undefined}
            >
              Earn
            </DisclosureButton>
            <DisclosureButton
              as={Link}
              href="/sail"
              className={`block w-full max-w-sm mx-auto px-6 py-4 text-base font-medium rounded-full transition-colors flex-shrink-0 text-center ${
                isActive("/sail")
                  ? HARBOR_NAV_LINK_ACTIVE_CLASS
                  : HARBOR_NAV_MOBILE_LINK_IDLE_CLASS
              }`}
              aria-current={isActive("/sail") ? "page" : undefined}
            >
              Leverage
            </DisclosureButton>
            <DisclosureButton
              as={Link}
              href="/tide"
              className={`block w-full max-w-sm mx-auto px-6 py-4 text-base font-medium rounded-full transition-colors flex-shrink-0 text-center ${
                isActive("/tide")
                  ? HARBOR_NAV_LINK_ACTIVE_CLASS
                  : HARBOR_NAV_MOBILE_LINK_IDLE_CLASS
              }`}
              aria-current={isActive("/tide") ? "page" : undefined}
            >
              Tide
            </DisclosureButton>
            <DisclosureButton
              as={Link}
              href="/transparency"
              className={`block w-full max-w-sm mx-auto px-6 py-4 text-base font-medium rounded-full transition-colors flex-shrink-0 text-center ${
                isActive("/transparency")
                  ? HARBOR_NAV_LINK_ACTIVE_CLASS
                  : HARBOR_NAV_MOBILE_LINK_IDLE_CLASS
              }`}
              aria-current={isActive("/transparency") ? "page" : undefined}
            >
              Transparency
            </DisclosureButton>
            <div className="mt-6 w-full max-w-sm mx-auto border-t border-white/20 pt-6">
              <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-white/50">
                More
              </p>
              <div className="flex flex-col space-y-2.5">
                {MORE_NAV.map(({ href, label }) => (
                  <DisclosureButton
                    key={href}
                    as={Link}
                    href={href}
                    className={`block w-full px-6 py-3.5 text-base font-medium rounded-full transition-colors flex-shrink-0 text-center ${
                      isActive(href)
                        ? HARBOR_NAV_LINK_ACTIVE_CLASS
                        : HARBOR_NAV_MOBILE_LINK_IDLE_CLASS
                    }`}
                    aria-current={isActive(href) ? "page" : undefined}
                  >
                    {label}
                  </DisclosureButton>
                ))}
                {IMPERSONATION_ENABLED ? (
                  <DisclosureButton
                    as="button"
                    type="button"
                    onClick={() => setImpersonateOpen(true)}
                    className={`block w-full px-6 py-3.5 text-base font-medium rounded-full transition-colors flex-shrink-0 text-center ${
                      isImpersonating
                        ? HARBOR_NAV_LINK_ACTIVE_CLASS
                        : HARBOR_NAV_MOBILE_LINK_IDLE_CLASS
                    }`}
                  >
                    Impersonate
                    {isImpersonating ? " (active)" : ""}
                  </DisclosureButton>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </DisclosurePanel>
    </Disclosure>
    </>
  );
}
