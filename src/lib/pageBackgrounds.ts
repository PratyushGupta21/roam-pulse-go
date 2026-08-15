import heroTravel from "@/assets/hero-travel.webp";
import heroHowItWorks from "@/assets/hero-how-it-works.jpg";
import heroPricing from "@/assets/hero-pricing.jpg";
import heroFaq from "@/assets/hero-faq.jpg";
import heroAbout from "@/assets/hero-about.jpg";
import heroLogin from "@/assets/hero-login.jpg";
import heroSignup from "@/assets/hero-signup.jpg";

export interface PageBackgroundMeta {
  imageSrc: string;
  alt: string;
  position?: string | undefined;
  concept: string;
}

export interface PageBackgroundsRegistry {
  home: PageBackgroundMeta;
  howItWorks: PageBackgroundMeta;
  pricing: PageBackgroundMeta;
  faq: PageBackgroundMeta;
  about: PageBackgroundMeta;
  login: PageBackgroundMeta;
  signup: PageBackgroundMeta;
}

/**
 * Centralized RoamPulse page-to-image registry.
 * Ensures every major page uses its own distinct, high-resolution travel photograph.
 */
export const pageBackgrounds: PageBackgroundsRegistry = {
  home: {
    imageSrc: heroTravel,
    alt: "A traveller looking out over a coastal mountain road at sunset",
    position: "62% 38%",
    concept: "Adventure + Freedom + Discovery",
  },
  howItWorks: {
    imageSrc: heroHowItWorks,
    alt: "A traveller holding a smartphone with digital navigation map at a scenic mountain viewpoint",
    position: "center 40%",
    concept: "Navigation + Intelligence + Exploration",
  },
  pricing: {
    imageSrc: heroPricing,
    alt: "Panoramic snow-capped alpine mountain peak vista with golden morning light",
    position: "center 30%",
    concept: "Scale + Clarity + Reliability",
  },
  faq: {
    imageSrc: heroFaq,
    alt: "Calm turquoise fjord with stone pathway and peaceful mountain bay at twilight",
    position: "center 45%",
    concept: "Peace of Mind + Serenity",
  },
  about: {
    imageSrc: heroAbout,
    alt: "Panoramic scenic rolling green mountains and winding mountain highway at golden sunset",
    position: "center 50%",
    concept: "Exploration + Human Ambition",
  },
  login: {
    imageSrc: heroLogin,
    alt: "Serene sunrise casting golden warmth across a mountain highway and pine forests",
    position: "center 50%",
    concept: "Calm Arrival + Clarity",
  },
  signup: {
    imageSrc: heroSignup,
    alt: "Winding coastal highway along cliffs overlooking ocean at golden hour",
    position: "center 40%",
    concept: "Beginning a Journey + Anticipation",
  },
};
