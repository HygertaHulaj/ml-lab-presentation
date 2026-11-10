<script setup lang="ts">
/** The K-Means on Iris cinematic lesson: its store and components in the shared lesson shell. */
import { onMounted } from 'vue'
import CinematicLessonShell from '../../components/lesson/CinematicLessonShell.vue'
import { useLessonStore } from '../../stores/lesson'
import KMeansScene from '../../lessons/kmeans-iris/KMeansScene.vue'
import MathPanel from '../../lessons/kmeans-iris/MathPanel.vue'
import LabPanel from '../../lessons/kmeans-iris/LabPanel.vue'

const props = defineProps<{ id: string }>()
const store = useLessonStore()
onMounted(() => store.load(props.id))
</script>

<template>
  <CinematicLessonShell :store="store" loading-text="Running K-Means on the server…" accent="section-8-2">
    <template #scene="{ reducedMotion, onContextLost }"><KMeansScene :reduced-motion="reducedMotion" @contextlost="onContextLost" /></template>
    <template #math="{ large }"><MathPanel :large="large" /></template>
    <template #lab><LabPanel /></template>
  </CinematicLessonShell>
</template>
