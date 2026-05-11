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

        <section className="mt-4 rounded-lg border border-white/15 bg-[#b7e7d8] p-2 sm:p-3">
          <Image
            src="/marketing/harbor-coming-soon.png"
            alt="Harbor transformation from haTOKEN to hyTOKEN"
            width={1024}
            height={1024}
            className="h-auto w-full rounded-md"
            priority
          />
        </section>
      </main>
    </div>
  );
}
