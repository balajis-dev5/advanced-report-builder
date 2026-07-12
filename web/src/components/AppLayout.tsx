import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import ThemeToggle from './ThemeToggle'

interface NavItem {
  label: string
  to?: string
  soon?: boolean
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Reports', soon: true },
  { label: 'Data sources', soon: true },
  { label: 'Schedules', soon: true },
  { label: 'Settings', soon: true },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-4 flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          A
        </span>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Report Builder
        </span>
      </div>
      {navItems.map((item) =>
        item.to ? (
          <NavLink
            key={item.label}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`
            }
          >
            {item.label}
          </NavLink>
        ) : (
          <span
            key={item.label}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 dark:text-zinc-600"
          >
            {item.label}
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              Soon
            </span>
          </span>
        ),
      )}
    </nav>
  )

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-zinc-200 bg-white md:block dark:border-zinc-800 dark:bg-zinc-900">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-60 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="md:pl-60">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur md:px-8 dark:border-zinc-800 dark:bg-zinc-900/80">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 md:hidden dark:border-zinc-800 dark:text-zinc-300"
            aria-label="Open navigation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>

          <div className="flex flex-1 items-center justify-end gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-3 border-l border-zinc-200 pl-3 dark:border-zinc-800">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {user?.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{user?.email}</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {user?.name?.charAt(0).toUpperCase() ?? '?'}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
