<script setup lang="ts">
/**
 * Section 4 — How Machine Learning Works (DS4A §8.2–8.4). One dataset, seven stages, one continuous scene.
 * Every state comes from GET /api/v1/concepts/learning-journey (real cleaning, F-scores, split, tree, predictions,
 * confusion matrix). Controls: play/pause, previous/next stage, reset, speed, inspect (click a flower), explain.
 * → first completes a running stage animation, then moves to the next stage.
 */
import SectionBridge from '../common/SectionBridge.vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-vue-next'
import { usePresentation } from '../../store'
import { useSectionKeys, useShell } from '../../shell/shellApi'
import { presentationApi, type LearningJourney } from '../../api'
import { errorMessage } from '../../../api/client'
import JourneyScene from './JourneyScene.vue'
import { leafReveal, SPECIES_COLOR, splitReveal, STAGES } from './journey'
import { STAGE_TEXT } from './content'

const ID = 'how-learning-works'
const store = usePresentation()
const shell = useShell()
const stage = computed(() => store.stepOf(ID))
const data = ref<LearningJourney | null>(null)
const error = ref<string | null>(null)
const prog = reactive({ p: 0 })
const playing = ref(false)
const speed = ref(1)
const explain = ref(false)
const selected = ref<number | null>(null)
let tween: gsap.core.Tween | null = null

const DUR = [12, 5, 5, 6, 5, 7, 8, 6]
function play(from?: number) {
  tween?.kill()
  if (from !== undefined) prog.p = from
  if (store.reducedMotion) { prog.p = 1; playing.value = false; return }
  if (prog.p >= 1) prog.p = 0
  playing.value = true
  tween = gsap.to(prog, { p: 1, duration: (DUR[stage.value] * (1 - prog.p)) / speed.value, ease: 'none', onComplete: () => { playing.value = false } })
}
function pause() { tween?.kill(); playing.value = false }
function toggle() { if (playing.value) pause(); else play() }
function reset() { pause(); prog.p = 0 }
function scrub(e: Event) { pause(); prog.p = +(e.target as HTMLInputElement).value }
watch(speed, () => { if (playing.value) play() })
function enter() {
  pause()
  prog.p = 0
  shell.setFieldAlpha(stage.value === 0 ? 0.7 : 0.15)
  if (data.value) play(0)
}
watch(stage, enter)
onMounted(async () => {
  try { data.value = await presentationApi.learningJourney() } catch (e) { error.value = errorMessage(e) }
  enter()
})
onBeforeUnmount(() => tween?.kill())

useSectionKeys((e) => {
  const fwd = e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' '
  if (fwd && prog.p < 1 && stage.value > 0) { pause(); prog.p = 1; return true }
  const k = e.key.toLowerCase()
  if (k === 'p') { toggle(); return true }
  if (k === 'r') { play(0); return true }
  if (k === 'x') { explain.value = !explain.value; return true }
  return false
})

const text = computed(() => STAGE_TEXT[stage.value])
const pct = (v: number) => `${(v * 100).toFixed(1)} %`
const fname = (s: string) => s.replace('_cm', '').replace('_', ' ')

// side panel: feature scores
const fmax = computed(() => Math.max(...(data.value?.feature_scores.map((s) => s.f_score) ?? [1])))
const fShown = computed(() => (stage.value === 3 ? Math.min(1, prog.p / 0.5) : 1))

// side panel: tree diagram (revealed in learning order during training)
interface TNode { id: number; x: number; y: number; label: string; sub: string; leaf: boolean; color: string; reveal: number; parent?: { x: number; y: number } }
const tree = computed<TNode[]>(() => {
  const j = data.value
  if (!j) return []
  const sp = new Map(j.model.splits.map((s) => [s.node, s]))
  const lf = new Map(j.model.leaves.map((l) => [l.node, l]))
  const n = j.model.splits.length
  const amt = (fn: () => number) => (stage.value === 5 ? fn() : stage.value > 5 ? 1 : 0)
  const out: TNode[] = []
  // leaves get evenly spaced slots in order; a question sits above the middle of its children
  const nLeaves = j.model.leaves.length
  let slot = 0
  const walk = (id: number, depth: number, parent?: { x: number; y: number }): number => {
    const y = 26 + depth * 78
    const s = sp.get(id)
    if (!s) {
      const l = lf.get(id)!
      const x = ((slot++ + 0.5) / nLeaves) * 340
      out.push({ id, x, y, label: l.class, sub: Object.values(l.counts).join(' / '), leaf: true, color: SPECIES_COLOR[l.class], reveal: amt(() => leafReveal(prog.p, l.depth, n)), parent })
      return x
    }
    const node: TNode = { id, x: 0, y, label: `${fname(s.feature)} ≤ ${s.threshold}?`, sub: `${s.n} flowers`, leaf: false, color: 'rgb(var(--c-text))', reveal: amt(() => splitReveal(prog.p, s.order, n)), parent }
    out.push(node)
    const kids: TNode[] = []
    const before = out.length
    const lx = walk(s.left, depth + 1), rx = walk(s.right, depth + 1)
    node.x = (lx + rx) / 2
    for (let k = before; k < out.length; k++) if (out[k].y === y + 78) kids.push(out[k])
    kids.forEach((c) => (c.parent = { x: node.x, y }))
    return node.x
  }
  walk(0, 0)
  return out
})

// inspect
const sel = computed(() => {
  const j = data.value
  if (!j || selected.value === null) return null
  const r = j.records.find((x) => x.id === selected.value)
  if (!r) return null
  const removed = j.prepare.duplicates.some((d) => d.removed === r.id)
  const set = removed ? 'removed (duplicate)' : j.split.test_ids.includes(r.id) ? 'test (unseen)' : 'training'
  const pr = stage.value >= 6 ? j.predictions.find((x) => x.id === r.id) : undefined
  return { r, set, pr }
})
function pick(id: number) { selected.value = selected.value === id ? null : id }
watch(stage, () => { if (stage.value < 1) selected.value = null })
</script>

<template>
  <section class="lp" :data-step="stage" :data-progress="prog.p.toFixed(3)" data-testid="section-learning">
    <header class="head">
      <div class="kicker">Section 04 · How machine learning works</div>
      <nav class="chips" aria-label="Stages">
        <button v-for="(s, i) in STAGES" :key="s" :class="{ on: i === stage, done: i < stage }" :data-testid="'stage-' + s.toLowerCase()" @click="shell.go(ID, i)">
          <span>{{ i }}</span>{{ s }}
        </button>
      </nav>
      <h2>{{ text.title }}</h2>
      <p v-if="data" class="lead" data-testid="stage-lead">{{ text.lead(data) }}</p>
    </header>

    <div v-if="error" class="err" role="alert">The backend is not reachable ({{ error }}). Start it to run this demo.</div>
    <div v-else-if="data" class="body">
      <div class="stage-vis">
        <JourneyScene :data="data" :stage="stage" :p="prog.p" :selected="selected" @select="pick" />
      </div>

      <aside class="side">
        <!-- features -->
        <div v-if="stage >= 3" class="card" data-testid="feature-scores">
          <h3>How well each measurement separates the species</h3>
          <div v-for="s in data.feature_scores" :key="s.feature" class="fbar" :class="{ chosen: data.features.includes(s.feature) }">
            <span class="fname">{{ fname(s.feature) }}</span>
            <span class="track"><span :style="{ width: (s.f_score / fmax) * 100 * fShown + '%' }" /></span>
            <span class="fval">{{ s.f_score.toFixed(0) }}</span>
          </div>
        </div>
        <!-- model -->
        <div v-if="stage >= 5" class="card" data-testid="tree-diagram">
          <h3>The trained model: a decision tree</h3>
          <svg viewBox="0 0 340 200" class="tree">
            <g v-for="nd in tree" :key="nd.id" :opacity="nd.reveal">
              <line v-if="nd.parent" :x1="nd.parent.x" :y1="nd.parent.y + 14" :x2="nd.x" :y2="nd.y - 14" class="edge" />
              <rect :x="nd.x - (nd.leaf ? 50 : 78)" :y="nd.y - 16" :width="nd.leaf ? 100 : 156" height="32" rx="10" :class="nd.leaf ? 'leaf' : 'q'" :style="{ stroke: nd.color }" />
              <text :x="nd.x" :y="nd.y + 5" text-anchor="middle" class="tq" :style="{ fill: nd.color }">{{ nd.label }}</text>
              <text :x="nd.x" :y="nd.y + 30" text-anchor="middle" class="ts">{{ nd.sub }}</text>
            </g>
          </svg>
        </div>
        <!-- evaluation -->
        <div v-if="stage === 7" class="card" data-testid="evaluation">
          <h3>Accuracy</h3>
          <div class="acc"><span>training</span><b>{{ pct(data.evaluation.train_accuracy) }}</b><span>test (unseen)</span><b data-testid="test-accuracy">{{ pct(data.evaluation.test_accuracy) }}</b></div>
          <h3 class="mt">Tree depth: training vs. test</h3>
          <div class="depths">
            <div v-for="d in data.evaluation.by_depth" :key="d.depth" class="dcol" :class="{ cur: d.depth === data.model.max_depth }">
              <span class="bars"><i :style="{ height: d.train_accuracy * 100 + '%' }" class="tr" /><i :style="{ height: d.test_accuracy * 100 + '%' }" class="te" /></span>
              <small>{{ d.depth }}</small>
            </div>
          </div>
          <p class="legend"><i class="tr" /> training <i class="te" /> test · depth {{ data.model.max_depth }} shown · cross-validation on the training flowers would choose depth {{ data.evaluation.selected_depth }}</p>
        </div>
        <SectionBridge v-if="stage === 7" id="how-learning-works" />
        <!-- inspect -->
        <div v-if="sel" class="card inspect" data-testid="inspect">
          <h3>Flower #{{ sel.r.id }} <span :style="{ color: SPECIES_COLOR[sel.r.species] }">{{ stage === 6 && sel.set.startsWith('test') ? '(label hidden)' : sel.r.species }}</span></h3>
          <p class="mono">sepal {{ sel.r.sepal_length_cm }} × {{ sel.r.sepal_width_cm }} cm · petal {{ sel.r.petal_length_cm }} × {{ sel.r.petal_width_cm }} cm</p>
          <p>set: <b>{{ sel.set }}</b></p>
          <template v-if="sel.pr">
            <p class="mono path"><template v-for="(s, k) in sel.pr.path" :key="k"><span v-if="'feature' in s">{{ fname(s.feature) }} {{ s.value }} {{ s.goes === 'left' ? '≤' : '>' }} {{ s.threshold }} → </span></template><b :style="{ color: SPECIES_COLOR[sel.pr.predicted] }">{{ sel.pr.predicted }}</b></p>
            <p :class="sel.pr.correct ? 'ok' : 'bad'">{{ sel.pr.correct ? '✓ correct' : `✗ wrong: actually ${sel.pr.truth}` }}</p>
          </template>
        </div>
        <p v-else-if="stage >= 1" class="hint">Click any flower to inspect it.</p>
        <!-- explain -->
        <div v-if="explain" class="card tech" data-testid="explain">
          <h3>Technical detail</h3>
          <p>{{ text.technical(data) }}</p>
        </div>
        <p class="src">{{ text.source }} · {{ data.source }}</p>
      </aside>
    </div>

    <div v-if="data" class="player" data-testid="journey-player">
      <button class="ctl" aria-label="Previous stage (←)" @click="shell.prev()"><ChevronLeft class="ic" /></button>
      <button class="ctl main" :aria-label="playing ? 'Pause (P)' : 'Play (P)'" data-testid="journey-play" @click="toggle"><Pause v-if="playing" class="ic" /><Play v-else class="ic" /></button>
      <button class="ctl" aria-label="Next stage (→)" @click="shell.next()"><ChevronRight class="ic" /></button>
      <button class="ctl" aria-label="Reset stage" data-testid="journey-reset" @click="reset"><RotateCcw class="ic" /></button>
      <input class="scrub" type="range" min="0" max="1" step="0.001" :value="prog.p" aria-label="Stage position" data-testid="journey-scrub" @input="scrub" />
      <select v-model.number="speed" aria-label="Speed" data-testid="journey-speed"><option v-for="s in [0.5, 1, 2]" :key="s" :value="s">{{ s }}×</option></select>
      <button class="chip-btn" :class="{ on: explain }" data-testid="journey-explain" @click="explain = !explain">{{ explain ? 'Hide' : 'Show' }} explanation (X)</button>
    </div>
  </section>
</template>

<style scoped>
.lp { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 70px 4vw 84px; gap: 6px; }
.kicker { font: 600 13px 'Space Grotesk', system-ui; letter-spacing: .3em; text-transform: uppercase; color: rgb(var(--c-accent)); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 10px; }
.chips button { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; font: 500 14px 'Space Grotesk', system-ui; color: rgb(var(--c-faint)); border: 1px solid rgba(var(--c-dim), .2); }
.chips button span { font-size: 12px; opacity: .7; }
.chips button.done { color: rgb(var(--c-data-soft)); border-color: rgba(var(--c-data), .35); }
.chips button.on { color: rgb(var(--c-ink)); background: rgb(var(--c-data)); border-color: rgb(var(--c-data)); }
h2 { font: 600 clamp(26px, 2.5vw, 44px) / 1.1 'Space Grotesk', system-ui; }
.lead { max-width: 90ch; margin-top: 6px; font-size: max(clamp(15px, 1.15vw, 20px), var(--up-15, 15px)); color: rgb(var(--c-soft)); line-height: 1.45; }
.body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) clamp(300px, 26vw, 440px); gap: 2vw; }
.stage-vis { min-height: 0; display: flex; }
.side { min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-top: 10px; }
.card { padding: 14px 16px; border-radius: 14px; background: rgba(var(--c-surface), .75); border: 1px solid rgba(var(--c-data), .14); }
.card h3 { font: 600 max(14px, var(--up-14, 14px)) 'Space Grotesk', system-ui; letter-spacing: .06em; color: rgb(var(--c-soft)); margin-bottom: 10px; }
.card h3.mt { margin-top: 14px; }
.fbar { display: grid; grid-template-columns: 96px 1fr 44px; align-items: center; gap: 8px; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-faint)); margin: 5px 0; }
.fbar.chosen { color: rgb(var(--c-text)); }
.track { height: 8px; border-radius: 4px; background: rgba(var(--c-text), .08); overflow: hidden; }
.track span { display: block; height: 100%; background: rgb(var(--c-compute)); transition: width .4s; }
.fbar.chosen .track span { background: rgb(var(--c-data)); }
.fval { font: 500 max(13px, var(--up-13, 13px)) 'JetBrains Mono', Consolas, monospace; text-align: right; }
.tree { width: 100%; height: auto; }
.edge { stroke: rgba(var(--c-dim), .5); }
.q { fill: rgba(var(--c-surface), .95); }
.leaf { fill: rgba(var(--c-surface), .95); stroke-width: 2; }
.tq { font: 600 13px 'Inter', system-ui; }
.ts { font: 500 11px 'Inter', system-ui; fill: rgb(var(--c-faint)); }
.acc { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; font-size: max(15px, var(--up-15, 15px)); color: rgb(var(--c-dim)); }
.acc b { font: 600 max(20px, var(--up-20, 20px)) 'Space Grotesk', system-ui; color: rgb(var(--c-strong)); text-align: right; }
.depths { display: flex; gap: 12px; height: 90px; align-items: flex-end; }
.dcol { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
.dcol.cur small { color: rgb(var(--c-human)); font-weight: 700; }
.bars { display: flex; gap: 3px; align-items: flex-end; height: 70px; }
.bars i { width: 10px; border-radius: 2px 2px 0 0; }
i.tr { background: rgb(var(--c-feature)); } i.te { background: rgb(var(--c-ok)); }
.dcol small { font-size: max(12px, var(--up-12, 12px)); color: rgb(var(--c-faint)); }
.legend { margin-top: 8px; font-size: max(12px, var(--up-12, 12px)); color: rgb(var(--c-faint)); display: flex; align-items: center; gap: 6px; }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
.inspect p { font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-soft)); margin-top: 4px; }
.mono { font-family: 'JetBrains Mono', Consolas, monospace; font-size: max(13px, var(--up-13, 13px)) !important; }
.path { line-height: 1.6; }
.ok { color: rgb(var(--c-ok)) !important; } .bad { color: rgb(var(--c-warn)) !important; }
.tech p { font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-soft)); line-height: 1.5; }
.hint, .src { font-size: 12px; color: rgb(var(--c-faint)); }
.player { display: flex; align-items: center; gap: 6px; }
.ctl { width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; color: rgb(var(--c-text)); background: rgba(var(--c-text), .06); }
.ctl.main { background: rgba(var(--c-data), .18); }
.ctl:hover { background: rgba(var(--c-text), .12); }
.ic { width: 18px; height: 18px; }
.scrub { width: min(320px, 26vw); accent-color: rgb(var(--c-data)); margin: 0 6px; }
select { background: rgba(var(--c-text), .06); border-radius: 8px; padding: 8px; font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-text)); }
select option { background: rgb(var(--c-surface)); }
.chip-btn { margin-left: 6px; padding: 9px 14px; border-radius: 999px; border: 1px solid rgba(var(--c-text), .25); font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-text)); }
.chip-btn.on { border-color: rgb(var(--c-human)); color: rgb(var(--c-human)); }
.err { color: rgb(var(--c-human)); }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid rgb(var(--c-data)); outline-offset: 2px; }
@media (max-width: 1000px) { .body { grid-template-columns: 1fr; } .side { max-height: 30vh; } }
</style>
