import { TrendingUp } from 'lucide-react'
import { PlaceholderPage } from '@/components/shared/PlaceholderPage'

export default function ProgressPage() {
  return (
    <PlaceholderPage
      title="Your progress"
      description="Solve stats and achievements get their own screen, kept separate from the Solver to keep that page focused (D-004)."
      icon={TrendingUp}
    />
  )
}
