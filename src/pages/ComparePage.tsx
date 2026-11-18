import { useMemo, useState } from 'react'
import { PlatformBarChart } from '../components/Charts'
import { IconAlert, IconSettings } from '../components/Icons'
import { Card, CardHeader, PctInput, PlatformConfiguredBadge, RupiahInput, StatusBadge } from '../components/ui'
import { formatPct, formatRupiah } from '../lib/format'
import { calculateMargin, roundUpTo, solvePrice } from '../lib/margin'
import { useAppStore } from '../lib/store'
import { hasErrors, validatePricing } from '../lib/validation'

export function ComparePage({ onGoSettings }: { onGoSettings: () => void }) {
  const { state } = useAppStore()
  const target = { minPct: state.settings.targetMinPct, maxPct: state.settings.targetMaxPct }

  const [selectedProductId, setSelectedProductId] = useState<string>('custom')
  const [hpp, setHpp] = useState(45000)
  const [packaging, setPackaging] = useState(5000)
  const [price, setPrice] = useState(95000)
  const [discountPct, setDiscountPct] = useState(10)
  const [discountAmount, setDiscountAmount] = useState(0)

  function handleSelectProduct(id: string) {
    setSelectedProductId(id)
    if (id === 'custom') return
    const p = state.products.find((item) => item.id === id)
    if (!p) return
    setHpp(p.hpp)
    setPackaging(p.packaging)
    setPrice(p.price)
    setDiscountPct(p.discountPct)
    setDiscountAmount(p.discountAmount)
  }

  const totalHpp = (Number.isFinite(hpp) ? hpp : 0) + (Number.isFinite(packaging) ? packaging : 0)
  const errors = useMemo(
    () =>
      validatePricing({
        hpp: totalHpp,
        price,
        discountPct: Number.isFinite(discountPct) ? discountPct : 0,
        discountAmount: Number.isFinite(discountAmount) ? discountAmount : 0,
      }),
    [totalHpp, price, discountPct, discountAmount],
  )
  const valid = !hasErrors(errors)

  const rows = useMemo(() => {
    if (!valid) return []
    return state.platforms.map((platform) => {
      const res = calculateMargin(
        {
          hpp: totalHpp,
          price,
          discountPct: Number.isFinite(discountPct) ? discountPct : 0,
          discountAmount: Number.isFinite(discountAmount) ? discountAmount : 0,
        },
        platform,
        target,
      )
      const minTargetPrice = solvePrice(
        {
          hpp: totalHpp,
          discountPct: Number.isFinite(discountPct) ? discountPct : 0,
          discountAmount: Number.isFinite(discountAmount) ? discountAmount : 0,
          targetMarginPct: target.minPct,
        },
        platform,
      )
      return {
        platform,
        res,
        recommendedPrice: minTargetPrice.ok ? roundUpTo(minTargetPrice.price, state.settings.roundingStep) : null,
      }
    })
  }, [valid, state.platforms, totalHpp, price, discountPct, discountAmount, target, state.settings.roundingStep])

  const hasUnconfigured = state.platforms.some((p) => !p.configured)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-terracotta">Simulasi Multi-Platform</p>
        <h1 className="mt-1 font-[var(--font-display)] text-2xl font-bold tracking-tight text-espresso sm:text-3xl">
          Perbandingan Biaya &amp; Laba Platform
        </h1>
        <p className="mt-1 text-sm text-muted">
          Lihat perbedaan potongan biaya admin dan keuntungan bersih di GoFood, TikTok Shop, GrabFood, maupun platform kustom.
        </p>
      </div>

      {hasUnconfigured && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-below/30 bg-below-soft/70 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <IconAlert className="mt-0.5 shrink-0 text-below" size={18} />
            <p className="text-xs leading-relaxed text-espresso">
              Sebagian platform masih menggunakan tarif <strong>0% (belum diatur)</strong>. Isi tarif sesuai dashboard merchant masing-masing agar perbandingan realistis.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoSettings}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-surface px-3.5 py-2 text-xs font-semibold text-espresso shadow-xs transition hover:bg-cream"
          >
            <IconSettings size={15} />
            Isi Tarif Platform
          </button>
        </div>
      )}

      {/* Input Produk untuk Dibandingkan */}
      <Card>
        <CardHeader
          title="Pilih atau Masukkan Angka Produk"
          subtitle="Satu set angka langsung disimulasikan ke semua platform"
          action={
            state.products.length > 0 ? (
              <select
                aria-label="Muat dari produk tersimpan"
                value={selectedProductId}
                onChange={(e) => handleSelectProduct(e.target.value)}
                className="cursor-pointer rounded-xl border border-cream-dark bg-ivory px-3 py-1.5 text-xs font-semibold text-espresso outline-none focus:border-terracotta"
              >
                <option value="custom">Input Manual</option>
                {state.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : undefined
          }
        />

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          <RupiahInput label="HPP Bahan" value={hpp} onChange={setHpp} error={errors.hpp} />
          <RupiahInput label="Kemasan / Box" value={packaging} onChange={setPackaging} />
          <RupiahInput label="Harga Jual" value={price} onChange={setPrice} error={errors.price} />
          <PctInput label="Diskon (%)" value={discountPct} onChange={setDiscountPct} error={errors.discountPct} />
          <RupiahInput
            label="Voucher Toko"
            value={discountAmount}
            onChange={setDiscountAmount}
            error={errors.discountAmount}
          />
        </div>
      </Card>

      {valid && rows.length > 0 && (
        <>
          <Card>
            <CardHeader title="Visualisasi Laba Bersih per Platform" subtitle="Perbandingan keuntungan kantong per 1 unit terjual" />
            <PlatformBarChart
              rows={rows.map((r) => ({
                id: r.platform.id,
                name: r.platform.name,
                profit: r.res.profit,
                marginPct: r.res.marginPct,
                configured: r.platform.configured,
              }))}
            />
          </Card>

          {/* Tampilan Kartu (Mobile) & Tabel (Desktop) tanpa horizontal overflow */}
          <div className="grid gap-4 md:hidden">
            {rows.map(({ platform, res, recommendedPrice }) => (
              <Card key={platform.id} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-espresso">{platform.name}</h3>
                    <p className="num text-xs text-muted">
                      Tarif: {platform.commissionPct + platform.servicePct}%
                      {platform.fixedFee > 0 ? ` + ${formatRupiah(platform.fixedFee)}` : ''}
                    </p>
                  </div>
                  <PlatformConfiguredBadge configured={platform.configured} />
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl bg-ivory p-3 text-xs">
                  <div>
                    <span className="text-muted">Biaya Platform</span>
                    <p className="num font-semibold text-loss">-{formatRupiah(res.totalFee)}</p>
                  </div>
                  <div>
                    <span className="text-muted">Pendapatan Bersih</span>
                    <p className="num font-semibold text-espresso">{formatRupiah(res.netRevenue)}</p>
                  </div>
                  <div>
                    <span className="text-muted">Laba Bersih</span>
                    <p className={`num font-bold ${res.profit >= 0 ? 'text-safe' : 'text-loss'}`}>
                      {formatRupiah(res.profit)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted">Margin</span>
                    <p className="num font-bold text-espresso">{formatPct(res.marginPct)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <StatusBadge status={res.status} />
                  {recommendedPrice && (
                    <span className="num text-muted">
                      Saran min. {target.minPct}%: <strong className="text-espresso">{formatRupiah(recommendedPrice)}</strong>
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <Card className="hidden md:block">
            <CardHeader
              title="Tabel Perbandingan Detail"
              subtitle={`Termasuk rekomendasi harga jual minimal agar margin ≥ ${target.minPct}% di masing-masing platform`}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cream-dark text-xs font-semibold text-muted">
                    <th className="pb-3 pr-4">Platform</th>
                    <th className="pb-3 pr-4">Skema Tarif</th>
                    <th className="pb-3 pr-4 text-right">Biaya Platform</th>
                    <th className="pb-3 pr-4 text-right">Pendapatan Bersih</th>
                    <th className="pb-3 pr-4 text-right">Laba Bersih</th>
                    <th className="pb-3 pr-4 text-right">Margin</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 text-right">Saran Harga Min. {target.minPct}%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark/60">
                  {rows.map(({ platform, res, recommendedPrice }) => (
                    <tr key={platform.id} className="transition hover:bg-ivory/60">
                      <td className="py-3.5 pr-4">
                        <div className="font-semibold text-espresso">{platform.name}</div>
                        <div className="mt-0.5">
                          <PlatformConfiguredBadge configured={platform.configured} />
                        </div>
                      </td>
                      <td className="num py-3.5 pr-4 text-xs text-muted">
                        {platform.commissionPct + platform.servicePct}%
                        {platform.fixedFee > 0 ? ` + ${formatRupiah(platform.fixedFee)}` : ''}
                        <div className="text-[11px]">
                          {platform.feeBase === 'afterDiscount' ? 'dari harga diskon' : 'dari harga awal'}
                        </div>
                      </td>
                      <td className="num py-3.5 pr-4 text-right font-medium text-loss">
                        -{formatRupiah(res.totalFee)}
                      </td>
                      <td className="num py-3.5 pr-4 text-right font-medium text-espresso">
                        {formatRupiah(res.netRevenue)}
                      </td>
                      <td className={`num py-3.5 pr-4 text-right font-bold ${res.profit >= 0 ? 'text-espresso' : 'text-loss'}`}>
                        {formatRupiah(res.profit)}
                      </td>
                      <td className="num py-3.5 pr-4 text-right font-bold text-espresso">
                        {formatPct(res.marginPct)}
                      </td>
                      <td className="py-3.5 pr-4">
                        <StatusBadge status={res.status} />
                      </td>
                      <td className="num py-3.5 text-right font-semibold text-terracotta">
                        {recommendedPrice ? formatRupiah(recommendedPrice) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
