import { NavLink, Outlet } from 'react-router'
import { USE_MOCK } from '../config'

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors',
    isActive ? 'bg-white text-primary' : 'text-white/90 hover:bg-white/15 hover:text-white',
  ].join(' ')

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center gap-3 sm:gap-8 h-16">
          <NavLink to="/" className="flex items-center gap-2.5 font-bold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M4 1.5h7l4 4V16a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 4 16z" fill="#2870ed"/><rect x="6.5" y="8.5" width="6" height="1.6" rx=".8" fill="#fff"/><rect x="6.5" y="11.5" width="4.5" height="1.6" rx=".8" fill="#fff"/></svg>
            </span>
            <span className="hidden sm:inline whitespace-nowrap text-[17px] tracking-tight">eGrant Extrakcia</span>
          </NavLink>
          <nav className="flex gap-1 sm:gap-2" aria-label="Hlavná navigácia">
            <NavLink to="/" end className={navClass}>Nový doklad</NavLink>
            <NavLink to="/doklady" className={navClass}>Doklady</NavLink>
          </nav>
          {USE_MOCK && (
            <span
              className="ml-auto whitespace-nowrap rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white"
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
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 text-sm text-muted">
          Údaje navrhuje AI — pred zápisom do formulára ich vždy skontroluje a potvrdí človek.
        </div>
      </footer>
    </div>
  )
}
