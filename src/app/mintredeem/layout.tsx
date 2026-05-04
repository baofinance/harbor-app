import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Mint & Redeem",
  description: "Mint and redeem Harbor synthetic assets.",
  openGraph: {
    title: "Mint & Redeem",
    description: "Mint and redeem Harbor synthetic assets.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mint & Redeem",
    description: "Mint and redeem Harbor synthetic assets.",
  },
};

export default function MintRedeemLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
