/** WCAG relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const channel = (start: number) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

const WHITE = '#ffffff'
const DARK = '#111214'

/**
 * The ink to put on an accent fill: white where it is readable (red, blue,
 * violet…), dark on the light accents (amber, lime, cyan, emerald). White
 * needs at least 3:1 against the fill — the bar for large, bold UI text.
 */
export function inkOnAccent(accent: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(accent)) return WHITE
  const whiteContrast = 1.05 / (luminance(accent) + 0.05)
  return whiteContrast >= 3 ? WHITE : DARK
}
