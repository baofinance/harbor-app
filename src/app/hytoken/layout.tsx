import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Harbor Yield",
  description:
    "hyETH and hyUSD. Pegged value that compounds. Mint and redeem when the vault is live.",
  openGraph: {
    title: "Harbor Yield",
    description:
      "hyETH and hyUSD. Pegged value that compounds. Mint and redeem when the vault is live.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Harbor Yield",
    description:
      "hyETH and hyUSD. Pegged value that compounds. Mint and redeem when the vault is live.",
  },
};

export default function HytokenLayout({ children }: { children: ReactNode }) {
  return children;
}
