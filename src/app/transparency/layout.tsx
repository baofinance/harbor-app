import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Transparency",
  description: "Protocol and market transparency metrics.",
};

export default function TransparencyLayout({ children }: { children: ReactNode }) {
  return children;
}
