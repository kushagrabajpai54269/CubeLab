import Link from 'next/link'
import { buttonStyles } from '@/components/ui/Button'

export default function HomePage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center">
      <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-border bg-surface text-sm text-foreground/40">
        {/* Animated wireframe cube lands in Phase D, once the 3D engine exists */}
        wireframe cube
      </div>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">CubeLab</h1>
      <p className="text-lg text-foreground/60">Learn. Solve. Master.</p>
      <Link href="/solver/health" className={buttonStyles({ size: 'lg' })}>
        Solve Your Cube
      </Link>
      <div className="flex gap-6 text-sm text-foreground/60">
        <Link href="/learn" className="hover:text-foreground">
          Learn
        </Link>
        <Link href="/algorithms" className="hover:text-foreground">
          Algorithms
        </Link>
      </div>
    </section>
  )
}
