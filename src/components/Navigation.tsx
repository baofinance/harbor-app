"use client";
import { Suspense } from "react";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ConnectWallet } from "@/components/Wallet";
import { PageLayoutToggle } from "@/components/PageLayoutToggle";
import { useAppBackground } from "@/contexts/AppBackgroundContext";

export default function Example() {
  const pathname = usePathname();
  const { mode: backgroundMode } = useAppBackground();
  const navBgClass =
    backgroundMode === "megaeth" ? "bg-[#10141A]" : "bg-[#1E4775]";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  const linkClass = (href: string) =>
    `shrink-0 whitespace-nowrap rounded-md px-2 sm:px-2.5 py-2 text-sm font-medium ${
      isActive(href)
        ? "text-[#1E4775] bg-white"
        : "text-white hover:bg-white/20 hover:text-white"
    }`;

  return (
    <Disclosure<"nav">
      as="nav"
      className={`app-nav-shell relative w-full max-w-[1300px] shrink-0 ${navBgClass} after:pointer-events-none mx-auto after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white/20 mb-4 sm:mb-6`}
    >
      {/* Match index pages: `max-w-[1300px]` + `px-4 sm:px-10` on main */}
      <div className="w-full px-4 sm:px-10">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center justify-start">
            <a
              href="https://harborfinance.io"
              className="relative mr-2 h-10 w-auto shrink-0 sm:mr-3"
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
            <div className="hidden min-w-0 sm:block">
              <div className="flex flex-nowrap items-center justify-start gap-1 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Link
                  href="/genesis"
                  className={`${linkClass("/genesis")} inline-flex items-center gap-1`}
                  aria-current={isActive("/genesis") ? "page" : undefined}
                >
                  <span>Maiden voyage</span>
                  <span
                    className={`rounded px-1 py-0.5 text-[10px] font-bold leading-none font-mono border ${
                      isActive("/genesis")
                        ? "border-[#1E4775]/30 bg-[#1E4775] text-white"
                        : "border-white/40 bg-white/10 text-white"
                    }`}
                  >
                    2.0
                  </span>
                </Link>
                <Link
                  href="/anchor"
                  className={linkClass("/anchor")}
                  aria-current={isActive("/anchor") ? "page" : undefined}
                >
                  Earn
                </Link>
                <Link
                  href="/sail"
                  className={linkClass("/sail")}
                  aria-current={isActive("/sail") ? "page" : undefined}
                >
                  Leverage
                </Link>
                <Link
                  href="/ledger-marks"
                  className={linkClass("/ledger-marks")}
                  aria-current={isActive("/ledger-marks") ? "page" : undefined}
                >
                  Marks Leaderboard
                </Link>
                <Link
                  href="/transparency"
                  className={linkClass("/transparency")}
                  aria-current={isActive("/transparency") ? "page" : undefined}
                >
                  Transparency
                </Link>
                <Link
                  href="/tide"
                  className={linkClass("/tide")}
                  aria-current={isActive("/tide") ? "page" : undefined}
                >
                  TIDE
                </Link>
              </div>
            </div>
          </div>
          <div className="hidden shrink-0 sm:flex sm:items-center sm:gap-2 lg:gap-3">
            <Suspense fallback={null}>
              <PageLayoutToggle />
            </Suspense>
            <ConnectWallet />
          </div>
          <div className="-mr-2 flex sm:hidden">
            {/* Mobile menu button */}
            <DisclosureButton className="group relative inline-flex items-center justify-center p-2 text-gray-200 hover:bg-[#FF8A7A]/20 hover:text-white focus:outline-2 focus:-outline-offset-1 focus:outline-[#FF8A7A]">
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
            <DisclosureButton className="inline-flex items-center justify-center p-2 text-gray-200 hover:bg-[#FF8A7A]/20 hover:text-white focus:outline-2 focus:-outline-offset-1 focus:outline-[#FF8A7A] rounded-full">
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
                  ? "text-[#1E4775] bg-white"
                  : "text-white bg-white/10 hover:bg-white/20"
              }`}
              aria-current={isActive("/genesis") ? "page" : undefined}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <span>Maiden voyage</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-bold font-mono border ${
                    isActive("/genesis")
                      ? "border-[#1E4775]/30 bg-[#1E4775] text-white"
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
                  ? "text-[#1E4775] bg-white"
                  : "text-white bg-white/10 hover:bg-white/20"
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
                  ? "text-[#1E4775] bg-white"
                  : "text-white bg-white/10 hover:bg-white/20"
              }`}
              aria-current={isActive("/sail") ? "page" : undefined}
            >
              Leverage
            </DisclosureButton>
            <DisclosureButton
              as={Link}
              href="/ledger-marks"
              className={`block w-full max-w-sm mx-auto px-6 py-4 text-base font-medium rounded-full transition-colors flex-shrink-0 text-center ${
                isActive("/ledger-marks")
                  ? "text-[#1E4775] bg-white"
                  : "text-white bg-white/10 hover:bg-white/20"
              }`}
              aria-current={isActive("/ledger-marks") ? "page" : undefined}
            >
              Marks Leaderboard
            </DisclosureButton>
            <DisclosureButton
              as={Link}
              href="/transparency"
              className={`block w-full max-w-sm mx-auto px-6 py-4 text-base font-medium rounded-full transition-colors flex-shrink-0 text-center ${
                isActive("/transparency")
                  ? "text-[#1E4775] bg-white"
                  : "text-white bg-white/10 hover:bg-white/20"
              }`}
              aria-current={isActive("/transparency") ? "page" : undefined}
            >
              Transparency
            </DisclosureButton>
            <DisclosureButton
              as={Link}
              href="/tide"
              className={`block w-full max-w-sm mx-auto px-6 py-4 text-base font-medium rounded-full transition-colors flex-shrink-0 text-center ${
                isActive("/tide")
                  ? "text-[#1E4775] bg-white"
                  : "text-white bg-white/10 hover:bg-white/20"
              }`}
              aria-current={isActive("/tide") ? "page" : undefined}
            >
              TIDE
            </DisclosureButton>
          </div>
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}
