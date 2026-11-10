import { BookOpen, Film, Presentation, Brain, Clapperboard, FlaskConical, GitBranch, Gauge, LayoutDashboard, PenLine, TrendingDown, Upload } from 'lucide-vue-next'

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/presentation', label: 'Presentation', icon: Presentation },
  { to: '/film', label: 'Film: The Scan', icon: Film },
  { to: '/learn', label: 'Learn ML', icon: BookOpen },
  { to: '/lessons/kmeans-iris', label: 'Cinematic: K-Means', icon: Clapperboard },
  { to: '/activities', label: 'Apply the Concepts', icon: Clapperboard },
  { to: '/exercises', label: 'Exercise Academy', icon: PenLine },
  { to: '/training', label: 'Training Studio', icon: Brain },
  { to: '/gradient-descent', label: 'Gradient Descent', icon: TrendingDown },
  { to: '/decision-trees', label: 'Decision Trees', icon: GitBranch },
  { to: '/evaluation', label: 'Evaluation Lab', icon: Gauge },
  { to: '/playground', label: 'Solve a New Problem', icon: Upload },
  { to: '/practice', label: 'Practice Mode', icon: FlaskConical },
]
