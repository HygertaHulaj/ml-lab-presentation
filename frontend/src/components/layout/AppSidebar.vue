<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { NAV } from './nav'

defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" @click="$emit('close')" />
  <aside
    :class="[open ? 'translate-x-0' : '-translate-x-full', 'fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0']"
    aria-label="Main navigation"
  >
    <div class="flex items-center justify-between px-5 py-5">
      <RouterLink to="/" class="flex items-center gap-2.5">
        <img src="/favicon.svg" alt="" class="h-8 w-8" />
        <div class="leading-tight">
          <div class="font-semibold text-slate-900">ML Lab</div>
          <div class="text-xs text-slate-500">Train · Predict · Explain</div>
        </div>
      </RouterLink>
      <button class="rounded-md p-1 hover:bg-slate-100 lg:hidden" aria-label="Close menu" @click="$emit('close')"><X class="h-5 w-5" /></button>
    </div>
    <nav class="space-y-0.5 px-3">
      <RouterLink
        v-for="item in NAV"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        :exact-active-class="item.to === '/' ? 'bg-brand-50 text-brand-700' : ''"
        :active-class="item.to !== '/' ? 'bg-brand-50 text-brand-700' : ''"
      >
        <component :is="item.icon" class="h-4 w-4" />
        {{ item.label }}
      </RouterLink>
    </nav>
    <div class="absolute bottom-0 w-full border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
      Lecture 8 · Machine Learning<br />Hygerta Hulaj
    </div>
  </aside>
</template>
