import { onBeforeUnmount, onMounted, ref } from 'vue'

export type ShortcutMap = Partial<Record<'space' | 'right' | 'left' | 'f' | 'e' | 'r' | 'm' | 'p' | 'l' | '1' | '2' | '3' | 'escape', () => void>>

/** Keyboard shortcuts for lessons/presenter mode. Ignored while the user types in a form field. */
export function useLessonShortcuts(map: ShortcutMap) {
  const handler = (ev: KeyboardEvent) => {
    const el = ev.target as HTMLElement | null
    if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return
    const key = ev.key === ' ' ? 'space' : ev.key === 'ArrowRight' ? 'right' : ev.key === 'ArrowLeft' ? 'left'
      : ev.key === 'Escape' ? 'escape' : ev.key.toLowerCase()
    const fn = map[key as keyof ShortcutMap]
    if (fn) {
      ev.preventDefault()
      fn()
    }
  }
  onMounted(() => window.addEventListener('keydown', handler))
  onBeforeUnmount(() => window.removeEventListener('keydown', handler))
}

/** Reactive `prefers-reduced-motion`. */
export function usePrefersReducedMotion() {
  const reduced = ref(false)
  let mq: MediaQueryList | null = null
  const update = () => (reduced.value = !!mq?.matches)
  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    update()
    mq.addEventListener('change', update)
  })
  onBeforeUnmount(() => mq?.removeEventListener('change', update))
  return reduced
}

export async function toggleFullscreen(el: HTMLElement | null) {
  if (!document.fullscreenElement) await (el ?? document.documentElement).requestFullscreen?.()
  else await document.exitFullscreen?.()
}
