import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Earn",
  description: "Earn yield by supplying assets to Harbor markets.",
  openGraph: {
    title: "Earn",
    description: "Earn yield by supplying assets to Harbor markets.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Earn",
    description: "Earn yield by supplying assets to Harbor markets.",
  },
};

export default function EarnLayout({ children }: { children: ReactNode }) {
  return children;
}
