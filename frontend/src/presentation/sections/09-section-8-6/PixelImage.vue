<script setup lang="ts">
/** A small square image from shading values 0–16 (side × side), used by the freshness and quality demos. */
const props = withDefaults(defineProps<{ pixels: number[]; size?: string; max?: number }>(), { size: '120px', max: 16 })
const side = Math.round(Math.sqrt(props.pixels.length))
</script>

<template>
  <div class="pi" :style="{ width: size, gridTemplateColumns: `repeat(${side}, 1fr)` }" role="img" :aria-label="`${side} by ${side} pixel image`">
    <i v-for="(v, k) in pixels" :key="k" :style="{ background: `rgba(var(--c-strong), ${(v / max).toFixed(3)})` }" />
  </div>
</template>

<style scoped>
.pi { display: grid; aspect-ratio: 1; background: rgb(var(--c-ground2)); border-radius: 8px; overflow: hidden; border: 1px solid rgba(var(--c-dim), .35); }
.pi i { display: block; }
</style>
