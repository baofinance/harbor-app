import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Anchor",
  description: "Anchor markets, stability pools, and pegged tokens.",
};

export default function AnchorLayout({ children }: { children: ReactNode }) {
  return children;
}
