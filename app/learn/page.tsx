import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { PlaceholderPage } from '@/components/shared/PlaceholderPage'

const TOPICS = [
  'introduction',
  'history',
  'anatomy',
  'notation',
  'finger-tricks',
  'beginner-method',
  'cfop',
  'advanced-methods',
  'videos',
  'practice',
]

export default function LearnPage() {
  return (
    <div>
      <PlaceholderPage
        title="Let's understand how cubes work"
        description="Educational content is written in a dedicated later phase (D-021) — this is the structural framework it will live in."
        icon={BookOpen}
      />
      <ul className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2 px-6 pb-16">
        {TOPICS.map((topic) => (
          <li key={topic}>
            <Link
              href={`/learn/${topic}`}
              className="rounded-full border border-border px-3 py-1 text-sm text-foreground/70 hover:bg-surface"
            >
              {topic.replace('-', ' ')}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
