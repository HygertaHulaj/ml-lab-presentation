/**
 * A reversible animation clock: one number p (0..1) tweened by GSAP. Components draw from p, so play, pause,
 * replay and scrub always agree. Reduced motion jumps to the end state.
 */
import { onBeforeUnmount, reactive, ref } from 'vue'
import { gsap } from 'gsap'

export function useProgress(seconds: number, reduced: () => boolean) {
  const prog = reactive({ p: 0 })
  const playing = ref(false)
  let tween: gsap.core.Tween | null = null
  const kill = () => { tween?.kill(); tween = null }
  function play(from?: number) {
    kill()
    if (from !== undefined) prog.p = from
    if (reduced()) { prog.p = 1; playing.value = false; return }
    if (prog.p >= 1) prog.p = 0
    playing.value = true
    tween = gsap.to(prog, { p: 1, duration: seconds * (1 - prog.p), ease: 'none', onComplete: () => { playing.value = false } })
  }
  function pause() { kill(); playing.value = false }
  function toggle() { if (playing.value) pause(); else play() }
  function seek(p: number) { pause(); prog.p = Math.min(1, Math.max(0, p)) }
  /** → handling: finish a running animation first; returns true when it consumed the key */
  function finish(): boolean { if (prog.p < 1) { seek(1); return true } return false }
  onBeforeUnmount(kill)
  return { prog, playing, play, pause, toggle, seek, finish }
}
