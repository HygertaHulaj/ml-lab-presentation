<script setup lang="ts">
import { AlertTriangle, Info, Loader2 } from 'lucide-vue-next'

defineProps<{ kind: 'error' | 'loading' | 'info'; message?: string | null }>()
</script>

<template>
  <div
    v-if="kind === 'loading' || message"
    role="status"
    :class="[
      'flex items-start gap-2 rounded-lg px-4 py-3 text-sm',
      kind === 'error' ? 'border border-red-200 bg-red-50 text-red-800' : kind === 'info' ? 'border border-sky-200 bg-sky-50 text-sky-900' : 'text-slate-500',
    ]"
  >
    <Loader2 v-if="kind === 'loading'" class="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
    <AlertTriangle v-else-if="kind === 'error'" class="mt-0.5 h-4 w-4 shrink-0" />
    <Info v-else class="mt-0.5 h-4 w-4 shrink-0" />
    <span>{{ message ?? 'Loading…' }}</span>
  </div>
</template>
