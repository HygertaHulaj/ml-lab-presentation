import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { SECTIONS } from '../presentation/sections'
import { SHOW_EXTRA_PAGES } from '../features'

/** Hidden while SHOW_EXTRA_PAGES is false (features.ts): the classic lab, the standalone film page and the movie workshop. */
const extraRoutes: RouteRecordRaw[] = [
  { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { title: 'Dashboard' } },
  { path: '/learn', name: 'learn', component: () => import('../views/LearnView.vue'), meta: { title: 'Learn ML' } },
  { path: '/exercises', name: 'exercises', component: () => import('../views/ExercisesView.vue'), meta: { title: 'Exercise Academy' } },
  { path: '/exercises/:id', name: 'exercise', component: () => import('../views/ExerciseDetailView.vue'), props: true, meta: { title: 'Exercise' } },
  { path: '/training', name: 'training', component: () => import('../views/TrainingView.vue'), meta: { title: 'Training Studio' } },
  { path: '/gradient-descent', name: 'gradient-descent', component: () => import('../views/GradientDescentView.vue'), meta: { title: 'Gradient Descent' } },
  { path: '/decision-trees', name: 'decision-trees', component: () => import('../views/DecisionTreeView.vue'), meta: { title: 'Decision Trees' } },
  { path: '/evaluation', name: 'evaluation', component: () => import('../views/EvaluationView.vue'), meta: { title: 'Evaluation Lab' } },
  { path: '/playground', name: 'playground', component: () => import('../views/PlaygroundView.vue'), meta: { title: 'New Problem' } },
  { path: '/practice', name: 'practice', component: () => import('../views/PracticeView.vue'), meta: { title: 'Practice' } },
  // cinematic introduction film (Three.js world, lazy-loaded), full screen
  { path: '/film', name: 'film', component: () => import('../views/FilmView.vue'), meta: { title: 'The Scan That Changed Everything', immersive: true } },
  { path: '/workshops/movies', name: 'movie-workshop', component: () => import('../lessons/linreg-gd/MovieWorkshop.vue'), meta: { title: 'Can money buy a better movie rating?', immersive: true } },
]

export const routes: RouteRecordRaw[] = [
  // with the extra pages hidden, the app opens on the presentation
  ...(SHOW_EXTRA_PAGES ? extraRoutes : [{ path: '/', redirect: '/presentation' } as RouteRecordRaw]),
  // V2: the presentation, one global shell with one child route per section (registry: presentation/sections.ts)
  {
    path: '/presentation', component: () => import('../presentation/shell/PresentationShell.vue'), meta: { title: 'Machine Learning — Presentation', immersive: true },
    children: [
      { path: '', redirect: '/presentation/intro' },
      { path: 'summary', redirect: '/presentation/conclusion' }, // the former placeholder
      ...SECTIONS.map((s) => ({ path: s.path, name: 'pres-' + s.id, component: s.component, meta: { title: s.title, immersive: true, sectionId: s.id } })),
    ],
  },
  // cinematic lessons: lazy-loaded (Three.js/TresJS/GSAP live only in this chunk), full screen without the classic shell
  { path: '/lessons/:id', name: 'lesson', component: () => import('../views/LessonView.vue'), props: true, meta: { title: 'Cinematic lesson', immersive: true } },
  // cinematic activities: the end-of-chapter exercises as short films (Story / Try / Solution), full screen
  { path: '/activities', name: 'activities', component: () => import('../activities/ActivitiesHub.vue'), meta: { title: 'Apply the concepts', immersive: true } },
  { path: '/activities/:id', name: 'activity', component: () => import('../activities/ActivityPlayer.vue'), props: true, meta: { title: 'Cinematic activity', immersive: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({ history: createWebHistory(), routes, scrollBehavior: () => ({ top: 0 }) })

router.afterEach((to) => {
  document.title = `${(to.meta.title as string) ?? 'ML Lab'} · ML Lab`
})
