// Rasterises every sanctioned logo variant to 1024x1024 PNG.
//
//   node brand/export-logos.mjs brand/exports
//
// Re-run this whenever LEAF or STOPS change in src/components/FloweIcon.tsx —
// the PNGs are derived artwork, and BRAND.md treats that component as the
// geometry source of truth.
//
// Playwright is not a project dependency — this is a once-in-a-while brand
// chore, not part of the build — so resolve it locally if present and fall back
// to a global install. ESM ignores NODE_PATH, hence doing this by hand.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const chromium = await (async () => {
  const tryImport = async (spec) => {
    try {
      const m = await import(spec);
      // A module can resolve yet not expose chromium — keep looking if so,
      // otherwise the failure surfaces later as "cannot read 'launch'".
      return m.chromium ?? m.default?.chromium ?? null;
    } catch { return null }
  };
  const specs = ['playwright', 'playwright-core'];
  try {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    specs.push(`${root}/playwright/index.js`, `${root}/playwright-core/index.js`);
  } catch { /* no global npm — the local specs may still work */ }

  for (const spec of specs) {
    const c = await tryImport(spec);
    if (c) return c;
  }
  console.error('Needs playwright. Either `pnpm add -D playwright` here, or install it globally:\n' +
                '  npm i -g playwright && npx playwright install chromium');
  process.exit(1);
})();

// Geometry mirrored from src/components/FloweIcon.tsx — the single source of
// truth for the mark. If LEAF or STOPS change there, re-run this.
const LEAF='M50 50 C 37 47, 30 36, 32 24 C 33 17, 39 12, 44 16 C 47 18, 48 21, 50 24 C 52 21, 53 18, 56 16 C 61 12, 67 17, 68 24 C 70 36, 63 47, 50 50 Z';
const STOPS=[['#9AE06A','#68C63E'],['#22CE8E','#0FA36F'],['#15B8B2','#0A8E96'],['#FFC94E','#F5A524']];
const S = 1024;

const leaflets = (fill) => STOPS.map((_,i)=>
  `<g transform="rotate(${i*90} 50 50)"><g transform="rotate(13 50 50)">`+
  `<path d="${LEAF}" transform="translate(0 -4)" fill="${typeof fill==='function'?fill(i):fill}"/>`+
  `</g></g>`).join('');

const gradients = () => STOPS.map(([a,b],i)=>
  `<linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1">`+
  `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`).join('');

const mark = (body, defs='') =>
  `<svg width="${S}" height="${S}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">`+
  (defs?`<defs>${defs}</defs>`:'')+body+`</svg>`;

const VARIANTS = [
  { file:'fernary-mark-full-colour-1024.png',
    svg: mark(leaflets(i=>`url(#g${i})`), gradients()) },
  { file:'fernary-mark-monochrome-pine-1024.png',
    svg: mark(leaflets('#0B5D4E')) },
  { file:'fernary-mark-reversed-white-1024.png',
    svg: mark(leaflets('#ffffff')) },
  // App tile: the shipped 512 artwork scaled ×2. Corners stay transparent
  // (rx 115 → 230 at 1024) because platforms mask icons themselves.
  { file:'fernary-app-tile-1024.png',
    svg: `<svg width="${S}" height="${S}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">`+
      `<defs><linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">`+
      `<stop offset="0" stop-color="#103F35"/><stop offset="1" stop-color="#0A1512"/></linearGradient>`+
      gradients()+`</defs>`+
      `<rect width="512" height="512" rx="115" fill="url(#tile)"/>`+
      `<g transform="translate(106 106) scale(3)">${leaflets(i=>`url(#g${i})`)}</g></svg>` },
];

(async () => {
  const out = process.argv[2];
  if (!out) { console.error('usage: node brand/export-logos.mjs <output-dir>'); process.exit(1); }
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  for (const v of VARIANTS) {
    const ctx = await b.newContext({viewport:{width:S,height:S},deviceScaleFactor:1});
    const p = await ctx.newPage();
    await p.setContent(`<style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style>${v.svg}`);
    await p.waitForTimeout(350);
    await p.screenshot({path:`${out}/${v.file}`, omitBackground:true});
    await ctx.close();
    const st = fs.statSync(`${out}/${v.file}`);
    console.log(`  ${v.file.padEnd(42)} ${(st.size/1024).toFixed(0)} KB`);
  }
  await b.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
