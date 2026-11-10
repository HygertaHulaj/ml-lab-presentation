<script setup lang="ts">
/** The book's STAR framework (Scope, Track, Articulate, Reflect) from a solver answer; `shown` cards are visible. */
import { computed } from 'vue'

const props = withDefaults(defineProps<{ star: Record<string, unknown>; shown?: number }>(), { shown: 4 })
const cards = computed(() => Object.entries(props.star).map(([k, v]) => ({ k, v: String(v) })))
</script>

<template>
  <div class="star" data-testid="v-star">
    <div v-for="(c, i) in cards" :key="c.k" class="c" :class="{ hide: i >= shown }"><b>{{ c.k[0] }}</b><strong>{{ c.k }}</strong><span>{{ c.v }}</span></div>
  </div>
</template>

<style scoped>
.star { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; width: 100%; max-width: 1400px; margin: 0 auto; }
.c { position: relative; padding: 16px 18px 16px 64px; border-radius: 16px; background: rgba(var(--c-surface), .85); border-left: 3px solid rgb(var(--c-accent)); transition: opacity .5s, transform .5s; }
.c.hide { opacity: 0; transform: translateY(12px); }
.c b { position: absolute; left: 16px; top: 14px; font: 700 32px 'Space Grotesk', system-ui; color: rgb(var(--c-accent)); }
.c strong { display: block; font: 600 16px 'Space Grotesk', system-ui; }
.c span { font-size: clamp(13px, 1vw, 16px); color: rgb(var(--c-soft)); line-height: 1.5; }
@media (max-width: 1000px) { .star { grid-template-columns: 1fr; } }
</style>
