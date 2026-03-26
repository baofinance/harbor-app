import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Maiden Voyage",
  description: "Genesis / Maiden Voyage markets and deposits.",
};

export default function GenesisLayout({ children }: { children: ReactNode }) {
  return children;
}
