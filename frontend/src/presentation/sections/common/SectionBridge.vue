<script setup lang="ts">
/**
 * The end of a section (audit §4 and §7): the answer to the section's teaching question, and the reason for the next
 * section, phrased as the next question. Text comes from the registry (`sections.ts`), so the storyline is defined in
 * one place. Rendered in the flow of the section's last step (never as an overlay), so it cannot cover content.
 */
import { computed } from 'vue'
import { SECTIONS, sectionIndex } from '../../sections'
import { useShell } from '../../shell/shellApi'

const props = withDefaults(defineProps<{ id: string; answer?: boolean; next?: boolean }>(), { answer: true, next: true })
const def = computed(() => SECTIONS[sectionIndex(props.id)])
const nextDef = computed(() => SECTIONS[sectionIndex(props.id) + 1])
const shell = useShell()
</script>

<template>
  <aside v-if="def && (answer || def.embeds?.length || (next && def.bridge && nextDef))" class="bridge-card" data-testid="section-bridge" :aria-label="`Answer to: ${def.question}`">
    <p v-if="answer" class="ans"><span class="lbl">{{ def.question }}</span>{{ def.takeaway }}</p>
    <div v-if="def.embeds?.length" class="emb" data-testid="section-embeds"><span class="lbl">Practise here</span><button v-for="e in def.embeds" :key="e.id" class="eb" :data-testid="`embed-${e.id}`" @click="shell.openEmbed(e)">{{ e.kind === 'lesson' ? '▶ ' : '' }}{{ e.label }}</button></div>
    <p v-if="next && def.bridge && nextDef" class="nxt" data-testid="section-bridge-next"><span class="lbl">Next · {{ nextDef.short }}</span>{{ def.bridge }}</p>
  </aside>
</template>

<style scoped>
.bridge-card { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 12px 28px; width: 100%; margin-top: 14px; padding: 14px 20px; border-radius: 16px; background: rgba(var(--c-surface), .72); border: 1px solid rgba(var(--c-accent), .35); }
.ans, .nxt { display: flex; flex-direction: column; gap: 4px; font-size: max(clamp(15px, 1.15vw, 20px), var(--up-15, 15px)); line-height: 1.45; color: rgb(var(--c-text)); }
.nxt { color: rgb(var(--c-soft)); }
.emb { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
.eb { padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(var(--c-accent), .55); color: rgb(var(--c-text)); font-size: max(clamp(14px, 1vw, 18px), var(--up-14, 14px)); }
.eb:hover { background: rgba(var(--c-accent), .14); }
.lbl { font: 600 max(clamp(12px, .85vw, 14px), var(--up-12, 12px)) 'Space Grotesk', system-ui; letter-spacing: .08em; text-transform: uppercase; color: rgb(var(--c-accent)); }
@media (max-width: 1000px) { .bridge-card { grid-template-columns: 1fr; } }
</style>
