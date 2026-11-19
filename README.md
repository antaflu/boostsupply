# boost.supply

A directory of clean, conversion-focused Shopify sections. Merchants browse the
directory, restyle a section to their brand in a visual editor (fonts, colors,
spacing, motion — everything), then export a real, paste-ready Shopify Liquid
section. Some sections are free; most are a one-time unlock.

Built with Next.js (App Router) + TypeScript + Tailwind v4.

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # production build + typecheck
```

## How it works

Every section ("tweak") is **schema-driven** — one file defines three things
that always stay in sync:

1. **`fields`** — the controls shown in the editor sidebar (the schema).
2. **`Preview`** — a React component that renders the live preview from a config.
3. **`generateLiquid`** — a pure function `config → Shopify Liquid section`.

The visual editor reads `fields` to render controls, feeds the working config to
`Preview` for the live preview, and calls `generateLiquid` on export. Because the
preview and the Liquid come from the same config, what you design is what you get.

### Architecture

```
src/
  lib/
    types.ts        # Field / Tweak / Category type system (the backbone)
    cfg.ts          # typed config getters (str/num/bool/list) + font/escape helpers
    liquid.ts       # buildSchema(), section(), fontFaceFor() — real Shopify section output
    fields.ts       # shared field presets (font picker, weight)
    categories.ts   # category list
    auth.tsx        # mock auth + entitlements + paywall/auth modals (swappable shim)
    registry.ts     # collects all tweaks
    tweaks/         # ONE FILE PER SECTION  ← add new sections here
  components/
    Nav.tsx, TweakCard.tsx, ScaledPreview.tsx, Controls.tsx, CodeModal.tsx
  app/
    page.tsx              # the directory (hero + sidebar filters + card grid)
    tweak/[slug]/page.tsx # the visual editor
    account/page.tsx      # unlocks
```

### The 8 starter sections

Free: Announcement Ticker · Logo Slider · Trust Badge Bar
Premium: Review Slider · USP Grid · Sticky Add to Cart · Countdown Bar · Free Shipping Bar

## Adding a new section

Create `src/lib/tweaks/my-section.tsx` exporting a `Tweak`, then register it in
`src/lib/registry.ts`. Use any existing tweak as a template — `ticker.tsx` is the
reference implementation (content list + style + motion + a full `{% schema %}`
with blocks). That's the whole job: one file in, one line in the registry.

## Swapping in real auth + payments

`src/lib/auth.tsx` is an intentional shim that persists to `localStorage`. Replace
the bodies of `signIn`, `signOut`, and `purchase` with real Shopify OAuth / Stripe
calls — keep the `useAuth()` shape identical and no UI needs to change.

> Note: this project currently lives inside the home-directory git repo. Run
> `git init` here before committing so it stays self-contained.
