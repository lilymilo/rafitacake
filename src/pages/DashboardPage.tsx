import { useMemo } from 'react'
import { IconAlert, IconArrowRight, IconBox, IconCalculator, IconPlus, IconSettings, IconShieldCheck } from '../components/Icons'
import { Card, CardHeader, DemoBadge, MetricCard, PlatformConfiguredBadge, StatusBadge } from '../components/ui'
import { formatPct, formatRupiah } from '../lib/format'
import { calculateMargin } from '../lib/margin'
import { useAppStore } from '../lib/store'
import type { MarginTarget } from '../lib/types'

export type RouteName = 'dashboard' | 'calculator' | 'reverse' | 'compare' | 'products' | 'settings'

export function DashboardPage({
  onNavigate,
  onSelectProductForCalc,
}: {
  onNavigate: (route: RouteName) => void
  onSelectProductForCalc: (productId: string) => void
}) {
  const { state, loadDemoProducts, clearDemoProducts } = useAppStore()
  const target: MarginTarget = { minPct: state.settings.targetMinPct, maxPct: state.settings.targetMaxPct }

  const evaluated = useMemo(() => {
    return state.products.map((product) => {
      const platform = state.platforms.find((p) => p.id === product.platformId) ?? state.platforms[0]
      const res = calculateMargin(
        {
          hpp: product.hpp + product.packaging,
          price: product.price,
          discountPct: product.discountPct,
          discountAmount: product.discountAmount,
        },
        platform,
        target,
      )
      return { product, platform, res }
    })
  }, [state.products, state.platforms, target])

  const hasDemo = state.products.some((p) => p.isDemo)
  const unconfiguredCount = state.platforms.filter((p) => !p.configured).length

  const summary = useMemo(() => {
    if (evaluated.length === 0) {
      return { avgMargin: null as number | null, atRiskCount: 0, safeCount: 0, totalProfitPerUnit: 0 }
    }
    const validMargins = evaluated.map((e) => e.res.marginPct).filter((m): m is number => m !== null)
    const avgMargin = validMargins.length > 0 ? validMargins.reduce((a, b) => a + b, 0) / validMargins.length : null
    const atRiskCount = evaluated.filter((e) => e.res.status === 'loss' || e.res.status === 'below').length
    const safeCount = evaluated.filter((e) => e.res.status === 'safe' || e.res.status === 'above').length
    const totalProfitPerUnit = evaluated.reduce((acc, e) => acc + e.res.profit, 0)
    return { avgMargin, atRiskCount, safeCount, totalProfitPerUnit }
  }, [evaluated])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-terracotta">Ringkasan Toko</p>
          <h1 className="mt-1 font-[var(--font-display)] text-2xl font-bold tracking-tight text-espresso sm:text-3xl">
            Pantauan Margin &amp; Promo
          </h1>
          <p className="mt-1 text-sm text-muted">
            Cek kesehatan keuntungan produk sebelum diskon dipasang. Target aman saat ini:{' '}
            <strong className="text-espresso">
              {target.minPct}% sampai {target.maxPct}%
            </strong>
            .
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate('calculator')}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-terracotta px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-terracotta-hover"
          >
            <IconCalculator size={17} />
            Hitung Margin
          </button>
          <button
            type="button"
            onClick={() => onNavigate('reverse')}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cream-dark bg-surface px-4 py-2.5 text-sm font-semibold text-espresso transition hover:bg-cream"
          >
            Cari Harga Jual
          </button>
        </div>
      </div>

      {/* Peringatan tarif platform belum diisi */}
      {unconfiguredCount > 0 && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-below/30 bg-below-soft/70 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <IconAlert className="mt-0.5 shrink-0 text-below" size={18} />
            <div className="text-xs leading-relaxed text-espresso">
              <p className="font-semibold">
                {unconfiguredCount} dari {state.platforms.length} aplikasi jualan belum diatur tarif komisinya.
              </p>
              <p className="mt-0.5 text-muted">
                Tiap aplikasi punya potongan komisi berbeda. Masukkan tarif resmi dari dashboard toko Anda agar hitungan laba tidak meleset.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-surface px-3.5 py-2 text-xs font-semibold text-espresso shadow-xs transition hover:bg-cream"
          >
            <IconSettings size={15} />
            Atur Tarif
          </button>
        </div>
      )}

      {/* Banner penanda data simulasi */}
      {hasDemo && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cream-dark bg-cream/70 px-4 py-3 text-xs">
          <div className="flex items-center gap-2.5 text-espresso">
            <DemoBadge />
            <span>Daftar di bawah masih berisi data contoh simulasi untuk latihan, bukan transaksi asli toko.</span>
          </div>
          <button
            type="button"
            onClick={clearDemoProducts}
            className="cursor-pointer font-semibold text-terracotta hover:underline"
          >
            Hapus data contoh
          </button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <MetricCard
          label="Total Produk Tersimpan"
          value={String(state.products.length)}
          hint={state.products.length === 0 ? 'Belum ada produk' : `${summary.safeCount} aman, ${summary.atRiskCount} perlu dicek`}
        />
        <MetricCard
          label="Rata-rata Margin"
          value={formatPct(summary.avgMargin)}
          hint={`Target toko ${target.minPct}% sampai ${target.maxPct}%`}
          accent={
            summary.avgMargin === null
              ? undefined
              : summary.avgMargin >= target.minPct
                ? 'safe'
                : 'loss'
          }
        />
        <MetricCard
          label="Produk Perlu Dicek"
          value={String(summary.atRiskCount)}
          hint={summary.atRiskCount > 0 ? 'Margin di bawah target toko' : 'Semua produk aman'}
          accent={summary.atRiskCount > 0 ? 'loss' : 'safe'}
        />
        <MetricCard
          label="Akumulasi Laba per Pcs"
          value={formatRupiah(summary.totalProfitPerUnit)}
          hint="Jika tiap kue laku terjual 1 buah"
          accent="terracotta"
        />
      </div>

      {/* Konten Utama 2 Kolom */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Daftar Produk */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Daftar Margin Produk"
            subtitle="Klik nama kue untuk menguji simulasi diskon di kalkulator"
            action={
              state.products.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onNavigate('products')}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-terracotta hover:underline"
                >
                  Lihat semua <IconArrowRight size={14} />
                </button>
              ) : undefined
            }
          />

          {evaluated.length === 0 ? (
            <div className="rounded-xl border border-dashed border-cream-dark bg-ivory/70 p-6 text-center">
              <IconBox className="mx-auto text-muted" size={28} />
              <h3 className="mt-2.5 text-sm font-semibold text-espresso">Belum ada kue yang dicatat</h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted">
                Mulai hitung margin kue pertama Anda di Kalkulator, atau muat data contoh simulasi untuk melihat cara kerjanya.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onNavigate('calculator')}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-terracotta px-4 py-2 text-xs font-semibold text-white transition hover:bg-terracotta-hover"
                >
                  <IconPlus size={15} />
                  Tambah Produk Baru
                </button>
                <button
                  type="button"
                  onClick={loadDemoProducts}
                  className="cursor-pointer rounded-xl border border-cream-dark bg-surface px-4 py-2 text-xs font-semibold text-espresso transition hover:bg-cream"
                >
                  Muat Contoh Simulasi
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-cream-dark/60">
              {evaluated.slice(0, 6).map(({ product, platform, res }) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onSelectProductForCalc(product.id)}
                  className="flex w-full cursor-pointer flex-col justify-between gap-2 py-3 text-left transition hover:bg-ivory/80 sm:flex-row sm:items-center sm:px-2 sm:rounded-xl"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-espresso">{product.name}</span>
                      {product.isDemo && <DemoBadge />}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {platform.name} · Jual {formatRupiah(product.price)}
                      {product.discountPct > 0 ? ` (diskon ${product.discountPct}%)` : ''} · Modal{' '}
                      {formatRupiah(product.hpp + product.packaging)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className={`num text-sm font-bold ${res.profit >= 0 ? 'text-espresso' : 'text-loss'}`}>
                        {formatRupiah(res.profit)}
                      </p>
                      <p className="num text-xs text-muted">Margin {formatPct(res.marginPct)}</p>
                    </div>
                    <StatusBadge status={res.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Kolom Kanan: Status Platform & Aktivitas */}
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Potongan Komisi Aplikasi"
              subtitle="Dasar potongan tiap pesanan"
              action={
                <button
                  type="button"
                  onClick={() => onNavigate('settings')}
                  className="cursor-pointer text-xs font-semibold text-terracotta hover:underline"
                >
                  Ubah
                </button>
              }
            />
            <div className="space-y-2.5">
              {state.platforms.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-cream-dark/60 bg-ivory/60 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-espresso">{p.name}</p>
                    <p className="num text-[11px] text-muted">
                      {p.commissionPct + p.servicePct}%{p.fixedFee > 0 ? ` + ${formatRupiah(p.fixedFee)}` : ''}
                    </p>
                  </div>
                  <PlatformConfiguredBadge configured={p.configured} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Catatan Aktivitas" subtitle="Tersimpan di perangkat ini" />
            {state.activity.length === 0 ? (
              <p className="text-xs text-muted">Belum ada catatan terbaru.</p>
            ) : (
              <ul className="space-y-2.5">
                {state.activity.slice(0, 5).map((act) => (
                  <li key={act.id} className="flex items-start gap-2.5 text-xs">
                    <IconShieldCheck size={14} className="mt-0.5 shrink-0 text-terracotta" />
                    <div className="min-w-0">
                      <p className="text-espresso">{act.label}</p>
                      <p className="text-[11px] text-muted">
                        {new Date(act.at).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
