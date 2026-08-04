// Prerenders /privacy and /terms into real HTML at build time.
//
// This is a client-rendered SPA behind a catch-all rewrite, so every URL served
// the same empty shell: `curl https://fernary.com/privacy` returned 959 bytes
// with no policy in it. That breaks anything that reads HTML rather than running
// JavaScript — and Google's OAuth verification reads the privacy policy URL.
//
// It renders with the same react-markdown + remark-gfm pipeline LegalPage uses,
// from the same files in legal/, so the static HTML and the React route cannot
// disagree. React then mounts over it and renders the identical content.
//
// Output is dist/privacy/index.html and dist/terms/index.html. Vercel matches the
// filesystem before applying rewrites, so those win over the SPA catch-all.
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const DIST = 'dist';
const PAGES = [
  {
    route: 'privacy',
    src: 'legal/privacy-policy.md',
    title: 'Privacy Policy — Fernary',
    description:
      'How Fernary handles personal data: what it collects, the lawful bases, every processor and sub-processor it shares with, international transfers, retention periods, and how to exercise your GDPR rights.',
  },
  {
    route: 'terms',
    src: 'legal/terms-of-service.md',
    title: 'Terms of Service — Fernary',
    description:
      'The agreement governing use of Fernary: what the service does, your responsibilities for workflows that run unattended, connected accounts, acceptable use, liability, and governing law.',
  },
];

const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

// The homepage shell carries a homepage-specific fallback inside #root plus
// homepage meta. Both have to be swapped per route or /privacy would advertise
// the product instead of stating the policy.
// Lazy match to the first </div>. Safe because the fallback contains no nested
// divs — asserted below, so this fails loudly rather than truncating the page if
// someone adds one. NB: Vite hoists the module script into <head> during build,
// so #root is followed by </body>, not by a <script>.
const ROOT_RE = /(<div id="root">)([\s\S]*?)(<\/div>)/;
const found = shell.match(ROOT_RE);
if (!found) {
  console.error('prerender-legal: could not find the #root block in dist/index.html');
  process.exit(1);
}
if (found[2].includes('<div')) {
  console.error('prerender-legal: the #root fallback now contains a nested <div>; ' +
    'the lazy regex would truncate the page. Match the closing tag explicitly.');
  process.exit(1);
}

let wrote = 0;
for (const page of PAGES) {
  const md = fs.readFileSync(page.src, 'utf8');
  const body = renderToStaticMarkup(
    React.createElement(Markdown, { remarkPlugins: [remarkGfm] }, md),
  );

  let html = shell
    // .legal-prose is the same class the React page uses, so the prerendered
    // markup picks up the identical stylesheet already in the bundle.
    .replace(ROOT_RE, (_m, open, _old, close) =>
      `${open}<main class="legal-prose boot-legal">${body}</main>${close}`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${page.title}</title>`)
    .replace(/(<meta name="description" content=")[\s\S]*?(" \/>)/, `$1${page.description}$2`)
    .replace(/(<link rel="canonical" href="https:\/\/fernary\.com)\/(" \/>)/, `$1/${page.route}$2`)
    .replace(/(<meta property="og:url" content="https:\/\/fernary\.com)\/(" \/>)/, `$1/${page.route}$2`)
    .replace(/(<meta property="og:title" content=")[\s\S]*?(" \/>)/, `$1${page.title}$2`)
    .replace(/(<meta name="twitter:title" content=")[\s\S]*?(" \/>)/, `$1${page.title}$2`);

  // Give the prerendered prose a readable measure before the bundle's CSS
  // arrives, matching what .legal-prose does once it does.
  html = html.replace('</head>',
    `<style>.boot-legal{max-width:44rem;margin:0 auto;padding:3.5rem 1.5rem;` +
    `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;` +
    `color:#c7d2cd;line-height:1.7}.boot-legal h1,.boot-legal h2,.boot-legal h3{color:#fff}` +
    `.boot-legal a{color:#3dd68c}</style></head>`);

  const dir = path.join(DIST, page.route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  console.log(`  /${page.route} → ${path.join(dir, 'index.html')} (${(html.length / 1024).toFixed(0)} KB)`);
  wrote++;
}

if (wrote !== PAGES.length) {
  console.error('prerender-legal: not all pages were written');
  process.exit(1);
}
