// Rasterises the horizontal and stacked lockups (mark + wordmark) to PNG.
//
//   node brand/export-lockups.mjs brand/exports
//
// The wordmark is Google Sans 700 at −0.02em, sentence case, read straight out of
// @fontsource so it can never drift from what the app ships.
//
// Layout is metric-driven rather than eyeballed. Measured once for Google Sans
// 700 (see CAP/DESC/ADVANCE): cap height is 0.676em, which matters because the
// mark is a tall round shape and the wordmark is not. Two consequences:
//
//   • The mark is sized against the CAP HEIGHT, not the em box or the line box.
//     At 1.3x cap it reads as the wordmark's equal; at 2x (what you get by
//     matching font-size to mark size) it swamps it.
//   • It is centred on the cap band, not sat on the baseline. Baseline-aligning
//     a circular mark leaves it floating above the word, because a circle's
//     optical centre is its middle and a letter's is nearer its baseline.
//
// Two ink colours per layout, because a transparent lockup has to commit to a
// text colour: Pine for light backgrounds, white for dark. The mark stays full
// colour in both.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const chromium = await (async () => {
  const tryImport = async (spec) => {
    try {
      const m = await import(spec);
      return m.chromium ?? m.default?.chromium ?? null;
    } catch { return null }
  };
  const specs = ['playwright', 'playwright-core'];
  try {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    specs.push(`${root}/playwright/index.js`, `${root}/playwright-core/index.js`);
  } catch { /* local specs may still resolve */ }
  for (const spec of specs) { const c = await tryImport(spec); if (c) return c }
  console.error('Needs playwright: npm i -g playwright && npx playwright install chromium');
  process.exit(1);
})();

const LEAF='M50 50 C 37 47, 30 36, 32 24 C 33 17, 39 12, 44 16 C 47 18, 48 21, 50 24 C 52 21, 53 18, 56 16 C 61 12, 67 17, 68 24 C 70 36, 63 47, 50 50 Z';
const STOPS=[['#9AE06A','#68C63E'],['#22CE8E','#0FA36F'],['#15B8B2','#0A8E96'],['#FFC94E','#F5A524']];

// Google Sans 700, per em. Measured with canvas actualBoundingBox metrics.
const CAP = 0.676, DESC = 0.206, ADVANCE = 3.4985; // 'Fernary' at -0.02em tracking
// The mark's ink fills the middle 85.07% of its viewBox; 7.46% slack per side.
const INK_FRAC = 0.8507, SLACK = 0.0746;

const F = 200;                        // wordmark font size, px — the base unit
const cap = CAP * F;

// The two layouts want different mark-to-cap ratios. Side by side the mark is
// competing with the whole width of the word, so 1.3x cap makes them equals.
// Stacked, the mark is alone on its line with ~700px of wordmark beneath it, and
// the same 1.3x reads undersized — it needs 1.75x to hold the top of the stack.
const H_MARK_INK = 1.30 * cap;
const V_MARK_INK = 1.75 * cap;
const box = (ink) => ink / INK_FRAC;
const gap = 0.30 * H_MARK_INK;        // optical gap, ink edge → 'F' stem
const PAD = Math.round(0.06 * H_MARK_INK); // a hair of bleed so nothing clips

const INK = { pine: '#0B5D4E', white: '#ffffff' };

const FONT = path.resolve('node_modules/@fontsource/google-sans/files/google-sans-latin-700-normal.woff2');
if (!fs.existsSync(FONT)) { console.error(`Missing ${FONT} — run pnpm install first.`); process.exit(1) }
const fontB64 = fs.readFileSync(FONT).toString('base64');

const defs = () => `<defs>
  <style>@font-face{font-family:'GS';src:url(data:font/woff2;base64,${fontB64}) format('woff2');font-weight:700}</style>
  ${STOPS.map(([a,b],i)=>`<linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`).join('')}
</defs>`;

const frond = (x, y, box) => `<g transform="translate(${x} ${y}) scale(${box/100})">
  ${STOPS.map((_,i)=>`<g transform="rotate(${i*90} 50 50)"><g transform="rotate(13 50 50)"><path d="${LEAF}" transform="translate(0 -4)" fill="url(#g${i})"/></g></g>`).join('')}
</g>`;

const word = (x, y, ink, anchor='start') =>
  `<text x="${x}" y="${y}" font-family="GS" font-weight="700" font-size="${F}"` +
  ` letter-spacing="${-0.02*F}" fill="${ink}" text-anchor="${anchor}">Fernary</text>`;

function horizontal(ink) {
  const markBox = box(H_MARK_INK);
  const textX = markBox - SLACK * markBox + gap;   // ink right edge + optical gap
  const w = textX + ADVANCE * F + PAD * 2;
  // Mark ink centred on the cap band: its centre sits cap/2 above the baseline.
  const baseline = Math.max(markBox / 2 + cap / 2, cap) + PAD;
  const markY = baseline - cap / 2 - markBox / 2;
  const h = Math.max(markY + markBox, baseline + DESC * F) + PAD;
  return { w, h, body: frond(PAD, markY, markBox) + word(textX + PAD, baseline, ink) };
}

function stacked(ink) {
  const markBox = box(V_MARK_INK);
  const wordW = ADVANCE * F;
  const w = Math.max(markBox, wordW) + PAD * 2;
  const gapV = 0.20 * V_MARK_INK;
  const markY = PAD;
  // Measure the gap from the ink's bottom, not the box's — the viewBox slack
  // would otherwise read as extra space and the stack would look adrift.
  const baseline = markY + markBox - SLACK * markBox + gapV + cap;
  const h = baseline + DESC * F + PAD;
  return { w, h, body: frond((w - markBox) / 2, markY, markBox) + word(w / 2, baseline, ink, 'middle') };
}

(async () => {
  const out = process.argv[2];
  if (!out) { console.error('usage: node brand/export-lockups.mjs <output-dir>'); process.exit(1) }
  fs.mkdirSync(out, { recursive: true });

  const b = await chromium.launch();
  for (const [name, build] of [['horizontal', horizontal], ['stacked', stacked]]) {
    for (const [tone, ink] of Object.entries(INK)) {
      const { w, h, body } = build(ink);
      const W = Math.ceil(w), H = Math.ceil(h);
      const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg">${defs()}${body}</svg>`;
      const ctx = await b.newContext({ viewport:{ width:W, height:H }, deviceScaleFactor:2 });
      const p = await ctx.newPage();
      await p.setContent(`<style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style>${svg}`);
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(300);
      const file = `fernary-lockup-${name}-${tone}.png`;
      await p.screenshot({ path:`${out}/${file}`, omitBackground:true });
      // Ship the vector too — a lockup that can only be had as a raster gets
      // re-typeset by whoever needs it bigger, which is how wordmarks drift.
      fs.writeFileSync(`${out}/fernary-lockup-${name}-${tone}.svg`, svg);
      await ctx.close();
      const kb = (fs.statSync(`${out}/${file}`).size/1024).toFixed(0);
      console.log(`  ${file.padEnd(40)} ${W*2}x${H*2}  ${kb} KB  (+ .svg)`);
    }
  }
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1) });
