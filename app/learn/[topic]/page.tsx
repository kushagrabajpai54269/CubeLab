import { BookOpen } from 'lucide-react'
import { PlaceholderPage } from '@/components/shared/PlaceholderPage'

export default async function LearnTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>
}) {
  const { topic } = await params
  const title = topic.replace('-', ' ')
  return (
    <PlaceholderPage
      title={title.charAt(0).toUpperCase() + title.slice(1)}
      description="Content for this topic is written in the dedicated content-authoring phase (D-021)."
      icon={BookOpen}
    />
  )
}
