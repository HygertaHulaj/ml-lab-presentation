import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface Attempt { problemId: string; category: string; difficulty: string; correct: boolean; at: number }

/** Session-only progress tracking for Practice Mode (resets when the page is reloaded). */
export const usePractice = defineStore('practice', () => {
  const attempts = ref<Attempt[]>([])
  const record = (a: Attempt) => attempts.value.push(a)
  const solved = computed(() => new Set(attempts.value.filter((a) => a.correct).map((a) => a.problemId)).size)
  const accuracy = computed(() => (attempts.value.length ? attempts.value.filter((a) => a.correct).length / attempts.value.length : 0))
  const byCategory = computed(() => {
    const out: Record<string, { tries: number; correct: number }> = {}
    for (const a of attempts.value) {
      out[a.category] ??= { tries: 0, correct: 0 }
      out[a.category].tries++
      if (a.correct) out[a.category].correct++
    }
    return out
  })
  return { attempts, record, solved, accuracy, byCategory }
})
