<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ origin: string }>()
const style = computed(() => {
  const o = props.origin.toLowerCase()
  if (o.startsWith('textbook')) return ['bg-emerald-50 text-emerald-700 ring-emerald-200', 'Textbook']
  if (o.startsWith('upload')) return ['bg-amber-50 text-amber-700 ring-amber-200', 'Uploaded']
  return ['bg-slate-100 text-slate-600 ring-slate-200', 'Supplementary']
})
</script>

<template>
  <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', style[0]]">{{ style[1] }}</span>
</template>
