import { NavLink, Outlet } from 'react-router'
import { USE_MOCK } from '../config'

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'px-1 py-2 text-sm font-medium whitespace-nowrap border-b-[3px] transition-colors',
    isActive ? 'border-mark text-ink' : 'border-transparent text-muted hover:text-ink',
  ].join(' ')

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-surface border-b border-line">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center gap-4 sm:gap-8 h-14">
          <NavLink to="/" className="flex items-center gap-2 text-ink font-semibold">
            <img src="/favicon.svg" alt="eGrant Extrakcia" className="h-6 w-6" />
            <span className="hidden sm:inline whitespace-nowrap">eGrant Extrakcia</span>
          </NavLink>
          <nav className="flex gap-4 sm:gap-6 self-stretch items-end" aria-label="Hlavná navigácia">
            <NavLink to="/" end className={navClass}>Nový doklad</NavLink>
            <NavLink to="/doklady" className={navClass}>Doklady</NavLink>
          </nav>
          {USE_MOCK && (
            <span
              className="ml-auto whitespace-nowrap text-xs text-review bg-mark/15 border border-mark/40 rounded px-2 py-1"
              title="Odpovede servera sú simulované. Prepnete cez VITE_USE_MOCK=false."
            >
              Demo režim
            </span>
          )}
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        <Outlet />
      </main>
    </div>
  )
}
