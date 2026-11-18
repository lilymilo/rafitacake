import { useEffect, useState, type ReactNode } from 'react'
import {
  IconAlert,
  IconBox,
  IconCalculator,
  IconCompare,
  IconDashboard,
  IconSettings,
  IconShieldCheck,
  IconTarget,
} from './components/Icons'
import { AppProvider, useAppStore } from './lib/store'
import { CalculatorPage, type DraftPricing } from './pages/CalculatorPage'
import { ComparePage } from './pages/ComparePage'
import { DashboardPage, type RouteName } from './pages/DashboardPage'
import { ProductsPage } from './pages/ProductsPage'
import { ReversePricePage } from './pages/ReversePricePage'
import { SettingsPage } from './pages/SettingsPage'

const ROUTES: { id: RouteName; hash: string; label: string; shortLabel: string; icon: (size: number) => ReactNode }[] = [
  { id: 'dashboard', hash: '#/', label: 'Dashboard', shortLabel: 'Beranda', icon: (s) => <IconDashboard size={s} /> },
  { id: 'calculator', hash: '#/kalkulator', label: 'SmartMargin Guard', shortLabel: 'Kalkulator', icon: (s) => <IconCalculator size={s} /> },
  { id: 'reverse', hash: '#/target-harga', label: 'ReversePrice Planner', shortLabel: 'Target', icon: (s) => <IconTarget size={s} /> },
  { id: 'compare', hash: '#/bandingkan', label: 'Bandingkan Platform', shortLabel: 'Bandingkan', icon: (s) => <IconCompare size={s} /> },
  { id: 'products', hash: '#/produk', label: 'Produk Tersimpan', shortLabel: 'Produk', icon: (s) => <IconBox size={s} /> },
  { id: 'settings', hash: '#/pengaturan', label: 'Pengaturan Tarif', shortLabel: 'Tarif', icon: (s) => <IconSettings size={s} /> },
]

function routeFromHash(): RouteName {
  const h = window.location.hash || '#/'
  const found = ROUTES.find((r) => r.hash === h)
  return found ? found.id : 'dashboard'
}

function AppShell() {
  const { state, storageAvailable, recovered, saveFailed } = useAppStore()
  const [route, setRoute] = useState<RouteName>(() => routeFromHash())
  const [calcDraft, setCalcDraft] = useState<DraftPricing | null>(null)
  const [reverseDraft, setReverseDraft] = useState<DraftPricing | null>(null)

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function navigate(target: RouteName) {
    const info = ROUTES.find((r) => r.id === target) ?? ROUTES[0]
    if (window.location.hash !== info.hash) {
      window.location.hash = info.hash
    }
    setRoute(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openProductInCalculator(productId: string) {
    const p = state.products.find((item) => item.id === productId)
    if (!p) return
    setCalcDraft({
      productId: p.id,
      name: p.name,
      hpp: p.hpp,
      packaging: p.packaging,
      price: p.price,
      discountPct: p.discountPct,
      discountAmount: p.discountAmount,
      platformId: p.platformId,
    })
    navigate('calculator')
  }

  const unconfiguredCount = state.platforms.filter((p) => !p.configured).length

  return (
    <div className="min-h-screen bg-ivory text-espresso lg:flex">
      {/* Sidebar Desktop */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-cream-dark/80 bg-surface px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div>
          <div className="flex items-center gap-2.5 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-espresso text-ivory shadow-xs">
              <IconShieldCheck size={19} />
            </div>
            <div>
              <span className="block font-[var(--font-display)] text-lg font-bold tracking-tight text-espresso">
                RAFITACAKE
              </span>
              <span className="block text-[11px] font-medium text-muted">Margin &amp; Promo Guard</span>
            </div>
          </div>

          <nav className="mt-8 space-y-1" aria-label="Navigasi utama">
            {ROUTES.map((item) => {
              const active = route === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                    active
                      ? 'bg-terracotta-soft text-terracotta'
                      : 'text-muted hover:bg-ivory hover:text-espresso'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon(18)}
                    {item.label}
                  </span>
                  {item.id === 'settings' && unconfiguredCount > 0 && (
                    <span className="num rounded-full bg-below-soft px-1.5 py-0.5 text-[10px] font-bold text-below">
                      {unconfiguredCount}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="rounded-2xl border border-cream-dark/70 bg-ivory p-3.5 text-xs">
          <p className="font-semibold text-espresso">Target Aman Toko</p>
          <p className="num mt-0.5 text-muted">
            {state.settings.targetMinPct}% – {state.settings.targetMaxPct}% sales margin
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Data tersimpan otomatis di browser (localStorage).
          </p>
        </div>
      </aside>

      {/* Area Konten Utama */}
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-8">
        {/* Topbar Mobile */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-cream-dark/80 bg-surface/95 px-4 py-3 backdrop-blur-sm lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-espresso text-ivory">
              <IconShieldCheck size={16} />
            </div>
            <span className="font-[var(--font-display)] text-base font-bold text-espresso">RAFITACAKE</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('settings')}
            aria-label="Buka Pengaturan Tarif"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-cream-dark bg-ivory px-2.5 py-1.5 text-xs font-semibold text-espresso"
          >
            <IconSettings size={15} />
            Tarif
            {unconfiguredCount > 0 && (
              <span className="num rounded-full bg-below px-1.5 text-[10px] font-bold text-white">
                {unconfiguredCount}
              </span>
            )}
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Notice kondisi storage */}
          {(!storageAvailable || recovered || saveFailed) && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-below/30 bg-below-soft px-4 py-3 text-xs text-espresso">
              <IconAlert size={16} className="mt-0.5 shrink-0 text-below" />
              <span>
                {!storageAvailable
                  ? 'Penyimpanan browser tidak tersedia (mode privat). Perubahan hanya bertahan selama tab terbuka.'
                  : recovered
                    ? 'Data penyimpanan sebelumnya rusak dan telah dipulihkan ke kondisi awal yang aman.'
                    : 'Gagal menyimpan ke browser (penyimpanan penuh).'}
              </span>
            </div>
          )}

          {route === 'dashboard' && (
            <DashboardPage onNavigate={navigate} onSelectProductForCalc={openProductInCalculator} />
          )}
          {route === 'calculator' && (
            <CalculatorPage
              initialDraft={calcDraft}
              onSendToReverse={(draft) => {
                setReverseDraft(draft)
                navigate('reverse')
              }}
              onGoSettings={() => navigate('settings')}
            />
          )}
          {route === 'reverse' && (
            <ReversePricePage
              initialDraft={reverseDraft}
              onApplyToCalculator={(draft) => {
                setCalcDraft(draft)
                navigate('calculator')
              }}
            />
          )}
          {route === 'compare' && <ComparePage onGoSettings={() => navigate('settings')} />}
          {route === 'products' && (
            <ProductsPage
              onOpenInCalc={openProductInCalculator}
              onNewProduct={() => {
                setCalcDraft(null)
                navigate('calculator')
              }}
            />
          )}
          {route === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Bottom Navigation Mobile (5 menu utama) */}
      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-cream-dark/90 bg-surface/95 px-1 py-1.5 backdrop-blur-md lg:hidden"
      >
        {ROUTES.slice(0, 5).map((item) => {
          const active = route === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              className={`flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition ${
                active ? 'text-terracotta' : 'text-muted'
              }`}
            >
              {item.icon(19)}
              <span className="truncate">{item.shortLabel}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
