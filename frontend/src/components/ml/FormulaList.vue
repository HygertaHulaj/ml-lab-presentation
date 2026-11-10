<script setup lang="ts">
import { humanize } from '../../utils/format'

defineProps<{ formulas: Record<string, unknown> | null | undefined }>()
</script>

<template>
  <div v-if="formulas" class="space-y-2">
    <template v-for="(v, k) in formulas" :key="k">
      <div v-if="typeof v === 'string'">
        <div class="text-xs font-semibold text-slate-500">{{ humanize(String(k)) }}</div>
        <div class="formula">{{ v }}</div>
      </div>
      <div v-else-if="v && typeof v === 'object'">
        <div class="mt-3 text-xs font-semibold text-slate-500">{{ humanize(String(k)) }}</div>
        <div class="mt-1 grid gap-1.5 sm:grid-cols-2">
          <div v-for="(f, name) in v as Record<string, string>" :key="name" class="formula"><b class="font-sans">{{ name }}:</b> {{ f }}</div>
        </div>
      </div>
    </template>
  </div>
</template>
