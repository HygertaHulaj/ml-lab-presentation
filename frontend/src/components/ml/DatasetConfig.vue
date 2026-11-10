<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useDatasets } from '../../stores/datasets'
import OriginBadge from './OriginBadge.vue'

/** Dataset + target + feature selection, driven by real column metadata from the API. */
const props = defineProps<{ numericOnly?: boolean; singleFeature?: boolean; targetKind?: 'numeric' | 'categorical' | null }>()
const datasetId = defineModel<string>('datasetId', { required: true })
const target = defineModel<string>('target', { required: true })
const features = defineModel<string[]>('features', { required: true })

const store = useDatasets()
onMounted(() => store.load())
const ds = computed(() => store.byId(datasetId.value))
const columns = computed(() => ds.value?.column_metadata ?? [])
const targetOptions = computed(() => columns.value.filter((c) => !props.targetKind || c.kind === props.targetKind))
const featureOptions = computed(() => columns.value.filter((c) => c.name !== target.value && (!props.numericOnly || c.kind === 'numeric')))

watch(datasetId, (nv, ov) => {
  if (nv !== ov && ov !== undefined) {
    target.value = ''
    features.value = []
  }
})
watch(target, (t) => (features.value = features.value.filter((f) => f !== t)))

function toggle(name: string) {
  if (props.singleFeature) features.value = [name]
  else features.value = features.value.includes(name) ? features.value.filter((f) => f !== name) : [...features.value, name]
}
const allFeatures = () => (features.value = featureOptions.value.map((c) => c.name))
</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="label" for="ds">Dataset</label>
      <select id="ds" v-model="datasetId" class="input">
        <option value="" disabled>Choose a dataset…</option>
        <optgroup label="Textbook datasets">
          <option v-for="d in store.items.filter((x) => x.origin === 'textbook')" :key="d.id" :value="d.id">{{ d.name }} ({{ d.row_count }} rows)</option>
        </optgroup>
        <optgroup label="Supplementary examples">
          <option v-for="d in store.items.filter((x) => x.origin === 'example')" :key="d.id" :value="d.id">{{ d.name }} ({{ d.row_count }} rows)</option>
        </optgroup>
        <optgroup v-if="store.items.some((x) => x.origin === 'upload')" label="Uploaded">
          <option v-for="d in store.items.filter((x) => x.origin === 'upload')" :key="d.id" :value="d.id">{{ d.name }} ({{ d.row_count }} rows)</option>
        </optgroup>
      </select>
      <p v-if="ds" class="mt-1.5 flex items-start gap-2 text-xs text-slate-500"><OriginBadge :origin="ds.origin" /> <span>{{ ds.source }}</span></p>
    </div>
    <div v-if="ds">
      <label class="label" for="target">Target (response variable)</label>
      <select id="target" v-model="target" class="input">
        <option value="" disabled>Choose the column to predict…</option>
        <option v-for="c in targetOptions" :key="c.name" :value="c.name">{{ c.name }} · {{ c.kind }}{{ c.kind === 'categorical' ? ` (${c.unique} classes)` : '' }}</option>
      </select>
    </div>
    <div v-if="ds && target">
      <div class="flex items-center justify-between">
        <span class="label">{{ singleFeature ? 'Feature (x)' : 'Features (explanatory variables)' }}</span>
        <button v-if="!singleFeature" type="button" class="text-xs font-medium text-brand-600 hover:underline" @click="allFeatures">select all</button>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="c in featureOptions"
          :key="c.name"
          type="button"
          :class="['rounded-full border px-2.5 py-1 text-xs', features.includes(c.name) ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50']"
          :aria-pressed="features.includes(c.name)"
          @click="toggle(c.name)"
        >
          {{ c.name }}<span class="ml-1 text-slate-400">{{ c.kind === 'numeric' ? '#' : 'abc' }}</span>
          <span v-if="c.missing" class="ml-1 text-amber-600" :title="`${c.missing} missing values`">!</span>
        </button>
      </div>
    </div>
  </div>
</template>
