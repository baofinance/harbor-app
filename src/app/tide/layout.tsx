import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "TIDE",
  description: "TIDE treasury and protocol revenue flow. Coming soon.",
  openGraph: {
    title: "TIDE",
    description: "TIDE treasury and protocol revenue flow. Coming soon.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TIDE",
    description: "TIDE treasury and protocol revenue flow. Coming soon.",
  },
};

export default function TideLayout({ children }: { children: ReactNode }) {
  return children;
}
