import Image from "next/image";
import { IndexPageTitleSection } from "@/components/shared/IndexPageTitleSection";
import {
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import { TideDashboard } from "@/components/tide";

export default function TidePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col text-white max-w-[1300px] mx-auto font-sans relative w-full">
      <main className="container mx-auto px-4 sm:px-10 pb-8 pt-2 sm:pt-4">
        <IndexPageTitleSection
          title="$TIDE"
          subtitle={<>Coming Soon</>}
        />

        <TideDashboard />

        <section className={`mt-8 ${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} p-2 sm:p-3`}>
          <Image
            src="/marketing/tide-content-flow.png"
            alt="TIDE protocol revenue and burn flow"
            width={1024}
            height={768}
            className="h-auto w-full rounded-xl"
          />
        </section>
      </main>
    </div>
  );
}
