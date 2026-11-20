/* Small 16px line icons for app chrome (sidebar, palette, menus).
   Stroke = currentColor so they follow text color and hover states. */

type P = { className?: string; size?: number };

function Svg({
  size = 16,
  className,
  children,
}: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconGrid = (p: P) => (
  <Svg {...p}>
    <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1.2" />
    <rect x="9" y="2.5" width="4.5" height="4.5" rx="1.2" />
    <rect x="2.5" y="9" width="4.5" height="4.5" rx="1.2" />
    <rect x="9" y="9" width="4.5" height="4.5" rx="1.2" />
  </Svg>
);

export const IconMegaphone = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 6.5v3h2l5.5 3V3.5l-5.5 3z" />
    <path d="M12 6.2a2.4 2.4 0 010 3.6" />
    <path d="M4.5 9.5l.8 3h1.7l-.6-2.4" />
  </Svg>
);

export const IconStar = (p: P) => (
  <Svg {...p}>
    <path d="M8 2.3l1.7 3.6 3.9.5-2.9 2.7.8 3.9L8 11.1 4.5 13l.8-3.9-2.9-2.7 3.9-.5z" />
  </Svg>
);

export const IconTag = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 8.3V2.5h5.8l5.2 5.2-5.5 5.6z" />
    <circle cx="5.3" cy="5.3" r=".9" />
  </Svg>
);

export const IconBag = (p: P) => (
  <Svg {...p}>
    <path d="M3 5.5h10l-.8 8H3.8z" />
    <path d="M5.8 5.5V4.4a2.2 2.2 0 014.4 0v1.1" />
  </Svg>
);

export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 7.2L8 2.8l5.5 4.4v6.3h-3.7V10H6.2v3.5H2.5z" />
  </Svg>
);

export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="5.6" />
    <path d="M8 5v3l2 1.3" />
  </Svg>
);

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="7.2" cy="7.2" r="4.4" />
    <path d="M10.5 10.5L13.5 13.5" />
  </Svg>
);

export const IconArrowRight = (p: P) => (
  <Svg {...p}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </Svg>
);

export const IconChevronRight = (p: P) => (
  <Svg {...p}>
    <path d="M6 3.5L10.5 8 6 12.5" />
  </Svg>
);

export const IconUnlock = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="7" width="10" height="6.5" rx="1.6" />
    <path d="M5.3 7V5.2a2.7 2.7 0 015.2-1" />
  </Svg>
);

export const IconLock = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="7" width="10" height="6.5" rx="1.6" />
    <path d="M5.3 7V5.2a2.7 2.7 0 015.4 0V7" />
  </Svg>
);

export const IconLogout = (p: P) => (
  <Svg {...p}>
    <path d="M6.5 13.5h-3v-11h3" />
    <path d="M10 5l3 3-3 3M13 8H6.5" />
  </Svg>
);

export const IconMenu = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
  </Svg>
);

export const IconCode = (p: P) => (
  <Svg {...p}>
    <path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5" />
  </Svg>
);

export const IconSparkle = (p: P) => (
  <Svg {...p}>
    <path d="M8 2v3M8 11v3M2 8h3M11 8h3M3.8 3.8l2 2M10.2 10.2l2 2M12.2 3.8l-2 2M5.8 10.2l-2 2" />
  </Svg>
);

export const IconMail = (p: P) => (
  <Svg {...p}>
    <rect x="2" y="3.5" width="12" height="9" rx="1.8" />
    <path d="M2.5 4.5L8 8.7l5.5-4.2" />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 8.4l2.9 2.9 6.1-6.3" />
  </Svg>
);

export const IconCopy = (p: P) => (
  <Svg {...p}>
    <rect x="5.5" y="5.5" width="8" height="8" rx="2" />
    <path d="M10.5 3.2A1.8 1.8 0 0 0 9 2.5H4.3a1.8 1.8 0 0 0-1.8 1.8V9a1.8 1.8 0 0 0 .7 1.5" />
  </Svg>
);

export const IconLink = (p: P) => (
  <Svg {...p}>
    <path d="M6.8 9.2a2.7 2.7 0 0 0 3.8 0l2-2a2.7 2.7 0 0 0-3.8-3.8l-.7.7" />
    <path d="M9.2 6.8a2.7 2.7 0 0 0-3.8 0l-2 2a2.7 2.7 0 0 0 3.8 3.8l.7-.7" />
  </Svg>
);

export const IconTerminal = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 5l3 3-3 3" />
    <path d="M8.5 11.5h4" />
  </Svg>
);

export const CATEGORY_ICON: Record<string, (p: P) => React.ReactElement> = {
  all: IconGrid,
  announcement: IconMegaphone,
  "social-proof": IconStar,
  "product-page": IconTag,
  cart: IconBag,
  homepage: IconHome,
  urgency: IconClock,
};
