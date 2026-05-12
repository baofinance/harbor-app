import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Flow",
  description: "Flow view for Harbor markets and protocol activity.",
  openGraph: {
    title: "Flow",
    description: "Flow view for Harbor markets and protocol activity.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flow",
    description: "Flow view for Harbor markets and protocol activity.",
  },
};

export default function FlowLayout({ children }: { children: ReactNode }) {
  return children;
}
