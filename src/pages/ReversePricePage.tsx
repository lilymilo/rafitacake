import { useEffect, useMemo, useState } from 'react'
import { IconAlert, IconShieldCheck } from '../components/Icons'
import { Card, CardHeader, PctInput, PlatformConfiguredBadge, RupiahInput, StatusBadge } from '../components/ui'
import { formatPct, formatRupiah } from '../lib/format'
import { breakEvenPrice, calculateMargin, maxDiscount, roundDownTo, roundUpTo, solvePrice } from '../lib/margin'
import { ROUNDING_STEPS } from '../lib/storage'
import { useAppStore } from '../lib/store'
import type { DraftPricing } from './CalculatorPage'

export function ReversePricePage({
  initialDraft,
  onApplyToCalculator,
}: {
  initialDraft: DraftPricing | null
  onApplyToCalculator: (draft: DraftPricing) => void
}) {
  const { state } = useAppStore()
  const target = { minPct: state.settings.targetMinPct, maxPct: state.settings.targetMaxPct }

  const [mode, setMode] = useState<'margin' | 'profit'>('margin')
  const [hpp, setHpp] = useState(initialDraft?.hpp ?? 45000)
  const [packaging, setPackaging] = useState(initialDraft?.packaging ?? 5000)
  const [platformId, setPlatformId] = useState(initialDraft?.platformId ?? state.platforms[0]?.id ?? 'gofood')
  const [targetMarginPct, setTargetMarginPct] = useState(state.settings.targetMinPct)
  const [targetProfit, setTargetProfit] = useState(25000)
  const [discountPct, setDiscountPct] = useState(initialDraft?.discountPct ?? 10)
  const [discountAmount, setDiscountAmount] = useState(initialDraft?.discountAmount ?? 0)
  const [roundingStep, setRoundingStep] = useState<number>(state.settings.roundingStep)

  // Input untuk kalkulator batas diskon maksimal
  const [currentPrice, setCurrentPrice] = useState(initialDraft?.price ?? 95000)

  useEffect(() => {
    if (!initialDraft) return
    setHpp(initialDraft.hpp)
    setPackaging(initialDraft.packaging)
    setPlatformId(initialDraft.platformId)
    setDiscountPct(initialDraft.discountPct)
    setDiscountAmount(initialDraft.discountAmount)
    if (initialDraft.price > 0) setCurrentPrice(initialDraft.price)
  }, [initialDraft])

  const platform = state.platforms.find((p) => p.id === platformId) ?? state.platforms[0]
  const totalHpp = (Number.isFinite(hpp) ? hpp : 0) + (Number.isFinite(packaging) ? packaging : 0)
  const validBase = totalHpp > 0 && Number.isFinite(discountPct) && discountPct >= 0 && discountPct < 100 && Number.isFinite(discountAmount) && discountAmount >= 0

  const solved = useMemo(() => {
    if (!validBase) return null
    return solvePrice(
      {
        hpp: totalHpp,
        discountPct,
        discountAmount,
        targetMarginPct: mode === 'margin' ? (Number.isFinite(targetMarginPct) ? targetMarginPct : 0) : 0,
        targetProfit: mode === 'profit' ? (Number.isFinite(targetProfit) ? targetProfit : 0) : 0,
      },
      platform,
    )
  }, [validBase, totalHpp, discountPct, discountAmount, mode, targetMarginPct, targetProfit, platform])

  const breakEven = useMemo(() => {
    if (!validBase) return null
    return breakEvenPrice({ hpp: totalHpp, discountPct, discountAmount }, platform)
  }, [validBase, totalHpp, discountPct, discountAmount, platform])

  const roundedPrice = solved?.ok ? roundUpTo(solved.price, roundingStep) : null
  const verified = useMemo(() => {
    if (!roundedPrice) return null
    return calculateMargin({ hpp: totalHpp, price: roundedPrice, discountPct, discountAmount }, platform, target)
  }, [roundedPrice, totalHpp, discountPct, discountAmount, platform, target])

  const maxDiscResult = useMemo(() => {
    if (!(totalHpp > 0) || !(currentPrice > 0)) return null
    return maxDiscount(
      {
        hpp: totalHpp,
        price: currentPrice,
        discountAmount: Number.isFinite(discountAmount) ? discountAmount : 0,
        minMarginPct: state.settings.targetMinPct,
      },
      platform,
    )
  }, [totalHpp, currentPrice, discountAmount, state.settings.targetMinPct, platform])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-terracotta">ReversePrice Planner</p>
        <h1 className="mt-1 font-[var(--font-display)] text-2xl font-bold tracking-tight text-espresso sm:text-3xl">
          Hitung Harga Jual dari Target Laba
        </h1>
        <p className="mt-1 text-sm text-muted">
          Tentukan target margin atau laba bersih per kue terlebih dahulu — sistem menghitungkan harga jual yang aman saat ikut promo.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Form Input */}
        <Card className="lg:col-span-5">
          <CardHeader title="Parameter Target" subtitle="Pilih target margin (%) atau target laba (Rp)" />

          <div className="space-y-4">
            {/* Switch Mode */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-cream p-1">
              <button
                type="button"
                onClick={() => setMode('margin')}
                className={`cursor-pointer rounded-lg py-2 text-xs font-semibold transition ${
                  mode === 'margin' ? 'bg-surface text-espresso shadow-xs' : 'text-muted hover:text-espresso'
                }`}
              >
                Target Margin (%)
              </button>
              <button
                type="button"
                onClick={() => setMode('profit')}
                className={`cursor-pointer rounded-lg py-2 text-xs font-semibold transition ${
                  mode === 'profit' ? 'bg-surface text-espresso shadow-xs' : 'text-muted hover:text-espresso'
                }`}
              >
                Target Laba (Rp)
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <RupiahInput label="HPP Bahan &amp; Produksi" value={hpp} onChange={setHpp} />
              <RupiahInput label="Kemasan / Box" value={packaging} onChange={setPackaging} />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="rev-platform" className="text-xs font-semibold text-espresso">
                  Platform Penjualan
                </label>
                <PlatformConfiguredBadge configured={platform.configured} />
              </div>
              <select
                id="rev-platform"
                value={platform.id}
                onChange={(e) => setPlatformId(e.target.value)}
                className="mt-1.5 w-full cursor-pointer rounded-xl border border-cream-dark bg-surface px-3 py-2.5 text-sm font-medium text-espresso outline-none focus:border-terracotta"
              >
                {state.platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.commissionPct + p.servicePct}%)
                  </option>
                ))}
              </select>
            </div>

            {mode === 'margin' ? (
              <PctInput
                label="Target Margin Bersih (%)"
                value={targetMarginPct}
                onChange={setTargetMarginPct}
                helper={`Referensi toko: ${target.minPct}%–${target.maxPct}% dari harga setelah diskon`}
              />
            ) : (
              <RupiahInput
                label="Target Laba Bersih per Unit"
                value={targetProfit}
                onChange={setTargetProfit}
                helper="Keuntungan bersih yang ingin masuk kantong per kue"
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <PctInput label="Rencana Diskon (%)" value={discountPct} onChange={setDiscountPct} />
              <RupiahInput label="Voucher Toko" value={discountAmount} onChange={setDiscountAmount} />
            </div>

            <div>
              <span className="block text-xs font-semibold text-espresso">Pembulatan Harga ke Atas</span>
              <div className="mt-1.5 flex gap-2">
                {ROUNDING_STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setRoundingStep(step)}
                    className={`flex-1 cursor-pointer rounded-xl border py-2 text-xs font-semibold transition ${
                      roundingStep === step
                        ? 'border-terracotta bg-terracotta-soft text-terracotta'
                        : 'border-cream-dark bg-surface text-muted hover:text-espresso'
                    }`}
                  >
                    {formatRupiah(step)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Hasil Reverse Pricing */}
        <div className="space-y-5 lg:col-span-7">
          <Card>
            <CardHeader title="Rekomendasi Harga Jual" subtitle="Dibulatkan ke atas agar margin tidak turun di bawah target" />

            {!validBase ? (
              <p className="text-sm text-loss">Pastikan HPP &gt; Rp0 dan diskon antara 0%–99%.</p>
            ) : solved && !solved.ok ? (
              <div className="flex items-start gap-3 rounded-xl border border-loss/30 bg-loss-soft/60 p-4 text-xs text-loss">
                <IconAlert size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Target tidak mungkin dicapai secara matematis</p>
                  <p className="mt-1 text-espresso-light">
                    Gabungan biaya platform ({platform.commissionPct + platform.servicePct}%) dan target margin (
                    {targetMarginPct}%) mencapai 100% atau lebih. Turunkan target margin atau periksa tarif platform.
                  </p>
                </div>
              </div>
            ) : solved && solved.ok && verified && roundedPrice ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-safe/30 bg-safe-soft/50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-safe">
                      <IconShieldCheck size={16} /> Harga Jual Disarankan
                    </span>
                    <StatusBadge status={verified.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-baseline gap-3">
                    <span className="num font-[var(--font-display)] text-3xl font-bold text-espresso">
                      {formatRupiah(roundedPrice)}
                    </span>
                    <span className="num text-xs text-muted">
                      (hitungan tepat: {formatRupiah(solved.price)})
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-safe/20 pt-3 text-xs sm:grid-cols-3">
                    <div>
                      <span className="text-muted">Harga setelah diskon</span>
                      <p className="num font-semibold text-espresso">{formatRupiah(verified.netPrice)}</p>
                    </div>
                    <div>
                      <span className="text-muted">Laba bersih aktual</span>
                      <p className="num font-semibold text-safe">{formatRupiah(verified.profit)}</p>
                    </div>
                    <div>
                      <span className="text-muted">Margin aktual</span>
                      <p className="num font-semibold text-safe">{formatPct(verified.marginPct)}</p>
                    </div>
                  </div>
                </div>

                {breakEven && breakEven.ok && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cream-dark/70 bg-ivory/80 px-4 py-3 text-xs">
                    <span className="text-muted">
                      Titik Impas / Break-Even (laba Rp0 pada skema diskon ini):
                    </span>
                    <strong className="num text-sm text-espresso">{formatRupiah(roundUpTo(breakEven.price, 100))}</strong>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    onApplyToCalculator({
                      name: initialDraft?.name ?? 'Produk Target Baru',
                      hpp: Number.isFinite(hpp) ? hpp : 0,
                      packaging: Number.isFinite(packaging) ? packaging : 0,
                      price: roundedPrice,
                      discountPct,
                      discountAmount,
                      platformId: platform.id,
                    })
                  }
                  className="w-full cursor-pointer rounded-xl bg-espresso px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-espresso-light"
                >
                  Terapkan Harga Ini ke Kalkulator Margin
                </button>
              </div>
            ) : null}
          </Card>

          {/* Cek Batas Maksimal Diskon */}
          <Card>
            <CardHeader
              title="Cek Batas Maksimal Diskon"
              subtitle={`Berapa diskon terbesar yang boleh dipasang tanpa melanggar target minimal ${state.settings.targetMinPct}%?`}
            />
            <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
              <RupiahInput
                label="Jika Harga Jual Saat Ini"
                value={currentPrice}
                onChange={setCurrentPrice}
              />
              <div className="rounded-xl border border-cream-dark/80 bg-ivory px-4 py-3">
                {maxDiscResult?.ok ? (
                  <>
                    <p className="text-xs text-muted">Diskon Maksimal Aman</p>
                    <p className="num text-xl font-bold text-terracotta">
                      {formatPct(roundDownTo(maxDiscResult.maxDiscountPct, 0.5))}
                    </p>
                    <p className="text-[11px] text-muted">
                      (tepatnya {formatPct(maxDiscResult.maxDiscountPct)}, dibulatkan ke bawah)
                    </p>
                  </>
                ) : (
                  <p className="text-xs font-medium text-loss">
                    Harga jual ini belum mencapai margin minimal {state.settings.targetMinPct}% meski tanpa diskon.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
