/**
 * Shared hero title band for Genesis (Maiden Voyage), Sail, and Anchor index pages.
 * Same min-height, padding, and subtitle offset so headings align across routes.
 * Subtitle uses a modest top margin so descenders on the large h1 do not crowd the subtitle.
 */
export type IndexPageTitleSectionProps = {
  title: string;
  subtitle: string;
  /** Renders after `title` (e.g. version tag for Maiden voyage 2.0; Genesis uses white). */
  titleAccentSuffix?: string;
  /**
   * Soft frame + gradient behind the title block (Genesis relaunch / featured hero).
   * Other index pages omit this for the default flat look.
   */
  featuredHero?: boolean;
};

export function IndexPageTitleSection({
  title,
  subtitle,
  titleAccentSuffix,
  featuredHero,
}: IndexPageTitleSectionProps) {
  const inner = (
    <>
      <div className="flex items-center justify-center px-4 pt-2 pb-1 sm:pt-3 sm:pb-1">
        <h1 className="font-bold font-mono text-white text-5xl sm:text-6xl md:text-7xl text-center leading-[1.05]">
          <span className="text-white">{title}</span>
          {titleAccentSuffix ? (
            <span className="text-white whitespace-nowrap">
              {" "}
              {titleAccentSuffix}
            </span>
          ) : null}
        </h1>
      </div>
      <div className="flex items-center justify-center px-4 pb-1 mt-1 sm:mt-2">
        <p className="text-white/85 text-lg sm:text-xl text-center max-w-2xl leading-snug font-medium tracking-tight">
          {subtitle}
        </p>
      </div>
    </>
  );

  if (featuredHero) {
    return (
      <div className="mb-3 flex flex-col">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent px-1 pt-1 pb-0.5 shadow-[0_0_40px_-12px_rgba(255,138,122,0.35)] sm:px-2">
          {inner}
        </div>
      </div>
    );
  }

  return <div className="mb-2 flex flex-col">{inner}</div>;
}
