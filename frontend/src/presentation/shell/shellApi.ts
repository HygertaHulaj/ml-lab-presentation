import { inject, onBeforeUnmount, type InjectionKey, type Ref } from 'vue'

/** Content that opens over the current step, inside the presentation (an activity or a 3D lesson). */
export interface Embed { kind: 'activity' | 'lesson'; id: string; label: string }
/** Provided by the embed layer: embedded content calls it instead of navigating away. */
export const EMBED_CLOSE: InjectionKey<() => void> = Symbol('embed-close')

export interface ShellApi {
  /** fade the ambient data field (0..1) */
  setFieldAlpha(a: number, seconds?: number): void
  /** canvas above everything, used by full-screen transitions (pixel dissolve) */
  overlayCanvas: Ref<HTMLCanvasElement | null>
  /** hide the shell chrome while a section shows its own controls (e.g. the film) */
  immersive: Ref<boolean>
  next(): void
  prev(): void
  go(section: string, step?: number): void
  /** open an activity or lesson over the current step; closing returns to the same step */
  openEmbed(e: Embed): void
  embed: Ref<Embed | null>
  /** register a key handler that runs before the shell's; return true when handled */
  onKey(fn: (e: KeyboardEvent) => boolean): () => void
}

export const SHELL: InjectionKey<ShellApi> = Symbol('presentation-shell')

export function useShell(): ShellApi {
  const s = inject(SHELL)
  if (!s) throw new Error('useShell() must be used inside PresentationShell')
  return s
}

/** Section-scoped key handler, removed on unmount. */
export function useSectionKeys(fn: (e: KeyboardEvent) => boolean) {
  const off = useShell().onKey(fn)
  onBeforeUnmount(off)
}
