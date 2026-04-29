import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Marks Leaderboard",
  description: "Harbor Marks leaderboard and campaign rankings.",
};

export default function LedgerMarksLayout({ children }: { children: ReactNode }) {
  return children;
}
