import { useEffect, useMemo, useState } from 'react'
import { MarginCurveChart, PriceBreakdownBar } from '../components/Charts'
import { IconAlert, IconPlus, IconShieldCheck } from '../components/Icons'
import {
  Card,
  CardHeader,
  PctInput,
  PlatformConfiguredBadge,
  RupiahInput,
  StatusBadge,
  statusBannerClass,
  statusDescription,
} from '../components/ui'
import { formatPct, formatRupiah } from '../lib/format'
import { calculateMargin, marginCurve, maxDiscount } from '../lib/margin'
import { useAppStore } from '../lib/store'
import { hasErrors, validatePricing } from '../lib/validation'

export interface DraftPricing {
  productId?: string
  name: string
  hpp: number
  packaging: number
  price: number
  discountPct: number
  discountAmount: number
  platformId: string
}

export function CalculatorPage({
  initialDraft,
  onSendToReverse,
  onGoSettings,
}: {
  initialDraft: DraftPricing | null
  onSendToReverse: (draft: DraftPricing) => void
  onGoSettings: () => void
}) {
  const { state, addProduct, updateProduct } = useAppStore()
  const target = { minPct: state.settings.targetMinPct, maxPct: state.settings.targetMaxPct }

  const [productId, setProductId] = useState<string | undefined>(initialDraft?.productId)
  const [name, setName] = useState(initialDraft?.name ?? 'Kue Tart Coklat')
  const [hpp, setHpp] = useState(initialDraft?.hpp ?? 45000)
  const [packaging, setPackaging] = useState(initialDraft?.packaging ?? 5000)
  const [price, setPrice] = useState(initialDraft?.price ?? 95000)
  const [discountPct, setDiscountPct] = useState(initialDraft?.discountPct ?? 10)
  const [discountAmount, setDiscountAmount] = useState(initialDraft?.discountAmount ?? 0)
  const [platformId, setPlatformId] = useState(initialDraft?.platformId ?? state.platforms[0]?.id ?? 'gofood')
  const [savedNotice, setSavedNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!initialDraft) return
    setProductId(initialDraft.productId)
    setName(initialDraft.name)
    setHpp(initialDraft.hpp)
    setPackaging(initialDraft.packaging)
    setPrice(initialDraft.price)
    setDiscountPct(initialDraft.discountPct)
    setDiscountAmount(initialDraft.discountAmount)
    setPlatformId(initialDraft.platformId)
    setSavedNotice(null)
  }, [initialDraft])

  const platform = state.platforms.find((p) => p.id === platformId) ?? state.platforms[0]
  const totalHpp = (Number.isFinite(hpp) ? hpp : 0) + (Number.isFinite(packaging) ? packaging : 0)

  const errors = useMemo(
    () =>
      validatePricing(
        {
          hpp: totalHpp,
          price,
          discountPct: Number.isFinite(discountPct) ? discountPct : 0,
          discountAmount: Number.isFinite(discountAmount) ? discountAmount : 0,
        },
        platform,
      ),
    [totalHpp, price, discountPct, discountAmount, platform],
  )

  const valid = !hasErrors(errors)

  const result = useMemo(() => {
    if (!valid) return null
    return calculateMargin(
      {
        hpp: totalHpp,
        price,
        discountPct: Number.isFinite(discountPct) ? discountPct : 0,
        discountAmount: Number.isFinite(discountAmount) ? discountAmount : 0,
      },
      platform,
      target,
    )
  }, [valid, totalHpp, price, discountPct, discountAmount, platform, target])

  const safeMaxDisc = useMemo(() => {
    if (!valid) return null
    return maxDiscount(
      {
        hpp: totalHpp,
        price,
        discountAmount: Number.isFinite(discountAmount) ? discountAmount : 0,
        minMarginPct: target.minPct,
      },
      platform,
    )
  }, [valid, totalHpp, price, discountAmount, target.minPct, platform])

  const curve = useMemo(() => {
    if (!valid) return []
    return marginCurve(
      {
        hpp: totalHpp,
        price,
        discountAmount: Number.isFinite(discountAmount) ? discountAmount : 0,
      },
      platform,
      target,
      60,
      5,
    )
  }, [valid, totalHpp, price, discountAmount, platform, target])

  function handleSave() {
    if (!valid) return
    const cleanName = name.trim() || 'Produk Tanpa Nama'
    const payload = {
      name: cleanName,
      hpp: Number.isFinite(hpp) ? hpp : 0,
      packaging: Number.isFinite(packaging) ? packaging : 0,
      price,
      discountPct: Number.isFinite(discountPct) ? discountPct : 0,
      discountAmount: Number.isFinite(discountAmount) ? discountAmount : 0,
      platformId: platform.id,
      isDemo: false,
    }
    if (productId && state.products.some((p) => p.id === productId)) {
      updateProduct(productId, payload)
      setSavedNotice(`"${cleanName}" diperbarui.`)
    } else {
      const created = addProduct(payload)
      setProductId(created.id)
      setSavedNotice(`"${cleanName}" disimpan ke daftar produk.`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-terracotta">Kalkulator Promo</p>
        <h1 className="mt-1 font-[var(--font-display)] text-2xl font-bold tracking-tight text-espresso sm:text-3xl">
          Kalkulator Margin &amp; Simulasi Diskon
        </h1>
        <p className="mt-1 text-sm text-muted">
          Coba geser besaran diskon dan lihat langsung: toko masih untung pas, untung tebal, atau malah tekor.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Form Input */}
        <Card className="lg:col-span-5">
          <CardHeader title="Modal &amp; Rencana Harga" subtitle="Masukkan modal bahan, kemasan, dan harga yang mau dipasang" />

          <div className="space-y-4">
            <div>
              <label htmlFor="calc-name" className="block text-xs font-semibold text-espresso">
                Nama Kue / Produk
              </label>
              <input
                id="calc-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Brownies Fudgy 20cm"
                className="mt-1.5 w-full rounded-xl border border-cream-dark bg-surface px-3 py-2 text-sm text-espresso outline-none transition focus:border-terracotta"
              />
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <RupiahInput
                label="Modal Bahan (HPP)"
                value={hpp}
                onChange={setHpp}
                error={errors.hpp}
                helper="Biaya adonan &amp; bahan kue"
              />
              <RupiahInput
                label="Biaya Kemasan &amp; Box"
                value={packaging}
                onChange={setPackaging}
                helper="Kotak, pita, &amp; stiker"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="calc-platform" className="text-xs font-semibold text-espresso">
                  Pilih Aplikasi Penjualan
                </label>
                <PlatformConfiguredBadge configured={platform.configured} />
              </div>
              <select
                id="calc-platform"
                value={platform.id}
                onChange={(e) => setPlatformId(e.target.value)}
                className="mt-1.5 w-full cursor-pointer rounded-xl border border-cream-dark bg-surface px-3 py-2.5 text-sm font-medium text-espresso outline-none transition focus:border-terracotta"
              >
                {state.platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.commissionPct + p.servicePct}%{p.fixedFee > 0 ? ` + ${formatRupiah(p.fixedFee)}` : ''})
                  </option>
                ))}
              </select>
              {!platform.configured && (
                <p className="mt-1.5 text-xs text-below">
                  Tarif {platform.name} masih 0%.{' '}
                  <button type="button" onClick={onGoSettings} className="cursor-pointer font-semibold underline">
                    Atur komisi resmi di Pengaturan
                  </button>
                </p>
              )}
            </div>

            <RupiahInput
              label="Harga Jual Sebelum Diskon"
              value={price}
              onChange={setPrice}
              error={errors.price}
            />

            {/* Slider Diskon Real-time */}
            <div className="rounded-xl border border-cream-dark/70 bg-ivory/70 p-3.5">
              <div className="flex items-center justify-between">
                <label htmlFor="discount-slider" className="text-xs font-semibold text-espresso">
                  Uji Diskon Promo Toko
                </label>
                <span className="num rounded-lg bg-terracotta-soft px-2 py-0.5 text-xs font-bold text-terracotta">
                  {Number.isFinite(discountPct) ? discountPct : 0}%
                </span>
              </div>
              <input
                id="discount-slider"
                type="range"
                min={0}
                max={60}
                step={1}
                value={Number.isFinite(discountPct) ? Math.min(60, Math.max(0, discountPct)) : 0}
                onChange={(e) => setDiscountPct(Number(e.target.value))}
                className="bakery-slider mt-3 w-full"
              />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <PctInput
                  label="Diskon (%)"
                  value={discountPct}
                  onChange={setDiscountPct}
                  error={errors.discountPct}
                />
                <RupiahInput
                  label="Voucher Toko (Rp)"
                  value={discountAmount}
                  onChange={setDiscountAmount}
                  error={errors.discountAmount}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                disabled={!valid}
                onClick={handleSave}
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-terracotta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-terracotta-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconPlus size={16} />
                {productId ? 'Perbarui Data Kue' : 'Simpan ke Daftar Kue'}
              </button>
              <button
                type="button"
                onClick={() =>
                  onSendToReverse({
                    productId,
                    name,
                    hpp: Number.isFinite(hpp) ? hpp : 0,
                    packaging: Number.isFinite(packaging) ? packaging : 0,
                    price: Number.isFinite(price) ? price : 0,
                    discountPct: Number.isFinite(discountPct) ? discountPct : 0,
                    discountAmount: Number.isFinite(discountAmount) ? discountAmount : 0,
                    platformId: platform.id,
                  })
                }
                className="cursor-pointer rounded-xl border border-cream-dark bg-surface px-4 py-2.5 text-sm font-semibold text-espresso transition hover:bg-cream"
              >
                Hitung Balik Harga
              </button>
            </div>

            {savedNotice && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-safe">
                <IconShieldCheck size={15} /> {savedNotice}
              </p>
            )}
          </div>
        </Card>

        {/* Panel Hasil */}
        <div className="space-y-5 lg:col-span-7">
          {result ? (
            <>
              {/* Banner Status Margin */}
              <div className={`rounded-2xl border p-5 transition-colors ${statusBannerClass(result.status)}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StatusBadge status={result.status} />
                  {safeMaxDisc && safeMaxDisc.ok && (
                    <span className="num text-xs font-semibold text-espresso">
                      Batas aman diskon maksimal: {formatPct(safeMaxDisc.maxDiscountPct)}
                    </span>
                  )}
                  {safeMaxDisc && !safeMaxDisc.ok && safeMaxDisc.reason === 'notAchievable' && (
                    <span className="text-xs font-semibold text-loss">
                      Harga ini belum mencapai margin minimal {target.minPct}%
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted">Laba Bersih per Pcs</p>
                    <p className={`num mt-0.5 text-2xl font-bold ${result.profit >= 0 ? 'text-espresso' : 'text-loss'}`}>
                      {formatRupiah(result.profit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Margin Keuntungan</p>
                    <p className="num mt-0.5 text-2xl font-bold text-espresso">{formatPct(result.marginPct)}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-xs text-muted">Markup dari Modal</p>
                    <p className="num mt-0.5 text-lg font-semibold text-espresso-light">{formatPct(result.markupPct)}</p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-espresso-light">{statusDescription(result.status, target)}</p>
              </div>

              {/* Rincian Angka */}
              <Card>
                <CardHeader title="Rincian Perhitungan" subtitle="Transparan langkah demi langkah (Margin Keuntungan)" />
                <PriceBreakdownBar result={result} />

                <dl className="mt-5 divide-y divide-cream-dark/60 text-sm">
                  <div className="flex justify-between py-2">
                    <dt className="text-muted">Harga Jual Awal</dt>
                    <dd className="num font-medium text-espresso">{formatRupiah(result.price)}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-muted">Potongan Diskon &amp; Voucher Toko</dt>
                    <dd className="num font-medium text-loss">-{formatRupiah(result.discountValue)}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="font-medium text-espresso">Harga yang Dibayar Pembeli</dt>
                    <dd className="num font-semibold text-espresso">{formatRupiah(result.netPrice)}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-muted">
                      Potongan {platform.name} ({platform.commissionPct + platform.servicePct}%
                      {platform.feeBase === 'beforeDiscount' ? ' dari harga awal' : ' dari harga setelah diskon'}
                      {platform.fixedFee > 0 ? ` + ${formatRupiah(platform.fixedFee)}` : ''})
                    </dt>
                    <dd className="num font-medium text-loss">-{formatRupiah(result.totalFee)}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="font-medium text-espresso">Uang Bersih yang Diterima Toko</dt>
                    <dd className="num font-semibold text-espresso">{formatRupiah(result.netRevenue)}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-muted">Total Modal (Bahan + Kemasan)</dt>
                    <dd className="num font-medium text-loss">-{formatRupiah(result.hpp)}</dd>
                  </div>
                  <div className="flex justify-between pt-3 text-base">
                    <dt className="font-bold text-espresso">Keuntungan Bersih Toko</dt>
                    <dd className={`num font-bold ${result.profit >= 0 ? 'text-safe' : 'text-loss'}`}>
                      {formatRupiah(result.profit)} ({formatPct(result.marginPct)})
                    </dd>
                  </div>
                </dl>
              </Card>

              {/* Grafik Kurva Margin vs Diskon */}
              <Card>
                <CardHeader
                  title="Grafik Ketahanan Diskon"
                  subtitle="Lihat di batas diskon berapa persen toko Anda mulai merugi pada harga ini"
                />
                <MarginCurveChart
                  points={curve}
                  activeDiscountPct={Number.isFinite(discountPct) ? discountPct : 0}
                  target={target}
                />
              </Card>
            </>
          ) : (
            <Card>
              <div className="flex items-start gap-3 text-sm text-loss">
                <IconAlert size={20} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Periksa data yang belum lengkap</p>
                  <p className="mt-1 text-xs text-muted">Pastikan modal dan harga jual sudah diisi angka yang benar pada form di sebelah kiri.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
