import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/endpoints'
import { errorMessage } from '../api/client'
import type { Dataset } from '../types'

export const useDatasets = defineStore('datasets', () => {
  const items = ref<Dataset[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(force = false) {
    if (items.value.length && !force) return
    loading.value = true
    error.value = null
    try {
      items.value = await api.datasets()
    } catch (e) {
      error.value = errorMessage(e)
    } finally {
      loading.value = false
    }
  }
  const byId = (id: string) => items.value.find((d) => d.id === id)
  function add(d: Dataset) {
    items.value = [...items.value.filter((x) => x.id !== d.id), d]
  }
  return { items, loading, error, load, byId, add }
})
