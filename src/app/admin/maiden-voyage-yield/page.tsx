import Link from "next/link";
import { MaidenVoyageYieldAdmin } from "./MaidenVoyageYieldAdmin";

export default function MaidenVoyageYieldAdminPage() {
  return (
    <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
      <main className="container mx-auto px-4 sm:px-10 pt-[6rem] pb-6 relative z-10">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link
            href="/admin"
            className="text-sm text-white/60 hover:text-white underline-offset-4 hover:underline"
          >
            ← Admin
          </Link>
          <h1 className="text-4xl font-medium font-geo text-white">
            Maiden voyage yield
          </h1>
        </div>
        <MaidenVoyageYieldAdmin />
      </main>
    </div>
  );
}
