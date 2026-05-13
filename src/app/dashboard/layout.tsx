import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Dashboard | Harbor",
  description:
    "Wallet overview, founder yield, and Earn / Maiden Voyage / Leverage positions from Harbor subgraphs.",
};

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}

