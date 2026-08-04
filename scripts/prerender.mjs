// Injects build-time HTML for the public routes into dist/, so a crawler that
// does not run JavaScript receives the real page instead of an empty shell.
//
// Runs after both Vite builds:
//   vite build                                    → dist/           (client)
//   vite build --ssr src/entry-server.tsx         → .ssr/           (server)
//   node scripts/prerender.mjs
//
// The client still boots with createRoot and replaces this markup, so the server
// and client trees do not need to match — no hydration, nothing to mismatch.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = 'dist';
const SSR = '.ssr/entry-server.js';

const HEAD = {
  '/': null, // index.html already carries the homepage head
  '/privacy': {
    dir: 'privacy',
    title: 'Privacy Policy — Fernary',
    description:
      'How Fernary handles personal data: what it collects, the lawful bases, every processor and sub-processor it shares with, international transfers, retention periods, and how to exercise your GDPR rights.',
  },
  '/terms': {
    dir: 'terms',
    title: 'Terms of Service — Fernary',
    description:
      'The agreement governing use of Fernary: what the service does, your responsibilities for workflows that run unattended, connected accounts, acceptable use, liability, and governing law.',
  },
};

if (!fs.existsSync(SSR)) {
  console.error(`prerender: ${SSR} missing — run the --ssr build first`);
  process.exit(1);
}
const { render, ROUTES } = await import(pathToFileURL(path.resolve(SSR)).href);

const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const ROOT_RE = /(<div id="root">)([\s\S]*?)(<\/div>)/;
if (!ROOT_RE.test(shell)) {
  console.error('prerender: no <div id="root"> in dist/index.html');
  process.exit(1);
}

// Every head rewrite must fire. A formatter wrapping an attribute onto its own
// line silently defeated one of these before, leaving the homepage description on
// both legal pages.
const rewrite = (src, route, label, re, to) => {
  const out = src.replace(re, to);
  if (out === src) {
    console.error(`prerender: ${route} — "${label}" did not match; update the pattern`);
    process.exit(1);
  }
  return out;
};

for (const route of ROUTES) {
  const markup = render(route);
  if (markup.length < 500) {
    console.error(`prerender: ${route} rendered only ${markup.length} chars — refusing to ship a stub`);
    process.exit(1);
  }

  let html = shell.replace(ROOT_RE, (_m, open, _old, close) => `${open}${markup}${close}`);

  const head = HEAD[route];
  if (head) {
    html = rewrite(html, route, 'title', /<title>[\s\S]*?<\/title>/, `<title>${head.title}</title>`);
    html = rewrite(html, route, 'description', /(<meta name="description"\s+content=")[\s\S]*?(")/, `$1${head.description}$2`);
    html = rewrite(html, route, 'canonical', /(<link rel="canonical"\s+href="https:\/\/fernary\.com)\/(")/, `$1${route}$2`);
    html = rewrite(html, route, 'og:url', /(<meta property="og:url"\s+content="https:\/\/fernary\.com)\/(")/, `$1${route}$2`);
    html = rewrite(html, route, 'og:title', /(<meta property="og:title"\s+content=")[\s\S]*?(")/, `$1${head.title}$2`);
    html = rewrite(html, route, 'twitter:title', /(<meta name="twitter:title"\s+content=")[\s\S]*?(")/, `$1${head.title}$2`);
  }

  const out = head ? path.join(DIST, head.dir, 'index.html') : path.join(DIST, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`  ${route.padEnd(9)} → ${out} (${(html.length / 1024).toFixed(0)} KB, ${(markup.length / 1024).toFixed(0)} KB rendered)`);
}
