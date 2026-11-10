<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '../components/layout/PageHeader.vue'
import RunResults from '../components/ml/RunResults.vue'
import TrainForm from '../components/ml/TrainForm.vue'

const runId = ref<string | null>(null)
</script>

<template>
  <PageHeader title="Model Training Studio" subtitle="Choose a dataset, target and features, pick a model and its hyper-parameters, and train it for real. Preprocessing is fitted on the training split only." />
  <div class="grid gap-6 xl:grid-cols-[24rem_1fr]">
    <TrainForm @trained="runId = $event" />
    <div class="min-w-0">
      <RunResults v-if="runId" :run-id="runId" />
      <div v-else class="card text-sm text-slate-600">
        <p class="font-medium text-slate-800">How it works</p>
        <ol class="mt-2 list-inside list-decimal space-y-1">
          <li>The rows are split into training and test sets with the chosen seed (stratified for classification).</li>
          <li>Missing values are imputed and categories one-hot encoded — fitted on training rows only.</li>
          <li>The model is fitted on the training rows.</li>
          <li>Metrics are computed on both splits so you can compare them.</li>
          <li>You can inspect the learned parameters, read an explanation built from them, and predict new rows.</li>
        </ol>
        <p class="mt-3">Try: <i>Car seats (DS4A) → target sales_cat → features price, shelf_location, advertising → Decision tree, depth 3</i>.</p>
      </div>
    </div>
  </div>
</template>
