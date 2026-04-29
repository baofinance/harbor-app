import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Maiden voyage 2.0",
  description:
    "Become a shareholder of new Harbor markets—genesis deposits, ownership, and maiden voyage marks.",
  openGraph: {
    title: "Maiden voyage 2.0",
    description:
      "Become a shareholder of new Harbor markets—genesis deposits, ownership, and maiden voyage marks.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Maiden voyage 2.0",
    description:
      "Become a shareholder of new Harbor markets—genesis deposits, ownership, and maiden voyage marks.",
  },
};

export default function GenesisLayout({ children }: { children: ReactNode }) {
  return children;
}
