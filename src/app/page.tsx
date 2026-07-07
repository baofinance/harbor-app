import { redirect } from "next/navigation";

export default function HomePage() {
  // Default landing page — Earn (Anchor) for now.
  redirect("/anchor");
}
