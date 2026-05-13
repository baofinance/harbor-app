import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Dashboard | Harbor",
  description:
    "Wallet overview and founder yield metrics across Harbor maiden voyage markets.",
};

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}

