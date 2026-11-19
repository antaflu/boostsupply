import type { Tweak } from "./types";
import { ticker } from "./tweaks/ticker";
import { logoSlider } from "./tweaks/logo-slider";
import { trustBadges } from "./tweaks/trust-badges";
import { uspGrid } from "./tweaks/usp-grid";
import { stickyAtc } from "./tweaks/sticky-atc";
import { reviewSlider } from "./tweaks/review-slider";
import { countdownBar } from "./tweaks/countdown-bar";
import { shippingBar } from "./tweaks/shipping-bar";
import { iconBar } from "./tweaks/icon-bar";
import { faqAccordion } from "./tweaks/faq-accordion";
import { comparison } from "./tweaks/comparison";

export const TWEAKS: Tweak[] = [
  ticker,
  iconBar,
  logoSlider,
  trustBadges,
  reviewSlider,
  comparison,
  uspGrid,
  faqAccordion,
  stickyAtc,
  countdownBar,
  shippingBar,
];

export const getTweak = (slug: string): Tweak | undefined =>
  TWEAKS.find((t) => t.slug === slug);
