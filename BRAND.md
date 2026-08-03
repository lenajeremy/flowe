# Fernary — Brand Guidelines

*The automation system for AI you can actually leave running.*

A **fernery** is a garden where ferns are cultivated and tended. Fernary is the
software equivalent: a place where you plant a workflow once and it grows,
runs, and looks after itself while you're away. The brand should always feel
**calm, dependable, and quietly alive** — not loud, not robotic.

Founded 2026. `fernary.com`

**How to read this document.** Every rule states its reason, because a rule
without a reason gets broken the first time it's inconvenient. Where a value
lives in code, the code is cited — `src/index.css` and
`src/components/FloweIcon.tsx` are the sources of truth, and this document
describes them rather than replacing them. Anything provisional is marked
*(provisional)*.

**Contents**

1. [The mark](#1-the-mark)
2. [Logo variants, lockups, and clear space](#2-logo-variants-lockups-and-clear-space)
3. [Misuse](#3-misuse)
4. [Colour](#4-colour)
5. [Typography](#5-typography)
6. [Spacing and layout](#6-spacing-and-layout)
7. [Motion](#7-motion)
8. [Accessibility](#8-accessibility)
9. [Voice](#9-voice)
10. [About and boilerplate copy](#10-about-and-boilerplate-copy)
11. [Social media](#11-social-media)
12. [Footer specification](#12-footer-specification)
13. [Asset index](#13-asset-index)

---

## 1. The mark

The Fernary mark is a **four-leaflet frond** in four-fold rotational symmetry —
a fern tending itself.

- **Four leaflets** = many workflows, coordinated from one place.
- **Four-fold symmetry** = stability and trust (it reads the same every way up).
- **The gentle pinwheel lean (13°)** = unfurling, motion, work happening.
- **The negative-space core** = a small spark — a quiet nod to intelligence.

Each leaflet is a rounded leaf with a soft notch at the tip; together they read
at once as a fern cluster, a clover, a flower, and a hub of radiating activity.

### Construction

- Drawn on a **100 × 100** grid, centred at (50, 50).
- One leaflet path, duplicated at **0° / 90° / 180° / 270°** about (50, 50).
- Each leaflet is nudged **4 units outward** (`translate(0 -4)` before rotation —
  this opens the core gap) and spun **13°** (the lean).
- Colours run **top → right → bottom → left**: lime · emerald · teal · amber.
- Each leaflet carries a **diagonal linear gradient** (`x1,y1 = 0,0` →
  `x2,y2 = 1,1`), light stop first. The gradient is what makes the frond feel
  alive rather than printed; it is the only gradient in the identity.

The leaflet path and the four gradient stop pairs are defined once, in
`src/components/FloweIcon.tsx` (constants `LEAF` and `STOPS`). Treat that file as
the geometry source of truth; `public/favicon.svg` and `public/app-icon.svg` are
hand-inlined copies of the same path and must be updated together if it ever
changes.

---

## 2. Logo variants, lockups, and clear space

One mark, every surface. Pick by background, not by preference.

| Variant | Use it for | File / prop |
|---|---|---|
| **Full colour** | Default. Headers, marketing, favicon, app tile. | `<FloweIcon />` |
| **Monochrome** | One-colour contexts: stamps, embroidery, faxable docs, dense UI. | `<FloweIcon mono="#0B5D4E" />` |
| **Reversed (white)** | On emerald, on Forest, or on dark photography. | `<FloweIcon mono="#ffffff" />` |
| **App tile** | PWA / touch icon / social avatar — frond on the deep-fern gradient. | `public/app-icon.svg` |
| **Favicon** | Browser tab — transparent full-colour frond, no tile. | `public/favicon.svg` |

**App tile geometry.** 512 × 512, corner radius **115** (22.5%), tile gradient
`#103F35` → `#0A1512` on the same 0,0 → 1,1 diagonal. The frond is scaled ×3 and
inset **106 px** on every side, so it occupies the middle ~59% of the tile. That
padding exists because platforms mask and shrink icons; a tighter frond loses its
leaflet tips on Android's circular mask.

**Favicon vs. app tile — do not swap them.** The favicon is transparent so it sits
on whatever chrome the browser paints. Anywhere that composites the logo onto an
unknown background — social avatars, app stores, Slack, OG images — must use the
**app tile** or a reversed mark on a solid Forest square instead. A transparent
full-colour frond on an unknown background is the single most common way this
identity gets broken.

### Lockups

- **Horizontal** — mark + `Fernary` wordmark, baseline-aligned, gap = one-half the
  mark's width. The default lockup.
- **Stacked** — mark above centred wordmark. For square or narrow spaces.
- **Mark only** — once the audience knows the brand (app chrome, avatars, favicons).

### Clear space and minimum size

- **Clear space** = the height of one leaflet on all sides. Nothing intrudes — not
  text, not a border, not the edge of a photo crop. The frond reads as radiating
  outward, and crowding kills that.
- **Minimum size**: mark **16 px** on screen, **6 mm** in print.
- Below the minimum, use the **monochrome** mark. Four gradients inside 16 px
  average into grey mud; a single flat colour stays legible.

---

## 3. Misuse

The symmetry, the four hues, and the flatness are the identity. Everything below
breaks one of the three.

**Never do these things to the mark:**

| Don't | Why |
|---|---|
| Recolour the leaflets outside the palette, or flatten the *colour* logo to one hue | The four-hue sequence lime → emerald → teal → amber is the recognition cue. If you need one colour, use the monochrome variant, which is a different, sanctioned mark. |
| Rotate, skew, mirror, or re-order the leaflets | Four-fold symmetry is what makes it read the same every way up. Re-ordering the hues breaks the top→right→bottom→left rule that ties the mark to the palette. |
| Re-draw or "clean up" the leaflets | The notch at the tip, the 13° lean, and the 4-unit core gap are calibrated together. A redrawn leaflet stops matching the shipped SVGs, and the two versions will end up on the same page. |
| Add drop shadows, outlines, strokes, bevels, or glows | The mark is flat with gradient fills only. Effects fight the gradients and destroy the negative-space spark in the core. |
| Place the **full-colour** mark on busy photography | The mid-tone greens and amber vanish against foliage, sunsets, and screenshots. Use the reversed white mark, or set the app tile on a solid Forest patch. |
| Enclose the mark in another shape — a circle, a rounded square you drew yourself, a badge, a speech bubble | The mark already has its own container: `public/app-icon.svg`. A second container reads as someone else's logo holding ours. |
| Use the mark as a bullet, a loading spinner that spins fast, or a repeating pattern tile | It's an identity, not an ornament. Slow rotation on load is allowed (see [Motion](#7-motion)); a fast spinner is not. |

**Never do these things to the wordmark:**

| Don't | Why |
|---|---|
| Set `Fernary` in another typeface — including another grotesk that "looks the same" | The wordmark is artwork, not text. Substituting Inter or system-ui changes the `a` and `y` and the whole lockup stops matching. |
| Mix typefaces *within* the wordmark (e.g. Google Sans Code for one letter) | Google Sans Code is the machine's voice. The brand name is not the machine talking. |
| Set the wordmark in **ALL CAPS** or small caps | Sentence case is a voice decision, not a styling one: the brand is calm and lower-key. `FERNARY` shouts. |
| Stretch, condense, arch, or re-track the wordmark | Tracking is fixed at −0.02em at 700 weight. Anything else changes the silhouette. |
| Write it `FernAry`, `fernary` (mid-sentence), `Fernary AI`, or `Fernery` | The product name is exactly `Fernary`, capital F. `Fernery` is the horticultural word the name derives from — use it only when explaining the name. |

**Never do these things with the colours:**

| Don't | Why |
|---|---|
| Use **Fern Amber** for errors, failures, or destructive actions | Amber means *warmth and the human in the loop* — it is the colour of an approval waiting for a person. Using it for errors makes "someone needs to look at this" and "something broke" indistinguishable, which is exactly the distinction the product sells. Errors use `--color-fail`. |
| Use amber, lime, or teal as **text** on white | See [Accessibility](#8-accessibility). They are fill and accent colours; none reaches 4.5:1 on white. |
| Use all four hues in ordinary UI | Reserved for the logo, data-viz, illustration, and deliberate brand moments. Everyday UI is emerald + neutrals so the workflow canvas owns the colour. |

---

## 4. Colour

### The four frond hues

The logo's palette. Also used for data-viz, illustration, and accents. Each hue
has a flat value (use this for fills, text where contrast allows, and tokens) and
a gradient pair (use this only where the logo's own gradients appear).

| Token | Flat | Gradient (light → dark) | Feel |
|---|---|---|---|
| **Fern Lime** `--fern-lime` | `#74CE45` | `#9AE06A` → `#68C63E` | New growth, fresh |
| **Fern Emerald** `--fern-emerald` | `#14B886` | `#22CE8E` → `#0FA36F` | The primary. Trust, life |
| **Fern Teal** `--fern-teal` | `#0FA3A3` | `#15B8B2` → `#0A8E96` | Depth, cool calm |
| **Fern Amber** `--fern-amber` | `#F5A524` | `#FFC94E` → `#F5A524` | The sun. Warmth, the human in the loop |

### Supporting greens

| Token | Hex | Use |
|---|---|---|
| **Pine** `--fern-pine` | `#0B5D4E` | Ink-green text on light brand surfaces; the monochrome mark |
| **Forest** `--fern-forest` | `#0A1512` | Near-black green for dark brand surfaces; base of the app-tile gradient |

### UI system

The product leads with **emerald** and stays otherwise achromatic, so the
workflow canvas owns the colour.

| Role | Token | Dark | Light |
|---|---|---|---|
| **Accent** | `--color-accent` | `#16C08A` | `#0E9E6E` |
| Canvas | `--color-canvas` | `#0A0A0D` | `#E9EBF1` |
| Surface | `--color-surface` | `#121216` | `#FFFFFF` |
| Border | `--color-border` | `#232329` | `#DCDDE6` |
| Text | `--color-text` | `#F2F2F5` | `#191922` |
| Muted text | `--color-muted` | `#9C9CA8` | `#4C4C5E` |
| Subtle text | `--color-subtle` | `#5F5F6B` | `#717182` |
| Success | `--color-ok` | `#3DD68C` | `#0D8A57` |
| Waiting / hold | `--color-hold` | `#F5A623` | `#9D6407` |
| Error | `--color-fail` | `#F4554A` | `#D0322A` |

The accent shifts between themes deliberately: `#16C08A` is brightened to hold
its own against a near-black canvas, `#0E9E6E` is deepened so it doesn't glare on
white. **Fern Emerald `#14B886` is the brand emerald**; the two accents are its
theme-tuned UI expressions. Don't use `#14B886` as an interactive colour in the
app — use `--color-accent` and let the theme decide.

**Colour rules**

- Emerald is the interactive colour: buttons, focus rings, links, live handles.
- Amber is reserved for **warmth, highlights, and human-in-the-loop states** —
  never for errors. `--color-hold` (`#F5A623`) is the UI's waiting/approval
  amber, one digit off brand amber `#F5A524`; see the note in
  [§13](#13-asset-index) about reconciling them.
- Use all four hues *together* only in the logo and deliberate brand moments;
  everyday UI is emerald + neutrals.
- Never hardcode a hex in a component. Everything above exists as a token in
  `src/index.css` and re-inks itself when `data-theme` flips on `<html>`.

---

## 5. Typography

**One family, two voices.** Fernary uses **Google Sans** — a geometric humanist
sans, open, confident, and unfussy at both display and interface sizes — paired
with **Google Sans Code** for anything the machine says.

- **Google Sans** → content: headlines, body, the wordmark. Weights **400 / 500 / 600 / 700**.
- **Google Sans Code** → the machine: statuses, timestamps, ids, node metadata. Weights **400 / 500**.

They are siblings, not strangers. Both are drawn on the same geometric skeleton
with matching x-height and proportions, so moving between them reads as a change
of **register**, not a change of brand — the reason this pairing works better
than bolting an unrelated mono onto a sans. Switching voice is supposed to be
legible without being loud.

**Licensing.** Both ship under the **SIL Open Font License 1.1**, which is what
makes them usable in a commercial product at all. This matters, because Google's
other brand faces are not: **Product Sans** — and anything else served with the
`googlerestricted` header — is proprietary to Google's own products and must
never be used here. If you are ever unsure about a Google face, check the
`LICENSE` inside its `@fontsource` package: it states OFL explicitly when it
applies.

Loaded via `@fontsource/google-sans` and `@fontsource/google-sans-code` in
`src/index.css`; exposed as `--font-sans` and `--font-mono`. Self-hosted on
purpose — no external font CDN in the request path. Only those six faces are
bundled, so if a design needs Google Sans 300 or Code 700 it needs a new
`@import` first; don't specify weights that aren't there. (Both families are
variable, so adding a weight is cheap when it's genuinely needed.)

### The wordmark

`Fernary`, set in **Google Sans 700**, tracking **−0.02em**, sentence case. Never
re-typeset it in another face or weight; treat it as artwork paired with the mark.

### Type scale

A restrained scale — display sizes carry personality, body stays highly legible.
**Tracking tightens as size grows** and returns to zero at body size: large type
has too much optical space between letters at default tracking, small type needs
every bit of it to stay readable.

| Role | Token *(provisional)* | Size / line-height | Weight | Tracking | Use it for |
|---|---|---|---|---|---|
| Display | `--text-display` | 60 / 1.02 | 700 | −0.03em | One per page, maximum: the landing hero. Never in the app. |
| H1 | `--text-h1` | 46 / 1.05 | 700 | −0.02em | Page and marketing-section openers. |
| H2 | `--text-h2` | 34 / 1.10 | 600 | −0.02em | Major section headings on marketing pages. |
| H3 | `--text-h3` | 26 / 1.20 | 600 | −0.01em | Sub-sections; the largest heading that appears inside the app. |
| Title | `--text-title` | 20 / 1.30 | 600 | −0.01em | Panel titles, dialog titles, card headings, node names. |
| Body L | `--text-body-lg` | 16 / 1.55 | 400 | 0 | Marketing body, long-form prose, empty-state explanations. |
| Body | `--text-body` | 14 / 1.55 | 400 | 0 | The app's default. All form labels, menu items, list rows. |
| Caption | `--text-caption` | 12–13 / 1.40 | 500 | 0 | Helper text under fields, secondary metadata, footer links. |
| Mono / meta | `--text-mono` | 11–13 / 1.40 | 500 | 0 | Google Sans Code. See below. |
| Micro-caps | `.micro` | 9.5 / 1.40 | 500 | +0.09em | Google Sans Code, uppercase. Status chips, category labels. **Tracking goes positive** — uppercase mono this small closes up without it. |

*The type-scale tokens are being added to `@theme` in `src/index.css`. Names above
follow the `--text-*` convention; if they land under different names, `src/index.css`
wins and this table should be corrected to match. `.micro` already exists in
`src/index.css` and is the only type role defined as a utility class rather than a
token.*

### The Google Sans Code roles, explicitly

Mono is not decoration. It is a **signal that this text came from the system, not
from a person**, so a reader can tell at a glance what they can and can't edit.
Use Google Sans Code for, and only for:

| Role | Examples | Weight |
|---|---|---|
| Identifiers | node ids, run ids, workflow ids, webhook URLs, API keys | 400 |
| Timestamps and durations | `2026-08-03 14:22:07`, `1.4s`, `every 15 min` | 400 |
| Status and state | `RUNNING`, `WAITING`, `FAILED`, `OK` (as `.micro` micro-caps) | 500 |
| Numeric data | counts, credits, token usage, row counts, percentages | 500 |
| Code and payloads | JSON, expressions, `{{node.output}}` templates, log lines | 400 |
| Node metadata | node type labels, port names, integration slugs | 500 |

Everything a human wrote or will read as prose — headings, body copy, labels,
button text, error *explanations* — is Google Sans. An error message is prose; the error
*code* inside it is mono.

**How to apply it in code: `font-mono`, never `font-[var(--font-mono)]`.**
Tailwind v4 treats `font-[…]` as ambiguous — `font-*` covers family, size *and*
weight — so an un-hinted `font-[var(--font-mono)]` compiles to **no rule at
all**. It fails silently: the class stays in the DOM, the element renders in the
sans, and nothing warns you. This is not hypothetical; 36 call sites across 20
files were dead this way, which meant every id, timestamp, JSON payload and
status chip in the app was quietly rendering in the wrong voice. Use the
`font-mono` / `font-sans` utilities that `@theme` already generates from
`--font-mono` / `--font-sans`. If you ever genuinely need an arbitrary family,
hint the type: `font-[family-name:var(--font-mono)]`.

To check the doctrine is actually holding, count the elements the browser
resolves to the mono family — not the ones carrying the class:

```js
[...document.querySelectorAll('*')]
  .filter(e => getComputedStyle(e).fontFamily.includes('Code')).length
```

**Rules**

- Tighten tracking as type gets bigger; leave body at default.
- Sentence case for everything except micro-caps status chips. No ALL-CAPS headlines,
  and never an all-caps wordmark.
- Numbers, ids, code, and status chips are **always** Google Sans Code — it's the
  signal that "this is the machine talking."
- Body copy caps at ~70 characters per line (see [§6](#6-spacing-and-layout));
  past that the eye loses the line return.

---

## 6. Spacing and layout

### The 4 px base scale

Every gap, pad, and margin is a multiple of **4 px**. One base unit means two
designers working on different screens land on the same rhythm without
negotiating, and it maps 1:1 onto Tailwind's default spacing utilities the app
already uses.

| Step | px | Tailwind | Use it for |
|---|---|---|---|
| 1 | 4 | `gap-1` | Icon-to-label inside a chip; hairline separations. |
| 2 | 8 | `gap-2` | Inside a control: button padding-y, chip padding-x. |
| 3 | 12 | `gap-3` | Between related controls in a row; card padding on dense panels. |
| 4 | 16 | `gap-4` | The default gap. Between form fields; standard card padding. |
| 5 | 20 | `gap-5` | Between paragraph and following heading. |
| 6 | 24 | `gap-6` | Between groups within a card; the page gutter (`px-6`). |
| 8 | 32 | `gap-8` | Between cards in a grid; panel padding on marketing pages. |
| 10 | 40 | `gap-10` | Between a heading block and its content. |
| 12 | 48 | `gap-12` | Between sub-sections inside one section. |
| 14 | 56 | `mb-14` | Section header block → section body (the landing page's rhythm). |
| 16 | 64 | `gap-16` | Minimum vertical breathing room between distinct ideas. |
| 20 | 80 | `py-20` | Compact section padding (short sections, footers with columns). |
| 24 | 96 | `py-24` | Section padding on secondary pages. |
| 28 | 112 | `py-28` | **Default marketing section padding.** |
| 32 | 128 | `py-32` | Emphasised section — one or two per page. |
| 36 | 144 | `pt-36` | Hero top padding only. |

*The spacing scale is being added to `@theme` in `src/index.css` alongside the type
scale. Reference it by token (`--space-*` convention, provisional) in new CSS;
in Tailwind markup the numeric utilities above already resolve to the same values.*

### Section rhythm

Marketing pages are a stack of full-width sections; the vertical padding is what
separates ideas, not borders.

- **Default section**: `py-28` (112 px top and bottom).
- **Hero**: `pt-36 pb-20` — heavier above, lighter below, so the fold pulls the
  eye down instead of centring it.
- **Emphasised section**: `py-32`. Use sparingly; if everything is emphasised,
  nothing is.
- **Footer**: `py-12` to `py-20` depending on how many link columns it carries.
- Adjacent sections **never** both use a border *and* full padding. Pick one —
  padding for related ideas, a `1px` `--color-border` hairline for a hard change
  of subject.
- Halve every vertical value below the `md` breakpoint. 112 px of padding on a
  375 px-wide phone is a blank screen.

### Container widths

| Container | Class | Width | Use it for |
|---|---|---|---|
| Page | `mx-auto max-w-6xl px-6` | 1152 + 24 gutters | **The standard.** Every marketing section's inner wrapper and the app's page chrome. |
| Wide prose | `max-w-4xl` | 896 | Feature grids, screenshot figures, wide tables. |
| Prose | `max-w-3xl` | 768 | Long-form body copy. |
| Narrow prose | `max-w-2xl` | 672 | Section intro paragraphs under a heading. |
| Measure | `max-w-xl` | 576 | Single-column body text at 16 px — lands near 70 characters. |
| Form / dialog | `max-w-md` | 448 | Auth cards, single-field dialogs, confirmations. |

`max-w-6xl px-6` is the invariant: the gutter stays 24 px at every width so the
content edge is predictable, and centring is always `mx-auto` on the inner
wrapper rather than on the section, so section backgrounds run full-bleed.

### Grid guidance

- **12 columns**, 24 px gutter (`gap-6`), inside the `max-w-6xl` container. Twelve
  divides by 2, 3, 4, and 6, which covers every layout the marketing pages need.
- Feature cards: 3-up on `lg`, 2-up on `md`, 1-up below.
- Footer link columns: 4-up on `md` and above (brand + three link columns),
  stacked below.
- Never fewer than 3 columns of gutter between a text column and an adjacent
  image; text needs room to breathe more than images do.
- **Corner radii** come from `--radius` (`0.625rem` = 10 px) and its
  `--radius-sm/md/lg/xl` derivatives. Pick a step, don't invent a value: mismatched
  radii on nested surfaces is the fastest way to make a careful layout look sloppy.

---

## 7. Motion

One idea: **unfurling**. Things ease open and settle — they don't bounce or
snap.

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Default. Anything entering or responding to input. |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Looping ambient motion (pulses, drifts). |
| `--dur-fast` | 120 ms | Hover, press, colour change. |
| `--dur-base` | 180 ms | Panel and popover entrance. |
| `--dur-slow` | 240 ms | Larger surfaces, staggered list entrances. |

- Popovers and menus scale from their trigger (`--pop-origin`), never from nothing
  — motion should tell you where a thing came from.
- The mark may rotate slowly on load (a frond opening) but never spins fast, and
  never as a loading spinner.
- Ambient motion is measured in seconds, not milliseconds (the landing aurora
  drifts over 26 s) so it reads as atmosphere rather than animation.
- Respect `prefers-reduced-motion` — see [§8](#8-accessibility).

---

## 8. Accessibility

Accessibility here is a brand property, not a compliance chore: a product that
claims you can leave it running has to be legible when you come back to it.

**Target: WCAG 2.2 AA.** 4.5:1 for normal text, 3:1 for text ≥ 24 px or ≥ 19 px
bold, 3:1 for the visual boundary of interactive components and focus indicators.

### Measured contrast

| Foreground | On | Ratio | Verdict |
|---|---|---|---|
| `--color-text` `#F2F2F5` | dark canvas `#0A0A0D` | 17.7 | Pass |
| `--color-text` `#191922` | light canvas `#E9EBF1` | 14.6 | Pass |
| `--color-muted` `#9C9CA8` | dark canvas | 7.3 | Pass |
| `--color-muted` `#4C4C5E` | white surface | 8.4 | Pass |
| `--color-subtle` `#5F5F6B` | dark canvas | 3.1 | **Large text and non-text only.** Not for body copy. |
| `--color-subtle` `#717182` | white surface | 4.8 | Pass |
| Accent `#16C08A` | dark canvas | 8.4 | Pass |
| Accent `#0E9E6E` | white surface | 3.4 | **Fails AA for normal text.** Passes for ≥ 24 px text, icons, borders, focus rings. See below. |
| Fern Emerald `#14B886` | Forest `#0A1512` | 7.3 | Pass |
| Fern Emerald `#14B886` | white | 2.6 | **Fail. Not a text colour on light.** |
| **Fern Amber `#F5A524`** | white | **2.0** | **Fail — the worst in the palette.** |
| Fern Amber `#F5A524` | Forest `#0A1512` | 9.1 | Pass |
| Fern Lime `#74CE45` | white | 2.0 | **Fail.** |
| Fern Teal `#0FA3A3` | white | 3.1 | Large text and non-text only. |
| Pine `#0B5D4E` | white | 7.8 | Pass — this is the light-surface brand text colour. |

**Amber is a fill colour, not a text colour.** At 2.0:1 on white, `#F5A524` is
effectively invisible as small text — it is for icon fills, chip backgrounds,
strokes, the amber leaflet, and highlight washes. When you need to *say* something
warm on a light background, use `--color-hold` (`#9D6407`, 4.9:1 on white) for
waiting states or Pine for brand text. The same applies to lime, teal, and brand
emerald on light: all four frond hues are fills. Pine is the only brand green that
passes as text on white.

**Known gaps** *(for the orchestrator to resolve, not to design around)*:

- The light-theme accent `#0E9E6E` is 3.4:1 on white — fine for the focus ring and
  icons, short of AA for a 14 px link or a `text-accent` label. Until it's
  darkened, light-theme accent text should be ≥ 19 px bold / ≥ 24 px regular, or
  fall back to Pine.
- `--primary-foreground` is `#ffffff` on the light accent — a **3.4:1** button
  label. Primary buttons in light theme need either a darker accent or dark ink.
- `--color-ok` light (`#0D8A57`, 4.4:1) sits just under 4.5. Fine as an icon or
  border; borderline as small text.

### Minimum sizes and targets

- **Body text**: 14 px floor in the app, 16 px in marketing. Never set prose below 14 px.
- **Metadata**: 12 px floor. `.micro` at 9.5 px is allowed only for uppercase mono
  status chips, which are short, high-contrast, and redundant with an adjacent icon
  or colour — never the only carrier of meaning.
- **Interactive targets**: 24 × 24 px minimum (WCAG 2.2 Target Size AA), 40 × 40 px
  preferred for anything a person hits repeatedly. Small icon buttons get invisible
  padding to reach the target, not a bigger glyph.
- **Logo**: 16 px minimum (see [§2](#2-logo-variants-lockups-and-clear-space)).

### Focus states

- Global: `2px solid var(--color-accent)` with `outline-offset: 1px`, applied on
  `:focus-visible` only. Mouse users don't see it; keyboard users always do.
- Text inputs suppress the outline and use a border-colour change instead — a
  second ring around an already-bordered box reads as an error state.
- **Never** `outline: none` without a replacement indicator. If a custom focus
  treatment is needed, it must reach 3:1 against both the component and the
  surface behind it.
- Focus order follows visual order. Modals trap focus and return it to the trigger
  on close.

### Motion and reduced motion

`@media (prefers-reduced-motion: reduce)` in `src/index.css` disables ambient and
decorative animation. The rule for new motion: **keep meaning, drop movement.**
A running node still shows its state under reduced motion — as a static accent
ring instead of a pulse. Never let an animation be the only indicator of state;
if the pulse is off, the colour and the label still have to say "running".

### Colour is never the only signal

Run states pair colour with a label and an icon (`RUNNING` / `WAITING` / `FAILED`),
because ~4% of users can't reliably separate the amber hold state from the green
ok state. This is also why amber must not double as an error colour.

### Semantics

- The mark ships with `role="img"` and `aria-label="Fernary"`. When it appears
  *beside* the wordmark, the label is redundant to a screen reader — mark the
  decorative instance `aria-hidden="true"` so the name isn't announced twice.
- Icon-only links and buttons require an `aria-label`. This is not optional for
  social icons; see [§12](#12-footer-specification).
- Every image needs `alt`; decorative images take `alt=""`.

---

## 9. Voice

Calm, plain, specific. We describe what happens, not how clever it is.

- *"Runs on your schedule. Pauses for approval where it matters. Keeps going."*
- Not *"Revolutionary AI-powered hyperautomation."*

Say **"leave it running"**, **"without babysitting"**, **"every time"** — the
trust words. Errors explain and instruct; they never apologise or hype.

**Positioning.** Fernary is about *unattended* automation: schedules, human
approval gates, and memory that persists across runs. It is **not** "chat with
your tools". Copy that centres a chat window is off-brand even when the product
has one, because the promise is what happens while you're not there.

**Never write:** revolutionary, seamless, effortless, game-changing, 10x,
supercharge, unleash, magic, "AI-powered" as a value claim. Also avoid exclamation
marks and em-dash-heavy hype rhythm.

**Never claim** customer numbers, funding, headcount, uptime figures, or growth
unless someone has handed you the number and a source. The brand's whole asset is
being believable.

---

## 10. About and boilerplate copy

Approved, ready-to-paste text. Use these verbatim rather than paraphrasing — one
description everywhere is how a small brand becomes recognisable. All three
deliberately contain **no** traction, funding, headcount, or customer claims.

### One-liner — bios, ≤ 160 characters

Use for: X/Twitter bio, Instagram bio, LinkedIn tagline, GitHub org description,
app-store subtitle, meta description fallback.

> Fernary is the automation system for AI you can actually leave running.
> Schedules, approval gates, and memory across runs.

*(139 characters.)*

Shorter variants, if a field is tighter:

- 82 chars — `The automation system for AI you can actually leave running.  fernary.com`
- 58 chars — `Automation for AI you can actually leave running.`

### Short paragraph — ~50 words

Use for: About sections, partner directories, conference blurbs, newsletter
footers, the "what is this" panel on a landing page.

> Fernary is the automation system for AI you can actually leave running. You
> describe the work once; Fernary runs it on a schedule, pauses for human approval
> where it matters, and remembers what happened between runs. LLM flexibility,
> with the execution guarantees of ordinary software.

*(48 words.)*

### Full boilerplate — ~100 words

Use for: press releases (final paragraph), LinkedIn company "About", press kit,
funding-agnostic partner one-pagers, speaker bios.

> Fernary is the automation system for AI you can actually leave running. Founded
> in 2026, Fernary pairs the flexibility of large language models with the
> deterministic execution guarantees of ordinary software: workflows run on a
> schedule, pause for human approval where judgement is required, retry
> predictably when something fails, and carry memory from one run to the next.
> A fernery is a garden where ferns are cultivated and tended; Fernary applies
> the same idea to automated work — you plant a workflow once, and it keeps
> running without supervision. Learn more at fernary.com.

*(97 words.)*

### Name and description conventions

| Field | Correct | Wrong |
|---|---|---|
| Product / company name | `Fernary` | `fernary`, `FERNARY`, `Fernary AI`, `Fernery` |
| Handle | `@fernaryai` | `@fernary`, `@Fernary_AI` |
| Domain in copy | `fernary.com` | `www.fernary.com`, `https://fernary.com` (in prose) |
| Category, one word | automation | "agent platform", "AI agent builder" |
| Category, one phrase | automation system for AI | "AI orchestration platform" |
| Founded | 2026 | — |

Write about the product in the **third person** in boilerplate ("Fernary runs…")
and the **second person** in product copy ("your workflow runs…"). Never
first-person plural in boilerplate — "we're building" reads as pre-launch.

---

## 11. Social media

### Handles and URLs

One handle everywhere: **`@fernaryai`**. The bare `fernary` was unavailable on some
networks, so consistency beats brevity — a single string people can guess.

| Network | Handle | URL |
|---|---|---|
| X | `@fernaryai` | `https://x.com/fernaryai` |
| Instagram | `@fernaryai` | `https://instagram.com/fernaryai` |
| LinkedIn | `Fernary` | `https://linkedin.com/company/fernaryai` |

Written form in copy: the company is **`Fernary`**, the account is **`@fernaryai`**.
Never write the handle as the company name ("follow Fernaryai") and never
capitalise inside the handle.

### Avatar

Use **`public/app-icon.svg`** — the frond on the deep-fern gradient tile —
exported to PNG at the size each network wants (X 400 × 400, Instagram 320 × 320,
LinkedIn 300 × 300; export at 512 × 512 and let them downscale).

- **Do not** use `public/favicon.svg` as an avatar. It is transparent, and every
  network composites avatars onto backgrounds you don't control — usually white,
  where the lime and amber leaflets disappear.
- **Do not** add your own circular crop or ring. Networks apply their own mask;
  the tile's 106 px inset already survives a circular crop.
- If a network demands a flat single-colour avatar, use the **reversed white**
  mark on a solid Forest `#0A1512` square, not a mono mark on transparent.
- Never put the wordmark in the avatar. At 32 px in a timeline it's illegible, and
  the mark alone is the point of having a mark.

### Profile banner / header

- **Background**: Forest `#0A1512`, or the app-tile gradient `#103F35` → `#0A1512`
  on the 0,0 → 1,1 diagonal. Never a photograph — the palette is mid-tone and
  loses against imagery.
- **Content**: the horizontal lockup (reversed white mark + white `Fernary`
  wordmark) plus the tagline in Google Sans 400, and nothing else. No feature lists, no
  screenshots, no badges.
- **Safe area**: keep everything inside the middle 60% horizontally and the top
  70% vertically. Networks crop banners differently per device and overlay the
  avatar in the lower left.
- One optional accent: a single frond, scaled large, cropped off one edge at
  ~8–12% opacity. One only, and never behind text.

### Posting

Voice from [§9](#9-voice) applies unchanged: calm, plain, specific. Screenshots
use the **dark theme** — it's the default and the one people recognise. Show real
runs with real node names; never mock up a workflow that the product can't
actually execute. Sentence case in captions. No emoji in headline claims.

---

## 12. Footer specification

The footer is the last thing a visitor reads and the first place they look for
proof the company is real. It should be quiet, complete, and identical on every
page.

### Anatomy

Four blocks, top to bottom, inside `mx-auto max-w-6xl px-6`, with a `1px`
`--color-border` hairline above the whole thing:

```
┌─ hairline: 1px --color-border ──────────────────────────────────┐
│                                                                 │
│  [mark] Fernary            Product      Company      Legal      │
│  The automation system     Features     About        Privacy    │
│  for AI you can            Pricing      Blog         Terms      │
│  actually leave running.   Docs         Contact      Security   │
│  [x] [ig] [in]             Changelog                            │
│                                                                 │
├─ hairline ──────────────────────────────────────────────────────┤
│  © 2026 Fernary                                    fernary.com  │
└─────────────────────────────────────────────────────────────────┘
```

**1. Brand column** — spans 4 of 12 columns (link columns take 8, split 3-up).

- Horizontal lockup: mark at **20 px** + `Fernary` in Google Sans 600, 14 px.
- The tagline beneath it, at Caption size (12–13 px) in `--color-muted`, wrapped
  to at most three lines. This is the one place the tagline appears on every page,
  so it must be the canonical one: *"The automation system for AI you can actually
  leave running."*
- The social row sits at the bottom of this column.

**2. Link columns** — three of them, in this order and no other:

| Column | Contains | Notes |
|---|---|---|
| **Product** | Features, Pricing, Docs, Changelog | What someone evaluating buys. |
| **Company** | About, Blog, Contact | What someone deciding whether to trust us reads. |
| **Legal** | Privacy, Terms, Security | Required by app stores, payment processors, and enterprise procurement. |

- Column heading: Caption size, Google Sans 500, `--color-text`. Not a link.
- Links: Caption size, Google Sans 400, `--color-muted`, → `--color-text` on hover,
  underline on hover only. `gap-3` between links, `gap-8` between columns.
- **Only list pages that exist.** A 404 in the footer costs more trust than a
  missing link. *Privacy, Terms, and Security pages do not exist yet — omit the
  Legal column entirely until they do, rather than shipping dead links or
  "coming soon".* Same for Blog and Changelog.

**3. Social row** — icon-only links, 16 px glyphs in `--color-muted`, `gap-4`,
each in a **24 × 24 px minimum** hit target (see [§8](#8-accessibility)). Order:
X, Instagram, LinkedIn.

**4. Bottom bar** — separated by a second hairline, `py-6`:

- Left: `© 2026 Fernary` in Caption size, `--color-subtle`. The year is the
  founding year and does not auto-increment to a range unless legal asks.
- Right: `fernary.com` in Caption size, `--color-subtle`.
- Nothing else. No language picker, no "made with", no status badge.

### Spacing

- Footer padding: `py-16` when it carries link columns, `py-8` for the minimal
  single-row variant.
- Below `md`: stack all four columns, `gap-10` between them, and move the social
  row above the bottom bar.

### Accessibility requirements

These are requirements, not suggestions — the footer is the densest cluster of
links on the site and the most likely to be navigated by keyboard.

- **Every icon-only link needs an `aria-label`** naming the destination:
  `aria-label="Fernary on X"`, not `aria-label="X"` and never nothing. A screen
  reader otherwise announces the URL or "link".
- **External links** (socials, docs on another host) carry
  `rel="noopener noreferrer"`. `noopener` stops the opened page reaching back into
  `window.opener`; `noreferrer` stops leaking the referring URL. If a link opens a
  new tab (`target="_blank"`), say so in the accessible name or with a visible
  icon — an unannounced new tab strands keyboard users.
- Wrap the whole thing in `<footer>`, and each link column in a `<nav>` with an
  `aria-label` (`aria-label="Product"`) so the columns are distinguishable in a
  landmark list.
- Link text must make sense out of context: `Pricing`, not `Learn more`.
- Footer links are `--color-muted` (7.3:1 dark / 8.4:1 light) — do not go dimmer
  to make the footer "quieter". Use size and spacing for that, not contrast.

### Current state *(provisional)*

`src/pages/LandingPage.tsx` ships a minimal single-row footer: lockup on the left,
one line of copy on the right. Two things to fix when it's next touched — the copy
is an old tagline (*"Automation for everyone — not just engineers."*) rather than
the canonical one, and there is no `©` line or domain. The full four-block spec
above is the target once Product/Company pages exist.

---

## 13. Asset index

| Asset | Path | What it is | Use it for |
|---|---|---|---|
| Mark component | `src/components/FloweIcon.tsx` | React SVG, 100 × 100 viewBox, `size` / `className` / `mono` props. Geometry source of truth. | Everywhere in the app and on marketing pages. |
| Favicon | `public/favicon.svg` | Transparent full-colour frond, 100 × 100. Referenced from `index.html`. | Browser tab only. |
| App tile | `public/app-icon.svg` | 512 × 512, radius 115, frond on `#103F35` → `#0A1512`. | PWA / touch icon, social avatars, app stores, anywhere the background is unknown. |
| Design tokens | `src/index.css` | `@theme` palette, fonts, motion, radii, plus the light/dark token sets and `.micro`. | The authority for every colour, font, duration, and radius. |
| Brand deck | `brand/fernary-brand.html` | Self-contained one-page HTML presentation of the identity. | Sharing the brand with someone who won't read Markdown. |
| This document | `BRAND.md` | The written guidelines. | Briefing a designer or contractor. |

**Notes for whoever picks this up:**

- The React component is still exported as **`FloweIcon`**, from the product's
  pre-rename name (Flowe → Fernary). Every call site imports that identifier, so
  it was left alone deliberately; the file's header comment records why. Don't
  rename it casually — and don't assume "Flowe" appearing in code means the brand
  is unsettled.
- The three SVG sources each contain their own copy of the leaflet path. If the
  geometry changes, all three change together, or the tab icon and the in-app mark
  will drift apart.
- **Not yet built** *(provisional)*: `apple-touch-icon` / web-app-manifest entries
  in `index.html` (the app tile exists but nothing references it); raster PNG
  exports of the tile; OG / social share images; the horizontal and stacked lockups
  as standalone files (they're currently only composed in JSX); Privacy, Terms, and
  Security pages.
- **Unreconciled**: brand amber is `#F5A524` while the UI's waiting/hold token is
  `#F5A623` — one digit apart, visually identical, almost certainly an accident.
  Someone should pick one.

---

*Questions this document doesn't answer should be resolved in favour of the
quieter option, and then written down here.*
