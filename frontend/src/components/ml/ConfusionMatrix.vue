<script setup lang="ts">
import { computed } from 'vue'

/** rows = actual, columns = predicted. For 2 classes, cells are labelled TP/FN/FP/TN (first label = positive). */
// Note: Vue casts an absent Boolean prop to false, so the default must be explicit.
const props = withDefaults(defineProps<{ labels: string[]; matrix: number[][]; positiveFirst?: boolean }>(), { positiveFirst: true })
const max = computed(() => Math.max(1, ...props.matrix.flat()))
const binaryNames = [['TP', 'FN'], ['FP', 'TN']]
function shade(v: number, i: number, j: number) {
  const a = 0.12 + 0.75 * (v / max.value)
  return i === j ? `rgba(79,70,229,${a})` : `rgba(244,63,94,${a * 0.8})`
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="mx-auto border-separate border-spacing-1 text-sm">
      <thead>
        <tr>
          <th />
          <th :colspan="labels.length" class="pb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Predicted</th>
        </tr>
        <tr>
          <th class="pr-2 text-right text-xs font-semibold tracking-wide text-slate-500 uppercase">Actual</th>
          <th v-for="l in labels" :key="l" class="px-2 text-xs font-medium text-slate-600">{{ l }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in matrix" :key="i">
          <th class="pr-2 text-right text-xs font-medium text-slate-600">{{ labels[i] }}</th>
          <td
            v-for="(v, j) in row"
            :key="j"
            class="h-16 min-w-20 rounded-lg text-center font-semibold text-slate-900 tabular-nums"
            :style="{ background: shade(v, i, j) }"
          >
            <div class="text-lg">{{ v }}</div>
            <div v-if="labels.length === 2 && props.positiveFirst" class="text-[10px] font-medium text-slate-700">{{ binaryNames[i][j] }}</div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
