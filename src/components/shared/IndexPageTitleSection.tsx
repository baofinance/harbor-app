/**
 * Shared hero title band for Genesis (Maiden Voyage), Sail, and Anchor index pages.
 * Same min-height, padding, and subtitle offset so headings align across routes.
 */
export type IndexPageTitleSectionProps = {
  title: string;
  subtitle: string;
};

export function IndexPageTitleSection({ title, subtitle }: IndexPageTitleSectionProps) {
  return (
    <div className="mb-2 flex flex-col">
      <div className="flex items-center justify-center px-4 pt-2 pb-1 sm:pt-3 sm:pb-1">
        <h1 className="font-bold font-mono text-white text-5xl sm:text-6xl md:text-7xl text-center">
          {title}
        </h1>
      </div>
      <div className="flex items-center justify-center px-4 pb-1 -mt-2">
        <p className="text-white/80 text-lg text-center max-w-3xl">{subtitle}</p>
      </div>
    </div>
  );
}
