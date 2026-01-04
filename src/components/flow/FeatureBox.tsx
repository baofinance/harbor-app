import type { ComponentType, ReactNode } from "react";

interface FeatureBoxProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string | ReactNode;
}

export function FeatureBox({ icon: Icon, title, description }: FeatureBoxProps) {
  return (
    <div className="bg-[#17395F] p-4 sm:p-3 md:p-4 flex flex-col">
      <div className="flex items-center justify-center mb-2">
        <Icon className="w-5 h-5 sm:w-4 sm:h-4 md:w-6 md:h-6 text-white mr-1.5 sm:mr-1 md:mr-2 flex-shrink-0" />
        <h2 className="font-bold text-white text-lg sm:text-sm md:text-base lg:text-lg text-center">
          {title}
        </h2>
      </div>
      <div className="flex-1 flex items-center">
        <p className="text-sm sm:text-xs md:text-sm text-white/80 text-center w-full">
          {description}
        </p>
      </div>
    </div>
  );
}
