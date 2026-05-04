import Image from "next/image";
import { IndexPageTitleSection } from "@/components/shared/IndexPageTitleSection";

export default function TidePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col text-white max-w-[1300px] mx-auto font-sans relative w-full">
      <main className="container mx-auto px-4 sm:px-10 pb-8 pt-2 sm:pt-4">
        <IndexPageTitleSection
          title="TIDE"
          subtitle={<>Coming Soon</>}
        />

        <section className="mt-4">
          <Image
            src="/marketing/tide-coming-soon.png"
            alt="TIDE protocol revenue and burn flow"
            width={1024}
            height={768}
            className="h-auto w-full rounded-lg border border-white/15 bg-[#f3f3f3]"
            priority
          />
        </section>
      </main>
    </div>
  );
}
