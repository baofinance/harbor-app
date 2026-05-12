import Image from "next/image";
import { IndexPageTitleSection } from "@/components/shared/IndexPageTitleSection";

export default function HarborPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col text-white max-w-[1300px] mx-auto font-sans relative w-full">
      <main className="container mx-auto px-4 sm:px-10 pb-8 pt-2 sm:pt-4">
        <IndexPageTitleSection
          title="Harbor"
          subtitle={
            <>Coming soon. Tradeable. Auto-compounding. Always working.</>
          }
        />

        <section className="mt-4 rounded-xl border border-white/15 bg-[#2c2c2c] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-black/40 sm:p-3">
          <Image
            src="/marketing/harbor-hatoken-hytoken-yield.png"
            alt="Harbor haToken versus hyToken: stable value and manual management compared with stable value plus growth, auto-compounding, and effortless optimization"
            width={1024}
            height={1024}
            className="h-auto w-full rounded-lg border border-white/10 shadow-inner"
            priority
          />
        </section>
      </main>
    </div>
  );
}
