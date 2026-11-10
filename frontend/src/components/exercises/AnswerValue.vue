<script setup lang="ts">
import { computed } from 'vue'
import { fmt, humanize } from '../../utils/format'

/** Renders an answer of any shape returned by the solver: scalar, object, or list of rows. */
const props = defineProps<{ value: unknown }>()
const kind = computed(() => {
  const v = props.value
  if (Array.isArray(v) && v.length && typeof v[0] === 'object') return 'table'
  if (Array.isArray(v)) return 'list'
  if (v && typeof v === 'object') return 'object'
  return 'scalar'
})
const rows = computed(() => props.value as Record<string, unknown>[])
const cols = computed(() => (kind.value === 'table' ? Object.keys(rows.value[0]) : []))
const show = (v: unknown): string => (v && typeof v === 'object' ? JSON.stringify(v) : fmt(v))
</script>

<template>
  <span v-if="kind === 'scalar'" class="font-semibold text-slate-900">{{ fmt(value) }}</span>
  <ul v-else-if="kind === 'list'" class="list-inside list-disc">
    <li v-for="(x, i) in value as unknown[]" :key="i">{{ show(x) }}</li>
  </ul>
  <div v-else-if="kind === 'table'" class="overflow-x-auto">
    <table class="min-w-full text-sm">
      <thead><tr><th v-for="c in cols" :key="c" class="border-b border-slate-200 px-2 py-1 text-left text-xs font-semibold text-slate-500">{{ humanize(c) }}</th></tr></thead>
      <tbody>
        <tr v-for="(r, i) in rows" :key="i" class="odd:bg-slate-50">
          <td v-for="c in cols" :key="c" class="px-2 py-1 tabular-nums">{{ show(r[c]) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <dl v-else class="grid gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(8rem,auto)_1fr]">
    <template v-for="(v, k) in value as Record<string, unknown>" :key="k">
      <dt class="text-xs font-semibold text-slate-500">{{ humanize(String(k)) }}</dt>
      <dd class="text-sm text-slate-800">
        <AnswerValue v-if="v && typeof v === 'object'" :value="v" />
        <template v-else>{{ fmt(v) }}</template>
      </dd>
    </template>
  </dl>
</template>
