<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-slate-900">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 max-w-3xl text-sm text-slate-600">{{ subtitle }}</p>
    </div>
    <div class="flex flex-wrap gap-2"><slot /></div>
  </div>
</template>
