import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Stake",
  description: "Stake assets in Harbor.",
  openGraph: {
    title: "Stake",
    description: "Stake assets in Harbor.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stake",
    description: "Stake assets in Harbor.",
  },
};

export default function StakeLayout({ children }: { children: ReactNode }) {
  return children;
}
