<script setup lang="ts">
/** Hosts any cinematic lesson: K-Means on Iris, or the Shah Ch. 8 regression / gradient-descent lessons (ids shah-*). */
import { computed, defineAsyncComponent } from 'vue'

const props = defineProps<{ id: string }>()
const KMeansLesson = defineAsyncComponent(() => import('./lessons/KMeansLesson.vue'))
const GdLesson = defineAsyncComponent(() => import('../lessons/linreg-gd/GdLesson.vue'))
const view = computed(() => (props.id.startsWith('shah-') ? GdLesson : KMeansLesson))
</script>

<template>
  <component :is="view" :id="id" :key="id" />
</template>
