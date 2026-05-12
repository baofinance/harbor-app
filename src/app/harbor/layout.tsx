import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Harbor",
  description: "Harbor is coming soon. Tradeable and auto-compounding.",
  openGraph: {
    title: "Harbor",
    description: "Harbor is coming soon. Tradeable and auto-compounding.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Harbor",
    description: "Harbor is coming soon. Tradeable and auto-compounding.",
  },
};

export default function HarborLayout({ children }: { children: ReactNode }) {
  return children;
}
