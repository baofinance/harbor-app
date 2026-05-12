import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Staking",
  description: "Staking interface for Harbor protocol.",
  openGraph: {
    title: "Staking",
    description: "Staking interface for Harbor protocol.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Staking",
    description: "Staking interface for Harbor protocol.",
  },
};

export default function StakingLayout({ children }: { children: ReactNode }) {
  return children;
}
