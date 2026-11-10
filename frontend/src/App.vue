<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Menu } from 'lucide-vue-next'
import AppSidebar from './components/layout/AppSidebar.vue'

const open = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => (open.value = false))
</script>

<template>
  <!-- immersive routes (cinematic lessons) take the whole screen, without the classic-lab shell -->
  <RouterView v-if="route.meta.immersive" />
  <div v-else class="min-h-screen lg:flex">
    <AppSidebar :open="open" @close="open = false" />
    <div class="min-w-0 flex-1">
      <header class="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <button class="rounded-md p-1.5 hover:bg-slate-100" aria-label="Open menu" @click="open = true"><Menu class="h-5 w-5" /></button>
        <span class="font-semibold">ML </span>
      </header>
      <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
