import type { ComponentType, ReactNode } from "react";

interface FeatureBoxProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string | ReactNode;
}

export function FeatureBox({ icon: Icon, title, description }: FeatureBoxProps) {
  return (
    <div className="bg-black/[0.10] backdrop-blur-sm rounded-none overflow-hidden px-3 py-2 flex flex-col">
      <div className="flex items-center justify-center gap-2">
        <Icon className="w-5 h-5 text-white flex-shrink-0" />
        <h2 className="font-bold text-white text-base text-center">{title}</h2>
      </div>
      <div className="flex-1 flex items-center">
        <p className="text-xs text-white/75 text-center w-full mt-1">
          {description}
        </p>
      </div>
    </div>
  );
}
