import { redirect } from 'next/navigation'

/**
 * Until additional Solver sub-pages exist, /solver itself just forwards to
 * the one real feature (Health Check) rather than showing a dead-end
 * placeholder — the Nav's "Solver" link already points straight at
 * /solver/health; this covers anyone landing on /solver directly
 * (bookmarks, typed URLs) (D-041).
 */
export default function SolverPage() {
  redirect('/solver/health')
}
