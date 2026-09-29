/**
 * The Terms / Privacy Policy bodies in the locale files (`legal.*.body`) are
 * an array whose items are either a paragraph or a `{ heading, body }`
 * section — flat paragraph arrays keep working. The same shape is rendered
 * into the hostable `public/*.html` pages by `scripts/build-legal.mjs`.
 */
export type LegalBlock = { kind: 'heading' | 'paragraph'; text: string }

/** Who publishes WTX and how to reach them — interpolated into the legal texts. */
export type LegalVars = { controller: string; contactEmail: string }

type Section<M> = { heading: M; body?: M[] }

function isSection<M>(item: unknown): item is Section<M> {
  return typeof item === 'object' && item !== null && 'heading' in item
}

/**
 * Flattens a `legal.*.body` array (as returned by vue-i18n's `tm`) into
 * headings and paragraphs, rendering each message with `render` (`rt`).
 */
export function toLegalBlocks<M>(items: unknown, render: (message: M) => string): LegalBlock[] {
  if (!Array.isArray(items)) return []
  return items.flatMap((item): LegalBlock[] => {
    if (isSection<M>(item)) {
      return [
        { kind: 'heading', text: render(item.heading) },
        ...(Array.isArray(item.body) ? item.body : []).map((p): LegalBlock => ({
          kind: 'paragraph',
          text: render(p as M),
        })),
      ]
    }
    return [{ kind: 'paragraph', text: render(item as M) }]
  })
}
