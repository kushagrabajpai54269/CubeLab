import { Shield } from 'lucide-react'
import { PlaceholderPage } from '@/components/shared/PlaceholderPage'

export default function PrivacyPage() {
  return (
    <PlaceholderPage
      title="Privacy"
      description="Your solving progress stays on your device. Anonymous, aggregate product analytics is the one exception, and it's fully opt-out-able in Settings (D-013, D-023)."
      icon={Shield}
    />
  )
}
