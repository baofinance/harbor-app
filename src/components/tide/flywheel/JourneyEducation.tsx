"use client";

import {
  JOURNEY_EDUCATION_BODY_CLASS,
  JOURNEY_EDUCATION_GRID_CLASS,
  JOURNEY_EDUCATION_TITLE_CLASS,
} from "./revenueJourneyStyles";

export type JourneyEducationProps = {
  howRevenueFlows: {
    title: string;
    paragraphs: readonly string[];
  };
  whyThisMatters: {
    title: string;
    intro: string;
    bullets: readonly string[];
    outro: string;
  };
};

export function JourneyEducation({
  howRevenueFlows,
  whyThisMatters,
}: JourneyEducationProps) {
  return (
    <footer className={JOURNEY_EDUCATION_GRID_CLASS}>
      <div>
        <h3 className={JOURNEY_EDUCATION_TITLE_CLASS}>{howRevenueFlows.title}</h3>
        <div className={JOURNEY_EDUCATION_BODY_CLASS}>
          {howRevenueFlows.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
      <div className="lg:border-l lg:border-white/[0.08] lg:pl-8">
        <h3 className={JOURNEY_EDUCATION_TITLE_CLASS}>{whyThisMatters.title}</h3>
        <div className={JOURNEY_EDUCATION_BODY_CLASS}>
          <p>{whyThisMatters.intro}</p>
          <ul className="list-disc space-y-1 pl-4">
            {whyThisMatters.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <p>{whyThisMatters.outro}</p>
        </div>
      </div>
    </footer>
  );
}
