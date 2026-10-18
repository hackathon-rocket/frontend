import type { ReactNode } from 'react'

/** Dočasná obrazovka pre úlohy, ktoré ešte nie sú hotové. */
export default function Placeholder({ title, task, children }: { title: string; task: string; children?: ReactNode }) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-ink tracking-tight">{title}</h1>
      <p className="mt-3 text-muted">Pripravujeme ({task}).</p>
      {children}
    </div>
  )
}
