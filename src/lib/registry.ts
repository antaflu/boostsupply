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
import { cartUpsell } from "./tweaks/cart-upsell";
import { bundleBuyBox } from "./tweaks/bundle-buy-box";
import { fitReviews } from "./tweaks/fit-reviews";
import { awardShelf } from "./tweaks/award-shelf";
import { flavorCarousel } from "./tweaks/flavor-carousel";
import { productLadder } from "./tweaks/product-ladder";
import { resultsTimeline } from "./tweaks/results-timeline";
import { giftValueStack } from "./tweaks/gift-value-stack";
import { finishConfigurator } from "./tweaks/finish-configurator";
import { addonConfigurator } from "./tweaks/addon-configurator";
import { productChooser } from "./tweaks/product-chooser";
import { valueChart } from "./tweaks/value-chart";
import { setBuilder } from "./tweaks/set-builder";
import { quickAddGrid } from "./tweaks/quick-add-grid";

/** Every section is free (with an account) while the library grows. Flip
    to false to bring back the prices kept on each tweak definition. */
export const ALL_FREE = true;

const LIBRARY: Tweak[] = [
  // eye-catching, interactive sections first; simple bars last
  fitReviews,
  bundleBuyBox,
  cartUpsell,
  finishConfigurator,
  flavorCarousel,
  productChooser,
  giftValueStack,
  quickAddGrid,
  setBuilder,
  awardShelf,
  productLadder,
  valueChart,
  resultsTimeline,
  addonConfigurator,
  comparison,
  reviewSlider,
  uspGrid,
  faqAccordion,
  stickyAtc,
  shippingBar,
  countdownBar,
  iconBar,
  logoSlider,
  trustBadges,
  ticker,
];

export const TWEAKS: Tweak[] = ALL_FREE
  ? LIBRARY.map((t) => ({ ...t, tier: "free" as const, price: undefined }))
  : LIBRARY;

export const getTweak = (slug: string): Tweak | undefined =>
  TWEAKS.find((t) => t.slug === slug);
