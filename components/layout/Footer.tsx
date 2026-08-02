import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-8 text-sm text-foreground/60 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} CubeLab</p>
        <div className="flex gap-4">
          <Link href="/about">About</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>
    </footer>
  )
}
