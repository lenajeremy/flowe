// Composites the social banners: generated fern artwork + the real lockup.
//
//   node brand/export-banners.mjs brand/exports
//
// The artwork (brand/banner-art-source.png) was generated with OpenAI
// gpt-image-2. The logo and every glyph are composited here from the shipped
// vector and the shipped font — an image model draws neither a wordmark nor
// lettering reliably, and a mangled logo is worse than no banner.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const chromium = await (async () => {
  const tryImport = async (spec) => {
    try { const m = await import(spec); return m.chromium ?? m.default?.chromium ?? null } catch { return null }
  };
  const specs = ['playwright', 'playwright-core'];
  try {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    specs.push(`${root}/playwright/index.js`, `${root}/playwright-core/index.js`);
  } catch {}
  for (const s of specs) { const c = await tryImport(s); if (c) return c }
  console.error('Needs playwright: npm i -g playwright && npx playwright install chromium');
  process.exit(1);
})();

const ART  = path.resolve('brand/banner-art-source.png');
const LOCK = path.resolve('brand/exports/fernary-lockup-horizontal-white.svg');
const FONT = path.resolve('node_modules/@fontsource/google-sans/files/google-sans-latin-400-normal.woff2');
for (const f of [ART, LOCK, FONT]) {
  if (!fs.existsSync(f)) { console.error(`Missing ${f}`); process.exit(1) }
}
const artB64  = fs.readFileSync(ART).toString('base64');
const fontB64 = fs.readFileSync(FONT).toString('base64');
const lockSvg = fs.readFileSync(LOCK, 'utf8').replace(/^<svg /, '<svg preserveAspectRatio="xMidYMid meet" ');

const TAGLINE = 'The automation system for AI you can actually leave running.';

// objectPosition picks the crop band out of the 1536x1024 source. The fronds sit
// low-left and low-right; the calm space is upper-right, so each crop keeps the
// frond curls and leaves the type somewhere quiet.
// Every target keeps the lockup clear of the foliage. BRAND.md §3 forbids the
// full-colour mark on busy photography — its mid greens and amber disappear into
// leaves — so the type only ever sits in the calm dark half of the frame. The
// fronds occupy roughly the left 45% and the bottom-right corner of the source,
// which is why all three are right-weighted rather than centred.
const TARGETS = [
  { name:'x-header',  w:1500, h:500,  pos:'50% 42%', lockW:0.38, align:'flex-end',
    // X also overlays the avatar bottom-left and trims banner edges on some
    // clients, so this gets the most generous right margin of the three.
    padR:0.10, tagline:false },
  { name:'og',        w:1200, h:630,  pos:'50% 46%', lockW:0.44, align:'flex-end',
    padR:0.08, tagline:true },
  { name:'linkedin',  w:1584, h:396,  pos:'50% 44%', lockW:0.32, align:'flex-end',
    padR:0.08, tagline:false },
];

(async () => {
  const out = process.argv[2];
  if (!out) { console.error('usage: node brand/export-banners.mjs <output-dir>'); process.exit(1) }
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();

  for (const t of TARGETS) {
    const ctx = await b.newContext({ viewport:{ width:t.w, height:t.h }, deviceScaleFactor:2 });
    const p = await ctx.newPage();
    await p.setContent(`<!doctype html><meta charset="utf-8"><style>
      @font-face{font-family:'GS';src:url(data:font/woff2;base64,${fontB64}) format('woff2');font-weight:400}
      html,body{margin:0;padding:0;width:${t.w}px;height:${t.h}px;overflow:hidden}
      #bg{position:absolute;inset:0;background-image:url(data:image/png;base64,${artB64});
          background-size:cover;background-position:${t.pos}}
      /* A soft scrim only where the type goes, so the lockup keeps contrast if
         the crop lands a bright frond behind it. Feathered, never a hard band. */
      #scrim{position:absolute;inset:0;background:
        radial-gradient(120% 90% at 78% 50%, rgba(10,21,18,.55) 0%, rgba(10,21,18,0) 60%)}
      #stack{position:absolute;inset:0;display:flex;flex-direction:column;
        justify-content:center;align-items:${t.align};gap:${Math.round(t.h*0.045)}px;
        padding:0 ${Math.round(t.w*t.padR)}px}
      #lock{width:${Math.round(t.w*t.lockW)}px;display:block}
      #lock svg{width:100%;height:auto;display:block}
      #tag{font-family:'GS';font-weight:400;font-size:${Math.round(t.h*0.038)}px;
        color:rgba(255,255,255,.62);letter-spacing:.005em;text-align:center;max-width:78%}
    </style>
    <div id="bg"></div><div id="scrim"></div>
    <div id="stack"><div id="lock">${lockSvg}</div>
      ${t.tagline ? `<div id="tag">${TAGLINE}</div>` : ''}</div>`);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(400);
    const file = `fernary-banner-${t.name}-${t.w}x${t.h}.png`;
    await p.screenshot({ path:`${out}/${file}` });
    await ctx.close();
    const kb = (fs.statSync(`${out}/${file}`).size/1024).toFixed(0);
    console.log(`  ${file.padEnd(42)} ${t.w*2}x${t.h*2} (@2x)  ${kb} KB`);
  }
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1) });
