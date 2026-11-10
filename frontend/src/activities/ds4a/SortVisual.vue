<script setup lang="ts">
/** The sorting visual for AC 1, AC 2 and AC 4: items from the exercise, bins chosen by the activity id. */
import { computed } from 'vue'
import type { ExerciseDetail, SolveResult } from '../../types'
import SortBoard, { type SortBin } from '../visuals/SortBoard.vue'
import { beforeColon, sortItems } from '../sorting'

const props = defineProps<{ scene: string; p: number; line: number; lp: number; detail: ExerciseDetail; solve: SolveResult }>()
const BINS: Record<string, SortBin[]> = {
  'ds4a-ac1': [{ k: 'AI', tone: 'accent', sub: 'mimics a human task, learns from data' }, { k: 'Not AI', tone: 'dim', sub: 'fixed rules or a mechanism' }],
  'ds4a-ac2': [
    { k: 'Step 1: Ingesting Data', tone: 'data', sub: 'data goes in' },
    { k: 'Step 2: Analyzing the Data', tone: 'compute', sub: 'the model is fitted' },
    { k: 'Step 3: Producing Model-Based Results', tone: 'human', sub: 'results come out' },
  ],
  'ds4a-ac4': [{ k: 'Regression', tone: 'feature', sub: 'quantitative response' }, { k: 'Classification', tone: 'ok', sub: 'categorical response' }],
}
const bins = computed(() => BINS[props.detail.id] ?? [])
const items = computed(() => sortItems(props.detail, props.solve, props.detail.id === 'ds4a-ac2' ? beforeColon : (s) => s))
</script>

<template>
  <SortBoard :items="items" :bins="bins" :scene="scene" :line="line" :lp="lp" />
</template>
