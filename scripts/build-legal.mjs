// Builds the hostable legal pages — public/privacy.html and public/terms.html —
// from the same locale strings the app shows (`legal.*` in src/locales/*.json),
// so the Terms and Privacy Policy have a single source of truth. The pages are
// plain static HTML (no JS), English first with a Spanish version at `#es`.
//
// Usage: pnpm build:legal   (also runs as part of `pnpm build`)
//
// The developer's name and contact email come from VITE_LEGAL_NAME and
// VITE_SUPPORT_EMAIL (see .env.example), read the same way Vite reads them
// for a production build. Unset, the localized `legal.fallback.*` text is used.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
]

export const DOCS = ['privacy', 'terms', 'deletion']

/**
 * Published file name per doc. `deletion` is the account-deletion page Google
 * Play requires as a web link (request deletion without the app installed).
 */
export const PAGE_FILES = { privacy: 'privacy.html', terms: 'terms.html', deletion: 'delete-account.html' }

export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Renders one locale message as HTML: text is escaped, `{name}` placeholders
 * are replaced with the (already-HTML) values in `vars`. An unknown
 * placeholder throws, so a typo can't ship as literal braces.
 */
export function renderMessage(message, vars) {
  let html = ''
  let last = 0
  for (const match of message.matchAll(/\{(\w+)\}/g)) {
    const value = vars[match[1]]
    if (value === undefined) throw new Error(`Unknown placeholder {${match[1]}} in: ${message}`)
    html += escapeHtml(message.slice(last, match.index)) + value
    last = match.index + match[0].length
  }
  return html + escapeHtml(message.slice(last))
}

/** Same shape as `toLegalBlocks` in src/lib/legalDoc.ts: paragraphs and `{ heading, body }` sections. */
export function toBlocks(items) {
  if (!Array.isArray(items)) return []
  return items.flatMap((item) => {
    if (item && typeof item === 'object' && 'heading' in item) {
      return [
        { kind: 'heading', text: item.heading },
        ...(Array.isArray(item.body) ? item.body : []).map((text) => ({ kind: 'paragraph', text })),
      ]
    }
    return [{ kind: 'paragraph', text: item }]
  })
}

/** The HTML values for `{controller}` / `{contactEmail}` in one locale. */
export function legalVars(legal, env) {
  const name = env.VITE_LEGAL_NAME?.trim()
  const email = env.VITE_SUPPORT_EMAIL?.trim()
  return {
    controller: escapeHtml(name || legal.fallback.controller),
    contactEmail: email
      ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`
      : escapeHtml(legal.fallback.contactEmail),
  }
}

const STYLE = `
:root {
  color-scheme: light dark;
  --bg: #ffffff;
  --text: #2c2c33;
  --heading: #111114;
  --muted: #6b6b76;
  --border: #e4e4ea;
  --accent: #4f46e5;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #121216;
    --text: #d9d9e0;
    --heading: #ffffff;
    --muted: #9a9aa6;
    --border: #2a2a32;
    --accent: #a5b4fc;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 16px/1.65 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  -webkit-text-size-adjust: 100%;
}
.wrap { max-width: 720px; margin: 0 auto; padding: 24px 16px 64px; }
nav {
  display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center;
  padding-bottom: 16px; border-bottom: 1px solid var(--border); font-size: 14px;
}
nav .brand { font-weight: 800; color: var(--heading); margin-right: auto; letter-spacing: 0.02em; }
a { color: var(--accent); overflow-wrap: anywhere; }
h1 { color: var(--heading); font-size: 28px; line-height: 1.2; margin: 32px 0 4px; }
h2 { color: var(--heading); font-size: 19px; line-height: 1.3; margin: 32px 0 8px; }
p { margin: 0 0 12px; overflow-wrap: break-word; }
.updated { color: var(--muted); font-size: 14px; margin-bottom: 24px; }
.lang-note { color: var(--muted); font-size: 14px; }
article + article { margin-top: 48px; padding-top: 8px; border-top: 1px solid var(--border); }
footer { margin-top: 48px; color: var(--muted); font-size: 13px; }
/* Only one language at a time where supported: English by default, Spanish at #es. */
@supports selector(:has(a)) {
  body:not(:has(#es:target)) #es { display: none; }
  body:has(#es:target) #en { display: none; }
  article + article { margin-top: 0; padding-top: 0; border-top: 0; }
}
`

/** One whole page (see {@link PAGE_FILES}), all locales, as an HTML string. */
export function buildLegalPage(doc, messagesByLocale, env) {
  // The footer links to the companion page: privacy ↔ terms, deletion → privacy.
  const other = doc === 'privacy' ? 'terms' : 'privacy'
  const titles = LOCALES.map(({ code }) => messagesByLocale[code].legal[doc].title)

  const articles = LOCALES.map(({ code }) => {
    const legal = messagesByLocale[code].legal
    const vars = legalVars(legal, env)
    const body = toBlocks(legal[doc].body)
      .map((b) =>
        b.kind === 'heading'
          ? `    <h2>${renderMessage(b.text, vars)}</h2>`
          : `    <p>${renderMessage(b.text, vars)}</p>`,
      )
      .join('\n')
    return [
      `  <article id="${code}" lang="${code}">`,
      `    <h1>${escapeHtml(legal[doc].title)}</h1>`,
      `    <p class="updated">${escapeHtml(legal.updated)}</p>`,
      body,
      `    <p class="lang-note"><a href="${PAGE_FILES[other]}#${code}">${escapeHtml(legal[other].title)}</a></p>`,
      `  </article>`,
    ].join('\n')
  }).join('\n')

  const langLinks = LOCALES.map(
    ({ code, label }) =>
      `<a href="#${code}" hreflang="${code}" lang="${code}">${escapeHtml(label)}</a>`,
  ).join('\n      ')

  return `<!doctype html>
<!-- Generated by scripts/build-legal.mjs from src/locales/*.json — edit the locale files, not this page. -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WTX — ${escapeHtml(titles.join(' / '))}</title>
  <meta name="description" content="${escapeHtml(titles.join(' / '))} — WTX workout tracker">
  <style>${STYLE}</style>
</head>
<body>
<div class="wrap">
  <nav aria-label="WTX">
    <span class="brand">WTX</span>
    <span>
      ${langLinks}
    </span>
  </nav>
  <main>
${articles}
  </main>
</div>
</body>
</html>
`
}

async function main() {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const { loadEnv } = await import('vite')
  const env = { ...loadEnv(process.env.MODE || 'production', root, 'VITE_') }
  for (const key of ['VITE_LEGAL_NAME', 'VITE_SUPPORT_EMAIL']) {
    if (!env[key]?.trim())
      console.warn(`[build-legal] ${key} is not set — using the fallback wording.`)
  }

  const messagesByLocale = Object.fromEntries(
    LOCALES.map(({ code }) => [
      code,
      JSON.parse(readFileSync(`${root}src/locales/${code}.json`, 'utf-8')),
    ]),
  )

  for (const doc of DOCS) {
    const out = `${root}public/${PAGE_FILES[doc]}`
    writeFileSync(out, buildLegalPage(doc, messagesByLocale, env))
    console.log(`[build-legal] wrote public/${PAGE_FILES[doc]}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
