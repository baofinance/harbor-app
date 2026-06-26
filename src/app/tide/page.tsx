import { TideDashboard, TideValueFlywheel } from "@/components/tide";

export default function TidePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col text-white max-w-[1300px] mx-auto font-sans relative w-full">
      <main className="container mx-auto px-4 sm:px-10 pb-8 pt-2 sm:pt-4">
        <TideDashboard />

        <TideValueFlywheel />
      </main>
    </div>
  );
}
