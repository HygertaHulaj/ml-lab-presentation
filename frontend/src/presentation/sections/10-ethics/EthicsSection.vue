<script setup lang="ts">
/**
 * Section 10 — DS4A Chapter 8 "Ethics in Practice: Social Justice in Data Science" (book pp. 394–395), in source
 * order: challenges (bias, facial recognition, policing), mitigation, then benefits (college admissions). The mechanism
 * is measured by the backend on an analogy (penguins, `GET /concepts/ethics`), never on face data. One cited fact
 * from outside the book (Gender Shades, 2018) and our own discussion questions are labelled as such.
 * → first advances the current module's or step's own reveals, then moves on.
 */
import SectionBridge from '../common/SectionBridge.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { usePresentation } from '../../store'
import { useSectionKeys, useShell } from '../../shell/shellApi'
import { presentationApi, type Ethics } from '../../api'
import { errorMessage } from '../../../api/client'
import RepresentationDemo from './RepresentationDemo.vue'
import MitigationDemo from './MitigationDemo.vue'
import { BENEFITS, BIASES, DECISIONS, DISCUSSION, EVERYDAY, GENDER_SHADES, POLICE_CHAIN, SOCIAL_JUSTICE, SUMMARY } from './content'

const ID = 'ethics'
const store = usePresentation()
const shell = useShell()
const step = computed(() => store.stepOf(ID))
const mod = ref<{ advance: () => boolean } | null>(null)
const ev = ref<Ethics | null>(null)
const error = ref<string | null>(null)
const reveal = ref(0)
const REVEALS: Record<number, number> = { 1: 1, 2: 1, 4: POLICE_CHAIN.length - 1, 7: 1 }
watch(step, (s) => { reveal.value = 0; shell.setFieldAlpha(s === 0 || s === 9 ? 0.8 : 0.12) }, { immediate: true })
onMounted(async () => { try { ev.value = await presentationApi.ethics() } catch (e) { error.value = errorMessage(e) } })
useSectionKeys((e) => {
  if (!(e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ')) return false
  if (mod.value?.advance()) return true
  if (reveal.value < (REVEALS[step.value] ?? 0)) { reveal.value++; return true }
  return false
})

const HEAD = [
  { page: 'p. 394', q: 'Who decides, when an algorithm decides?', title: 'Ethics in practice: social justice in data science' },
  { page: 'p. 394', q: 'Where can bias enter?', title: 'The challenges of AI in social justice' },
  { page: 'p. 394', q: 'Does facial recognition work equally well for everyone?', title: 'Facial recognition (Fig. 8.28)' },
  { page: 'p. 394', q: 'Why would a model fail one group?', title: 'The mechanism, measured' },
  { page: 'p. 394', q: 'What happens when the police use it?', title: 'Facial recognition and law enforcement (Fig. 8.29)' },
  { page: 'p. 394', q: 'Can the bias be reduced?', title: 'Mitigating bias' },
  { page: 'p. 395', q: 'Can AI also make decisions fairer?', title: 'The benefits of AI to social justice' },
  { page: 'p. 395', q: 'Can AI reduce bias in college admissions?', title: 'College admissions' },
  { page: 'discussion', q: 'What do you think?', title: 'Two sides, and questions for discussion' },
  { page: 'pp. 394–395', q: 'What did this teach us?', title: 'Summary' },
]
const head = computed(() => HEAD[step.value])
const atFive = computed(() => ev.value?.sweep.find((s) => s.n_minority === ev.value?.mitigation.n_minority) ?? null)
const pct = (v: number) => `${(v * 100).toFixed(1)} %`
</script>

<template>
  <section class="se" :data-step="step" data-testid="section-ethics">
    <header class="head">
      <div class="kicker">Ethics in practice{{ head.page === 'discussion' ? ' · discussion, beyond the book' : '' }}</div>
      <p class="q" data-testid="ethics-question">{{ head.q }}</p>
      <h2 v-if="step > 0">{{ head.title }}</h2>
    </header>
    <div class="body">
      <div v-if="step === 0" class="intro">
        <div>
          <h1>Social justice in data science</h1>
          <p>AI plays a part in everyday life, and its influence on society grows, often for the better:</p>
          <ul class="ev"><li v-for="(e, i) in EVERYDAY" :key="e" :style="{ animationDelay: i * 0.12 + 's' }">{{ e }}</li></ul>
        </div>
        <div class="def"><span>{{ SOCIAL_JUSTICE }}</span><em>As AI affects people's lives, it becomes crucial to look at AI bias and its intersection with social justice.</em></div>
      </div>

      <div v-else-if="step === 1" class="two" data-testid="m-challenges">
        <div>
          <p class="lead">AI makes or shapes decisions about:</p>
          <div class="chips"><span v-for="d in DECISIONS" :key="d" class="chip">{{ d }}</span></div>
          <p class="small">The convenience and efficiency of AI can also amplify social injustice. It is only as strong as its input.</p>
        </div>
        <div :class="{ hide: reveal < 1 }" data-testid="ethics-biases">
          <p class="lead">Biases can enter the code, consciously or unconsciously:</p>
          <div class="chips"><span v-for="b in BIASES" :key="b" class="chip warn">{{ b }}</span></div>
          <p class="small">AI can benefit traditionally privileged people and further disadvantage marginalised groups.</p>
        </div>
      </div>

      <div v-else-if="step === 2" class="two" data-testid="m-faces">
        <div>
          <p class="lead">Software engineers may unintentionally train facial-recognition systems mostly on the faces of white and light-skinned people.</p>
          <p class="small">The limitation becomes a bias that carries into the technology. The book's Fig. 8.28 shows systems labelling skin tone and sex in ways that may differ from how people identify themselves.</p>
          <p class="small">The lesson: train deep-learning methods on diverse populations, and check every AI innovation for bias.</p>
        </div>
        <div class="cite" :class="{ hide: reveal < 1 }" data-testid="ethics-gendershades">
          <p class="tag">Beyond the book · a famous measurement</p>
          <p class="fact">{{ GENDER_SHADES.finding }}</p>
          <p class="scope" data-testid="ethics-gendershades-scope">{{ GENDER_SHADES.scope }}</p>
          <div class="cmp"><div><b>34.7 %</b><span>darker-skinned women (worst system)</span></div><div><b>0.8 %</b><span>lighter-skinned men</span></div></div>
          <p class="src">{{ GENDER_SHADES.cite }}</p>
        </div>
      </div>

      <div v-else-if="step === 4" class="police" data-testid="m-police">
        <p class="lead">Law enforcement may deploy facial recognition with few rules to protect citizens' rights. The book's concern, as a chain of risks: if a system's errors are unequal,</p>
        <div class="chain">
          <template v-for="(c, i) in POLICE_CHAIN" :key="c.k">
            <div class="link" :class="{ hide: i > reveal }" :style="{ borderColor: `rgb(var(--c-${c.tone}))` }" :data-testid="`ethics-chain-${i}`">{{ c.k }}</div>
            <span v-if="i < POLICE_CHAIN.length - 1" class="arr" :class="{ hide: i >= reveal }">→</span>
          </template>
        </div>
        <p class="small">These systems must remove racial and other biases, or risk losing the public's trust (p. 394).</p>
        <p v-if="atFive" class="small">In the measured analogy, a group at {{ pct(atFive.share) }} of the training data got {{ pct(atFive.minority_error) }} errors while everyone else got {{ pct(atFive.majority_error) }}.</p>
      </div>

      <div v-else-if="step === 6" class="benefits" data-testid="m-benefits">
        <div v-for="(b, i) in BENEFITS" :key="b.k" class="ben" :style="{ animationDelay: i * 0.12 + 's' }"><strong>{{ b.k }}</strong><span>{{ b.v }}</span></div>
      </div>

      <div v-else-if="step === 7" class="two" data-testid="m-college">
        <div>
          <div class="card"><strong>Affinity bias</strong><span>A reviewer who played lacrosse in college may unconsciously favour an applicant who plays lacrosse, even a less qualified one. AI can reduce this kind of bias, and racial and other biases too.</span></div>
          <div class="card"><strong>Anonymous is not neutral</strong><span>Statisticians used AI to run a regression on nearly 300,000 college admission essays. It predicted the applicants' gender and household income with remarkable accuracy.</span></div>
          <p class="small">The point of the study: even anonymous essays may let implicit bias reach reviewers. AI can help level the playing field (p. 395).</p>
        </div>
        <div class="note" :class="{ hide: reveal < 1 }" data-testid="ethics-college-note">
          <h3>Two sides of the same signal</h3>
          <p>If a model can read income from an essay, a model trained on past admission decisions could also <b>learn to use</b> that signal and reproduce the old bias. AI levels the field only when it is built and checked to do so, with the per-group checks from the earlier steps.</p>
        </div>
      </div>

      <div v-else-if="step === 8" class="disc" data-testid="m-discussion">
        <div class="side amp"><h3>AI can amplify injustice</h3><ul><li>biased or unrepresentative training data</li><li>errors concentrated on under-represented groups</li><li>high-stakes uses with few rules (policing)</li></ul></div>
        <div class="side red"><h3>AI can reduce injustice</h3><ul><li>fewer human decisions, less human bias</li><li>consistent rules for every applicant</li><li>tools that support people (social cues)</li></ul></div>
        <div class="qs"><p class="h">Questions for discussion (ours)</p><ol><li v-for="d in DISCUSSION" :key="d">{{ d }}</li></ol></div>
      </div>

      <div v-else-if="step === 9" class="summary" data-testid="ethics-summary">
        <div v-for="(s, i) in SUMMARY" :key="s.k" class="sum" :style="{ animationDelay: i * 0.15 + 's' }"><strong>{{ s.k }}</strong><span>{{ s.v }}</span></div>
        <SectionBridge id="ethics" :answer="false" :next="false" />
      </div>

      <div v-else-if="error" class="err" data-testid="ethics-error">The backend is not reachable ({{ error }}). Start it, then reload: the numbers here are measured there.</div>
      <div v-else-if="!ev" class="loading">Measuring…</div>
      <template v-else>
        <RepresentationDemo v-if="step === 3" ref="mod" :data="ev" />
        <MitigationDemo v-else-if="step === 5" ref="mod" :data="ev" />
      </template>
    </div>
  </section>
</template>

<style scoped>
.se { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 70px 5vw 88px; gap: 4px; }
.kicker { font: 600 13px 'Space Grotesk', system-ui; letter-spacing: .3em; text-transform: uppercase; color: rgb(var(--c-accent)); }
.q { margin-top: 12px; font: 500 max(clamp(15px, 1.2vw, 20px), var(--up-15, 15px)) 'Inter', system-ui; color: rgb(var(--c-human)); }
h2 { font: 600 clamp(26px, 2.6vw, 46px) / 1.1 'Space Grotesk', system-ui; margin-top: 4px; }
h3 { font: 600 clamp(17px, 1.3vw, 22px) 'Space Grotesk', system-ui; margin-bottom: 10px; }
.body { flex: 1; min-height: 0; display: flex; align-items: safe center; margin-top: 12px; overflow-y: auto; overflow-x: hidden; }
.hide { opacity: 0; }
.lead { font-size: clamp(16px, 1.3vw, 22px); color: rgb(var(--c-text)); line-height: 1.5; }
.small { margin-top: 12px; font-size: max(clamp(14px, 1.05vw, 17px), var(--up-14, 14px)); color: rgb(var(--c-dim)); line-height: 1.5; }
.src { margin-top: 8px; font-size: 12px; color: rgb(var(--c-faint)); }
.intro { display: grid; grid-template-columns: 1.3fr 1fr; gap: 4vw; align-items: center; width: 100%; }
.intro h1 { font: 600 clamp(36px, 4.4vw, 74px) / 1.05 'Space Grotesk', system-ui; }
.intro p { margin-top: 18px; font-size: clamp(16px, 1.35vw, 23px); color: rgb(var(--c-soft)); }
.ev { margin-top: 12px; list-style: none; display: grid; gap: 8px; }
.ev li { padding: 10px 16px; border-radius: 12px; background: rgba(var(--c-surface), .78); border-left: 3px solid rgb(var(--c-accent)); font-size: max(clamp(15px, 1.15vw, 19px), var(--up-15, 15px)); color: rgb(var(--c-text)); animation: rise .6s ease both; }
.def { display: flex; flex-direction: column; gap: 12px; padding: 24px; border-radius: 18px; background: rgba(var(--c-accent), .1); border: 1.5px solid rgb(var(--c-accent)); }
.def span { font: 600 clamp(18px, 1.5vw, 26px) / 1.35 'Space Grotesk', system-ui; color: rgb(var(--c-strong)); }
.def em { font-style: normal; font-size: max(15px, var(--up-15, 15px)); color: rgb(var(--c-soft)); line-height: 1.5; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 4vw; width: 100%; align-items: center; }
.two > div { transition: opacity .5s; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.chip { padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(var(--c-accent), .6); font: 500 max(15px, var(--up-15, 15px)) 'Inter', system-ui; color: rgb(var(--c-text)); }
.chip.warn { border-color: rgba(var(--c-warn), .7); background: rgba(var(--c-warn), .08); }
.cite { padding: 20px 24px; border-radius: 18px; background: rgba(var(--c-surface), .82); border-top: 4px solid rgb(var(--c-warn)); transition: opacity .5s; }
.tag { font: 600 max(12px, var(--up-12, 12px)) 'Space Grotesk', system-ui; letter-spacing: .15em; text-transform: uppercase; color: rgb(var(--c-human)); }
.fact { margin-top: 10px; font-size: max(clamp(15px, 1.15vw, 19px), var(--up-15, 15px)); color: rgb(var(--c-text)); line-height: 1.5; }
.scope { font-size: max(clamp(14px, 1vw, 17px), var(--up-14, 14px)); color: rgb(var(--c-soft)); line-height: 1.45; margin-top: 6px; }
.cmp { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
.cmp div { display: flex; flex-direction: column; gap: 4px; }
.cmp b { font: 700 clamp(30px, 3vw, 50px) 'Space Grotesk', system-ui; color: rgb(var(--c-warn)); }
.cmp div + div b { color: rgb(var(--c-ok)); }
.cmp span { font-size: max(13px, var(--up-13, 13px)); color: rgb(var(--c-dim)); }
.police { width: 100%; display: grid; gap: 14px; }
.chain { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.link { flex: 1 1 160px; padding: 16px; border-radius: 14px; background: rgba(var(--c-surface), .82); border-top: 3px solid; font: 600 max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)) 'Space Grotesk', system-ui; color: rgb(var(--c-text)); min-height: 80px; display: flex; align-items: center; transition: opacity .5s; }
.arr { font-size: 26px; color: rgb(var(--c-dim)); transition: opacity .5s; }
.benefits { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; width: 100%; }
.ben { display: flex; flex-direction: column; gap: 10px; padding: 24px; border-radius: 18px; background: rgba(var(--c-surface), .78); border-top: 3px solid rgb(var(--c-ok)); animation: rise .6s ease both; }
.ben strong { font: 600 clamp(18px, 1.4vw, 24px) 'Space Grotesk', system-ui; }
.ben span { font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-soft)); line-height: 1.5; }
.card { display: flex; flex-direction: column; gap: 6px; padding: 14px 18px; border-radius: 14px; background: rgba(var(--c-surface), .78); border-left: 3px solid rgb(var(--c-ok)); margin-bottom: 10px; }
.card strong { font: 600 max(18px, var(--up-18, 18px)) 'Space Grotesk', system-ui; }
.card span { font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-text)); line-height: 1.45; }
.note { padding: 20px 24px; border-radius: 18px; background: rgba(var(--c-human), .08); border-left: 4px solid rgb(var(--c-human)); }
.note p { font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-text)); line-height: 1.5; }
.note b { color: rgb(var(--c-human)); }
.disc { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; width: 100%; }
.side { padding: 18px 22px; border-radius: 16px; background: rgba(var(--c-surface), .78); border-top: 4px solid; }
.side.amp { border-color: rgb(var(--c-warn)); } .side.red { border-color: rgb(var(--c-ok)); }
.side li { margin: 8px 0 8px 18px; font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-text)); }
.qs { grid-column: 1 / -1; }
.qs .h { font: 600 max(15px, var(--up-15, 15px)) 'Space Grotesk', system-ui; color: rgb(var(--c-soft)); }
.qs ol { margin: 8px 0 0 20px; display: grid; gap: 6px; font-size: max(clamp(14px, 1.1vw, 18px), var(--up-14, 14px)); color: rgb(var(--c-text)); }
.summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; width: 100%; }
.sum { display: flex; flex-direction: column; gap: 10px; padding: 20px; border-radius: 16px; background: rgba(var(--c-surface), .78); border-top: 3px solid rgb(var(--c-accent)); animation: rise .6s ease both; }
.sum strong { font: 600 clamp(17px, 1.3vw, 22px) 'Space Grotesk', system-ui; }
.sum span { color: rgb(var(--c-soft)); font-size: max(clamp(14px, 1.05vw, 17px), var(--up-14, 14px)); line-height: 1.45; }
.err { color: rgb(var(--c-warn)); font-size: max(18px, var(--up-18, 18px)); }
.loading { color: rgb(var(--c-dim)); font-size: max(18px, var(--up-18, 18px)); }
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@media (max-width: 1000px) { .intro, .two, .disc { grid-template-columns: 1fr; } .benefits, .summary { grid-template-columns: 1fr 1fr; } }
@media (prefers-reduced-motion: reduce) { .ev li, .ben, .sum { animation: none; } }
</style>
