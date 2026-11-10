<script setup lang="ts">
/**
 * Content embedded in the presentation (audit C2, §5): a cinematic activity or a 3D lesson opens over the current step,
 * inside the one presentation shell. The section stays mounted underneath, so closing returns to the same step with its
 * state. The embedded component finds `EMBED_CLOSE` and shows "Back to the presentation" (and Esc) instead of its own
 * route links; theme and reduced motion come from the same presentation store.
 */
import { defineAsyncComponent, provide } from 'vue'
import { EMBED_CLOSE, type Embed } from './shellApi'

const props = defineProps<{ embed: Embed }>()
const emit = defineEmits<{ close: [] }>()
provide(EMBED_CLOSE, () => emit('close'))
const ActivityPlayer = defineAsyncComponent(() => import('../../activities/ActivityPlayer.vue'))
const LessonView = defineAsyncComponent(() => import('../../views/LessonView.vue'))
void props
</script>

<template>
  <div class="embed" role="dialog" aria-modal="true" :aria-label="embed.label" data-testid="embed-layer">
    <ActivityPlayer v-if="embed.kind === 'activity'" :id="embed.id" />
    <LessonView v-else :id="embed.id" />
  </div>
</template>

<style scoped>
.embed { position: fixed; inset: 0; z-index: 60; }
.embed :deep(.ap) { z-index: 60; }
</style>
