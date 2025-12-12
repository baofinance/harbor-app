"use client";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { Bars3Icon, BellIcon, XMarkIcon } from "@heroicons/react/24/outline";
import CurrencySelect from "./CurrencySelect";
import { useCurrency } from "@/contexts/CurrencyContext";
import WalletButton from "./WalletButton";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Geo } from "next/font/google";
import { ConnectWallet } from "@/components/Wallet";

export default function Example() {
  const { code, setCode, options } = useCurrency();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  const linkClass = (href: string) =>
    ` px-3 py-2 text-sm font-medium ${
      isActive(href)
        ? "text-[#1E4775] bg-white"
        : "text-white hover:bg-white/20 hover:text-white"
    }`;

  const optionsForSelect = options.map((o) => ({
    code: o.code,
    label: o.label,
    symbol: o.symbol,
  }));

  return (
    <Disclosure<"nav">
      as="nav"
      className="relative bg-[#1E4775] after:pointer-events-none max-w-7xl mx-auto after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white/20 mb-6"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/genesis" className="h-10 w-auto relative mr-4">
              <Image
                src="/logo.svg"
                alt="Logo"
                width={100}
                height={40}
                className="object-contain h-full w-auto"
                priority
              />
            </Link>
            <div className="hidden sm:block">
              <div className="flex space-x-2">
                <Link
                  href="/genesis"
                  className={linkClass("/genesis")}
                  aria-current={isActive("/genesis") ? "page" : undefined}
                >
                  Maiden Voyage
                </Link>
                <Link
                  href="/anchor"
                  className={linkClass("/anchor")}
                  aria-current={isActive("/anchor") ? "page" : undefined}
                >
                  Anchor
                </Link>
                <Link
                  href="/sail"
                  className={linkClass("/sail")}
                  aria-current={isActive("/sail") ? "page" : undefined}
                >
                  Sail
                </Link>
                <Link
                  href="/flow"
                  className={linkClass("/flow")}
                  aria-current={isActive("/flow") ? "page" : undefined}
                >
                  Map Room
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
              </div>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:block">
            <WalletButton />
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

      <DisclosurePanel className="sm:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1">
          <DisclosureButton
            as={Link}
            href="/genesis"
            className={linkClass("/genesis")}
            aria-current={isActive("/genesis") ? "page" : undefined}
          >
            Maiden Voyage
          </DisclosureButton>
          <DisclosureButton
            as={Link}
            href="/anchor"
            className={linkClass("/anchor")}
            aria-current={isActive("/anchor") ? "page" : undefined}
          >
            Anchor
          </DisclosureButton>
          <DisclosureButton
            as={Link}
            href="/sail"
            className={linkClass("/sail")}
            aria-current={isActive("/sail") ? "page" : undefined}
          >
            Sail
          </DisclosureButton>
          <DisclosureButton
            as={Link}
            href="/flow"
            className={linkClass("/flow")}
            aria-current={isActive("/flow") ? "page" : undefined}
          >
            Map Room
          </DisclosureButton>
          <DisclosureButton
            as={Link}
            href="/ledger-marks"
            className={linkClass("/ledger-marks")}
            aria-current={isActive("/ledger-marks") ? "page" : undefined}
          >
            Marks Leaderboard
          </DisclosureButton>
          <DisclosureButton
            as={Link}
            href="/transparency"
            className={linkClass("/transparency")}
            aria-current={isActive("/transparency") ? "page" : undefined}
          >
            Transparency
          </DisclosureButton>
        </div>
        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center justify-end">
            <WalletButton />
          </div>
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}
