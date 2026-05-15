import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Dashboard | Harbor",
  description:
    "Wallet overview: Earn, Maiden Voyage, and Leverage positions from Harbor subgraphs, plus Maiden Voyage yield ownership.",
};

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}

