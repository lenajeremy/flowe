# Fernary — Brand Guidelines

*The automation system for AI you can actually leave running.*

A **fernery** is a garden where ferns are cultivated and tended. Fernary is the
software equivalent: a place where you plant a workflow once and it grows,
runs, and looks after itself while you're away. The brand should always feel
**calm, dependable, and quietly alive** — not loud, not robotic.

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
- One leaflet, duplicated at **0° / 90° / 180° / 270°**.
- Each leaflet is nudged **4 units outward** (the core gap) and spun **13°** (the lean).
- Colours run **top → right → bottom → left**: lime · emerald · teal · amber.

Source of truth: `src/components/FloweIcon.tsx` (component), `public/favicon.svg`
(flat mark), `public/app-icon.svg` (tiled app icon).

---

## 2. Logo variants — one mark, every surface

| Variant | Use it for | File / prop |
|---|---|---|
| **Full colour** | Default. Headers, marketing, favicon, app tile. | `<FloweIcon />` |
| **Monochrome** | One-colour contexts: stamps, embroidery, faxable docs, dense UI. | `<FloweIcon mono="#0B5D4E" />` |
| **Reversed (white)** | On emerald or dark photography. | `<FloweIcon mono="#ffffff" />` |
| **App tile** | PWA / touch icon / social avatar — frond on the deep-fern gradient. | `public/app-icon.svg` |
| **Favicon** | Browser tab — transparent full-colour frond. | `public/favicon.svg` |

### Lockups
- **Horizontal** — mark + `Fernary` wordmark, baseline-aligned. The default lockup.
- **Stacked** — mark above centred wordmark. For square/narrow spaces.
- **Mark only** — once the audience knows the brand (app chrome, avatars, favicons).

### Clear space & minimum size
- **Clear space** = the height of one leaflet on all sides. Nothing intrudes.
- **Minimum size**: mark **16 px** on screen, **6 mm** in print. Below that, use the
  monochrome mark — the gradients muddy at small sizes.

### Misuse — never
- Recolour the leaflets outside the palette, or make them all one hue in the *colour* logo.
- Rotate, skew, or re-order the leaflets. The symmetry is the identity.
- Add drop shadows, outlines, or bevels. The mark is flat.
- Crowd it, stretch the wordmark, or set the wordmark in another typeface.
- Place the full-colour mark on a busy photo — use the reversed/mono mark instead.

---

## 3. Colour

### The four frond hues
The logo's palette. Also used for data-viz, illustration, and accents.

| Token | Hex | Feel |
|---|---|---|
| **Fern Lime** `--fern-lime` | `#74CE45` | New growth, fresh |
| **Fern Emerald** `--fern-emerald` | `#14B886` | The primary. Trust, life |
| **Fern Teal** `--fern-teal` | `#0FA3A3` | Depth, cool calm |
| **Fern Amber** `--fern-amber` | `#F5A524` | The sun. Warmth, the human in the loop |

### Supporting greens
| Token | Hex | Use |
|---|---|---|
| **Pine** `--fern-pine` | `#0B5D4E` | Ink-green text on light brand surfaces |
| **Forest** `--fern-forest` | `#0A1512` | Near-black green for dark brand surfaces |

### UI system
The product leads with **emerald** and stays otherwise achromatic, so the
workflow canvas owns the colour.

| Role | Dark | Light |
|---|---|---|
| **Accent** (`--color-accent`) | `#16C08A` | `#0E9E6E` |
| Canvas | `#0A0A0D` | `#E9EBF1` |
| Text | `#F2F2F5` | `#191922` |
| Success / Warn / Error | `#3DD68C` · `#F5A623` · `#F4554A` | inked equivalents |

**Colour rules**
- Emerald is the interactive colour (buttons, focus, links, live handles).
- Amber is reserved for **warmth and highlights** — never for errors.
- Use all four hues *together* only in the logo and deliberate brand moments;
  everyday UI is emerald + neutrals.

---

## 4. Typography

**One family, two voices.** Fernary uses **Geist** (Vercel's geometric-humanist
sans) throughout — professional, modern, and quietly distinctive — paired with
**Geist Mono** for anything the machine says.

- **Geist** → content: headlines, body, the wordmark. Weights **400 / 500 / 600 / 700**.
- **Geist Mono** → the machine: statuses, timestamps, ids, node metadata. Weights **400 / 500**.

### The wordmark
`Fernary`, set in **Geist 700**, tracking **−0.02em**. Never re-typeset it in
another face or weight; treat it as artwork paired with the mark.

### Type scale
A restrained scale — display sizes carry personality, body stays highly legible.

| Role | Size / line-height | Weight | Tracking |
|---|---|---|---|
| Display | 60 / 1.02 | 700 | −0.03em |
| H1 | 46 / 1.05 | 700 | −0.02em |
| H2 | 34 / 1.1 | 600 | −0.02em |
| H3 | 26 / 1.2 | 600 | −0.01em |
| Title | 20 / 1.3 | 600 | −0.01em |
| Body L | 16 / 1.55 | 400 | 0 |
| Body | 14 / 1.55 | 400 | 0 |
| Caption | 12–13 / 1.4 | 500 | 0 |
| Mono / meta | 11–13 / 1.4 | 500 | 0 (Geist Mono) |

**Rules**
- Tighten tracking as type gets bigger; leave body at default.
- Sentence case for everything except the wordmark. No ALL-CAPS headlines.
- Numbers, ids, code, and status chips are **always** Geist Mono — it's the
  signal that "this is the machine talking."

---

## 5. Motion

One idea: **unfurling**. Things ease open and settle — they don't bounce or
snap. Default easing `cubic-bezier(0.23, 1, 0.32, 1)`, durations 120–240ms.
The mark may rotate slowly on load (a frond opening) but never spins fast.
Respect `prefers-reduced-motion`.

---

## 6. Voice

Calm, plain, specific. We describe what happens, not how clever it is.

- *"Runs on your schedule. Pauses for approval where it matters. Keeps going."*
- Not *"Revolutionary AI-powered hyperautomation."*

Say **"leave it running"**, **"without babysitting"**, **"every time"** — the
trust words. Errors explain and instruct; they never apologise or hype.

---

*Assets: `src/components/FloweIcon.tsx`, `public/favicon.svg`, `public/app-icon.svg`,
tokens in `src/index.css`. Deck: `brand/fernary-brand.html`.*
