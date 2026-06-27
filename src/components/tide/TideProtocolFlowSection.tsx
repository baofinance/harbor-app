"use client";

import Image from "next/image";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { HarborSectionCard } from "@/components/shared/HarborSectionCard";

export function TideProtocolFlowSection() {
  return (
    <HarborSectionCard
      title="Protocol flow"
      icon={PhotoIcon}
      accentBarClass="bg-[#1E4775]"
      className="mt-8"
      ariaLabel="TIDE protocol revenue and burn flow"
    >
      <Image
        src="/marketing/tide-content-flow.png"
        alt="TIDE protocol revenue and burn flow"
        width={1024}
        height={768}
        className="h-auto w-full rounded-xl"
      />
    </HarborSectionCard>
  );
}
