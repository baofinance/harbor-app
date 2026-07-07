import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "TIDE",
  description:
    "Preview your TIDE snapshot allocation, merkle claims, and BAO swap eligibility.",
  openGraph: {
    title: "TIDE",
    description:
      "Preview your TIDE snapshot allocation, merkle claims, and BAO swap eligibility.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TIDE",
    description:
      "Preview your TIDE snapshot allocation, merkle claims, and BAO swap eligibility.",
  },
};

export default function TideLayout({ children }: { children: ReactNode }) {
  return children;
}
