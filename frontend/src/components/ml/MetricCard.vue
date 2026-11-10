<script setup lang="ts">
import { fmt } from '../../utils/format'

defineProps<{ label: string; value: number | null | undefined; formula?: string; calc?: string; digits?: number }>()
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4">
    <div class="text-xs font-semibold tracking-wide text-slate-500 uppercase">{{ label }}</div>
    <div class="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{{ value === null || value === undefined ? 'undefined' : fmt(value, digits ?? 4) }}</div>
    <div v-if="formula" class="mt-2 font-mono text-xs text-slate-500">{{ formula }}</div>
    <div v-if="calc" class="mt-0.5 font-mono text-xs text-slate-700">{{ calc }}</div>
  </div>
</template>
