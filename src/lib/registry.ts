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
import { planCompare } from "./tweaks/plan-compare";
import { doseCompare } from "./tweaks/dose-compare";
import { subscribeBuyBox } from "./tweaks/subscribe-buy-box";
import { ritualSteps } from "./tweaks/ritual-steps";
import { guaranteeBand } from "./tweaks/guarantee-band";
import { bagDrawer } from "./tweaks/bag-drawer";
import { shadeCardGrid } from "./tweaks/shade-card-grid";
import { ugcReviewWall } from "./tweaks/ugc-review-wall";
import { impactLabel } from "./tweaks/impact-label";
import { modelCompare } from "./tweaks/model-compare";
import { carryBundle } from "./tweaks/carry-bundle";
import { vsLeather } from "./tweaks/vs-leather";
import { recipeCards } from "./tweaks/recipe-cards";
import { setTiers } from "./tweaks/set-tiers";
import { clinicalStats } from "./tweaks/clinical-stats";
import { fitFinder } from "./tweaks/fit-finder";
import { shadeBuyBox } from "./tweaks/shade-buy-box";
import { pdpIntimates } from "./tweaks/pdp-intimates";
import { ingredientExplorer } from "./tweaks/ingredient-explorer";
import { refillFlow } from "./tweaks/refill-flow";
import { sizePredictor } from "./tweaks/size-predictor";
import { pdpApparel } from "./tweaks/pdp-apparel";
import { completeTheLook } from "./tweaks/complete-the-look";
import { dropWaitlist } from "./tweaks/drop-waitlist";
import { routineBuilder } from "./tweaks/routine-builder";
import { packBuilder } from "./tweaks/pack-builder";
import { sugarCompare } from "./tweaks/sugar-compare";
import { flavorQuiz } from "./tweaks/flavor-quiz";
import { featureTabs } from "./tweaks/feature-tabs";
import { membershipPricing } from "./tweaks/membership-pricing";

/** Every section is free (with an account) while the library grows. Flip
    to false to bring back the prices kept on each tweak definition. */
export const ALL_FREE = true;

const LIBRARY: Tweak[] = [
  // eye-catching, interactive sections first; simple bars last
  fitReviews,
  pdpApparel,
  bagDrawer,
  packBuilder,
  finishConfigurator,
  featureTabs,
  flavorCarousel,
  routineBuilder,
  pdpIntimates,
  productChooser,
  completeTheLook,
  giftValueStack,
  shadeCardGrid,
  quickAddGrid,
  setBuilder,
  ugcReviewWall,
  carryBundle,
  dropWaitlist,
  planCompare,
  subscribeBuyBox,
  bundleBuyBox,
  cartUpsell,
  fitFinder,
  sizePredictor,
  flavorQuiz,
  impactLabel,
  modelCompare,
  sugarCompare,
  membershipPricing,
  awardShelf,
  productLadder,
  shadeBuyBox,
  valueChart,
  recipeCards,
  setTiers,
  ingredientExplorer,
  refillFlow,
  clinicalStats,
  resultsTimeline,
  doseCompare,
  ritualSteps,
  guaranteeBand,
  vsLeather,
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
