import { useMemo, useState } from 'react'
import { IconBox, IconPlus, IconTrash } from '../components/Icons'
import { Card, DemoBadge, StatusBadge } from '../components/ui'
import { formatPct, formatRupiah } from '../lib/format'
import { calculateMargin } from '../lib/margin'
import { useAppStore } from '../lib/store'
import type { MarginStatus, MarginTarget } from '../lib/types'

export function ProductsPage({
  onOpenInCalc,
  onNewProduct,
}: {
  onOpenInCalc: (productId: string) => void
  onNewProduct: () => void
}) {
  const { state, deleteProduct, loadDemoProducts, clearDemoProducts } = useAppStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | MarginStatus>('all')
  const target: MarginTarget = { minPct: state.settings.targetMinPct, maxPct: state.settings.targetMaxPct }

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.products
      .map((product) => {
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
      .filter(({ product, res }) => {
        if (q && !product.name.toLowerCase().includes(q)) return false
        if (filter !== 'all' && res.status !== filter) return false
        return true
      })
  }, [state.products, state.platforms, target, query, filter])

  const hasDemo = state.products.some((p) => p.isDemo)

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-terracotta">Katalog Toko</p>
          <h1 className="mt-1 font-[var(--font-display)] text-2xl font-bold tracking-tight text-espresso sm:text-3xl">
            Daftar Kue Tersimpan
          </h1>
          <p className="mt-1 text-sm text-muted">
            Kelola daftar kue, pantau status margin tiap menu, dan buka kembali untuk menguji promo baru.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {hasDemo ? (
            <button
              type="button"
              onClick={clearDemoProducts}
              className="cursor-pointer rounded-xl border border-cream-dark bg-surface px-3.5 py-2 text-xs font-semibold text-muted transition hover:text-espresso"
            >
              Hapus Data Contoh
            </button>
          ) : (
            <button
              type="button"
              onClick={loadDemoProducts}
              className="cursor-pointer rounded-xl border border-cream-dark bg-surface px-3.5 py-2 text-xs font-semibold text-espresso transition hover:bg-cream"
            >
              Muat Contoh Simulasi
            </button>
          )}
          <button
            type="button"
            onClick={onNewProduct}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-terracotta px-4 py-2 text-xs font-semibold text-white transition hover:bg-terracotta-hover"
          >
            <IconPlus size={15} />
            Tambah Kue Baru
          </button>
        </div>
      </div>

      {/* Filter & Pencarian */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama kue..."
          className="w-full rounded-xl border border-cream-dark bg-surface px-3.5 py-2 text-sm text-espresso outline-none transition focus:border-terracotta sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['all', 'Semua Kue'],
              ['safe', 'Aman'],
              ['below', 'Di Bawah Target'],
              ['loss', 'Rugi'],
              ['above', 'Di Atas Target'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === key
                  ? 'bg-espresso text-white'
                  : 'border border-cream-dark bg-surface text-muted hover:text-espresso'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <Card className="py-10 text-center">
          <IconBox className="mx-auto text-muted" size={30} />
          <p className="mt-2.5 text-sm font-semibold text-espresso">Belum ada kue yang cocok</p>
          <p className="mt-1 text-xs text-muted">
            {state.products.length === 0
              ? 'Simpan kue pertama Anda dari Kalkulator Margin atau muat data contoh simulasi.'
              : 'Coba ubah kata kunci pencarian atau filter status.'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(({ product, platform, res }) => (
            <Card key={product.id} className="flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="truncate text-sm font-bold text-espresso">{product.name}</h3>
                      {product.isDemo && <DemoBadge />}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{platform.name}</p>
                  </div>
                  <StatusBadge status={res.status} />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl bg-ivory p-3 text-xs">
                  <div>
                    <dt className="text-muted">Modal (Bahan + Box)</dt>
                    <dd className="num font-semibold text-espresso">
                      {formatRupiah(product.hpp + product.packaging)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Harga Pasang</dt>
                    <dd className="num font-semibold text-espresso">
                      {formatRupiah(product.price)}
                      {product.discountPct > 0 ? ` (-${product.discountPct}%)` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Laba Bersih</dt>
                    <dd className={`num font-bold ${res.profit >= 0 ? 'text-safe' : 'text-loss'}`}>
                      {formatRupiah(res.profit)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Sales Margin</dt>
                    <dd className="num font-bold text-espresso">{formatPct(res.marginPct)}</dd>
                  </div>
                </dl>
              </div>

              <div className="flex items-center gap-2 border-t border-cream-dark/60 pt-3">
                <button
                  type="button"
                  onClick={() => onOpenInCalc(product.id)}
                  className="flex-1 cursor-pointer rounded-xl bg-cream px-3 py-2 text-xs font-semibold text-espresso transition hover:bg-cream-dark"
                >
                  Uji Promo di Kalkulator
                </button>
                <button
                  type="button"
                  onClick={() => deleteProduct(product.id)}
                  aria-label={`Hapus ${product.name}`}
                  className="cursor-pointer rounded-xl border border-cream-dark p-2 text-muted transition hover:border-loss/40 hover:bg-loss-soft hover:text-loss"
                >
                  <IconTrash size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
