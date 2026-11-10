<script setup lang="ts">
/** A section that is mapped but not built yet. It says so plainly instead of showing placeholder "content". */
import { onMounted } from 'vue'
import { usePresentation } from '../../store'
import { useShell } from '../../shell/shellApi'

const store = usePresentation()
const shell = useShell()
onMounted(() => shell.setFieldAlpha(0.45))
</script>

<template>
  <section class="planned" data-testid="section-planned">
    <div class="kicker">Section {{ String(store.current.n).padStart(2, '0') }} · in development</div>
    <h1>{{ store.current.title }}</h1>
    <p class="src">Source: {{ store.current.source }}</p>
    <ul v-if="store.current.planned">
      <li v-for="p in store.current.planned" :key="p">{{ p }}</li>
    </ul>
    <p class="note">This section is mapped (see <code>docs/PRESENTATION_FLOW.md</code>) and will be built in a later phase. Press → to continue.</p>
  </section>
</template>

<style scoped>
.planned { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; padding: 0 10vw; }
.kicker { font: 600 13px 'Space Grotesk', system-ui; letter-spacing: .3em; text-transform: uppercase; color: rgb(var(--c-accent)); }
h1 { font: 600 clamp(32px, 4vw, 64px) / 1.08 'Space Grotesk', system-ui; margin: 14px 0 8px; max-width: 22ch; }
.src { color: rgb(var(--c-faint)); font-size: 15px; }
ul { margin-top: 26px; display: grid; gap: 10px; font-size: clamp(16px, 1.3vw, 22px); color: rgb(var(--c-soft)); }
li::before { content: '—'; color: rgb(var(--c-data)); margin-right: 12px; }
.note { margin-top: 30px; font-size: max(14px, var(--up-14, 14px)); color: rgb(var(--c-faint)); }
code { color: rgb(var(--c-data-soft)); }
</style>
