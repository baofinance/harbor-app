import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Admin",
  description: "Harbor administrative tools and protocol operations.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Admin",
    description: "Harbor administrative tools and protocol operations.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Admin",
    description: "Harbor administrative tools and protocol operations.",
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
