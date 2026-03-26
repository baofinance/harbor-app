import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sail",
  description: "Mint and redeem Sail (leveraged) tokens on Harbor Protocol.",
};

export default function SailLayout({ children }: { children: ReactNode }) {
  return children;
}
