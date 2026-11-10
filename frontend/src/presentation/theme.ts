/**
 * Presentation themes (docs/REDESIGN_PROPOSAL.html, palette B "Warm Lab", chosen 6 Nov 2026) and the
 * "Lecture Hall Light" backup for bright rooms. Every colour in the presentation is a CSS custom property holding an
 * RGB triple, used as `rgb(var(--c-data))` or `rgba(var(--c-data), .4)`, so switching theme is instant and canvases
 * can read the same values (`cssRGB`). Colours come from the film: Noé's scrubs, the desk lamp, the lab coat.
 */
export type ThemeName = 'warm' | 'light'
export type Token = 'ground' | 'ground2' | 'surface' | 'surface2' | 'text' | 'strong' | 'soft' | 'dim' | 'faint'
  | 'data' | 'dataSoft' | 'compute' | 'feature' | 'human' | 'coral' | 'ok' | 'warn' | 'ink' | 'pink'

type Palette = Record<Token, string>
export const PALETTES: Record<ThemeName, Palette> = {
  warm: {
    ground: '#0c1622', ground2: '#081018', surface: '#152a35', surface2: '#10222c',
    text: '#f3efe8', strong: '#fffaf3', soft: '#d6dedd', dim: '#b0bcbf', faint: '#849397',
    data: '#3fb6c4', dataSoft: '#8fdde6', compute: '#5b9fd8', feature: '#9b8cf0', human: '#e8a65a', coral: '#e88b6b',
    ok: '#8fd3a8', warn: '#ea7676', ink: '#081018', pink: '#e88fb0',
  },
  light: {
    ground: '#f2f4f8', ground2: '#e4e9f0', surface: '#ffffff', surface2: '#f6f8fb',
    text: '#0b1630', strong: '#04070e', soft: '#2a3a55', dim: '#46556e', faint: '#5b687d',
    data: '#0b7186', dataSoft: '#0a6a7d', compute: '#2f62c8', feature: '#6b5bd8', human: '#94600a', coral: '#a84a30',
    ok: '#1e7546', warn: '#c43c3c', ink: '#ffffff', pink: '#a83d66',
  },
}

/** Each act's accent continues the film scene it follows (proposal, part 3). */
export const ACT_ACCENT: Record<string, Record<ThemeName, string>> = {
  intro: { warm: '#5b9fd8', light: '#2f62c8' },
  ai: { warm: '#e8a65a', light: '#94600a' },
  'machine-learning': { warm: '#3fb6c4', light: '#0b7186' },
  'how-learning-works': { warm: '#3fb6c4', light: '#0b7186' },
  'section-8-2': { warm: '#9b8cf0', light: '#6b5bd8' },
  'section-8-3': { warm: '#63c7b2', light: '#17705e' },
  'section-8-4': { warm: '#e88fb0', light: '#a83d66' },
  'section-8-5': { warm: '#c49af5', light: '#7a3db8' },
  'section-8-6': { warm: '#d9c35c', light: '#7d6a00' },
  research: { warm: '#6fcfe0', light: '#0b6a80' },
  ethics: { warm: '#f29b8c', light: '#a5382b' },
  lab: { warm: '#8fd3a8', light: '#1e7546' },
  movies: { warm: '#7fb8ef', light: '#22609e' },
  conclusion: { warm: '#e88b6b', light: '#a84a30' },
}

/**
 * Semantic roles (audit §5), defined once for every chart, lesson and 3D scene: observations, the model's prediction,
 * the reference/target (e.g. least squares), and errors. Used as rgb(var(--c-obs)) etc.; 3D scenes use SEMANTIC_HEX.
 */
export const SEMANTIC = { obs: 'data', pred: 'compute', ref: 'human', err: 'warn' } as const satisfies Record<string, Token>
/**
 * Iris (audit §5): a species keeps one colour everywhere it is shown with its label (journey, §8.2, rules vs learning,
 * K-Means results); clusters have their own palette, in hues no species uses, so a cluster is never read as a species.
 */
export const SPECIES_TOKEN: Record<string, Token> = { setosa: 'data', versicolor: 'ok', virginica: 'feature' }
export const CLUSTER_TOKENS: Token[] = ['pink', 'human', 'compute']
export const SPECIES_HEX: Record<string, string> = Object.fromEntries(Object.entries(SPECIES_TOKEN).map(([k, t]) => [k, PALETTES.warm[t]]))
/** K-Means allows up to 10 clusters: the first three never share a species hue */
export const CLUSTER_HEX: string[] = [...CLUSTER_TOKENS.map((t) => PALETTES.warm[t]), '#f0d264', '#f2f4f8', '#ea7676', '#7fb8ef', '#c49af5', '#d9c35c', '#8fd3a8']

/** The 3D stage is always the dark Warm Lab ground (a projector inset in both themes); these are its semantic colours. */
export const SEMANTIC_HEX = {
  obs: PALETTES.warm.data, pred: PALETTES.warm.compute, ref: PALETTES.warm.human, err: PALETTES.warm.warn,
  ground: PALETTES.warm.ground, axis: PALETTES.warm.dataSoft, surface: PALETTES.warm.coral, text: PALETTES.warm.text,
} as const

const kebab = (t: string) => t.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
export function hexToTriple(hex: string): string {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ')
}
/** CSS custom properties for a theme (+ the act accent). */
export function themeVars(theme: ThemeName, section: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [k, v] of Object.entries(PALETTES[theme])) vars[`--c-${kebab(k)}`] = hexToTriple(v)
  vars['--c-accent'] = hexToTriple((ACT_ACCENT[section] ?? ACT_ACCENT.intro)[theme])
  for (const [role, token] of Object.entries(SEMANTIC)) vars[`--c-${role}`] = hexToTriple(PALETTES[theme][token])
  return vars
}
/** Read a token from the nearest themed element, as [r, g, b] (for canvases). */
export function cssRGB(el: Element, token: string): [number, number, number] {
  const v = getComputedStyle(el).getPropertyValue(`--c-${token}`).trim()
  const parts = v.split(',').map((x) => Number(x.trim()))
  return parts.length === 3 && parts.every((n) => Number.isFinite(n)) ? (parts as [number, number, number]) : [63, 182, 196]
}
