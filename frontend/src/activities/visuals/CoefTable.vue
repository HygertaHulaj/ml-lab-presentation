<script setup lang="ts">
/** An R-style coefficient table (estimate, std. error, t, p) from `ols_table`; significant rows are highlighted. */
const props = withDefaults(defineProps<{
  model: { n: number; r2: number; adj_r2: number; F: number; coefficients: { term: string; estimate: number; std_error: number; t: number; p: number }[] }
  rows?: number; testid?: string
}>(), { rows: 99, testid: 'coef' })
const num = (v: number) => (Math.abs(v) !== 0 && (Math.abs(v) < 1e-3 || Math.abs(v) >= 1e5) ? v.toExponential(3) : v.toFixed(Math.abs(v) < 1 ? 4 : 2))
const pf = (p: number) => (p < 0.001 ? '< 0.001' : p.toFixed(3))
const label = (t: string) => t.replace(/_/g, ' ')
void props
</script>

<template>
  <div class="ct" :data-testid="testid">
    <table>
      <thead><tr><th>term</th><th>estimate</th><th>std. error</th><th>t</th><th>p</th></tr></thead>
      <tbody>
        <tr v-for="(c, i) in model.coefficients" v-show="i < rows" :key="c.term" :class="{ sig: c.p < 0.05 && c.term !== '(Intercept)', ns: c.p >= 0.05 && c.term !== '(Intercept)' }">
          <td>{{ label(c.term) }}</td><td>{{ num(c.estimate) }}</td><td>{{ num(c.std_error) }}</td><td>{{ c.t.toFixed(2) }}</td><td>{{ pf(c.p) }}</td>
        </tr>
      </tbody>
    </table>
    <p class="fit"><span>n = <b>{{ model.n }}</b></span><span>R² = <b :data-testid="`${testid}-r2`">{{ model.r2.toFixed(3) }}</b></span><span>adjusted R² = <b>{{ model.adj_r2.toFixed(3) }}</b></span><span>F = <b>{{ model.F.toFixed(1) }}</b></span></p>
  </div>
</template>

<style scoped>
table { width: 100%; border-collapse: collapse; font: 13px 'JetBrains Mono', monospace; }
th { text-align: left; padding: 6px 10px; color: rgb(var(--c-dim)); font: 600 12px 'Space Grotesk', system-ui; border-bottom: 1px solid rgba(var(--c-dim), .3); }
td { padding: 6px 10px; border-bottom: 1px solid rgba(var(--c-dim), .15); color: rgb(var(--c-text)); }
tr.sig td:first-child { color: rgb(var(--c-ok)); font-weight: 700; }
tr.ns td { color: rgb(var(--c-dim)); }
.fit { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 8px; font-size: 14px; color: rgb(var(--c-soft)); }
.fit b { color: rgb(var(--c-accent)); font-family: 'Space Grotesk', system-ui; }
</style>
