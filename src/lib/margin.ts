/**
 * MESIN HITUNG MARGIN RAFITACAKE
 * ==============================
 * Semua fungsi di sini adalah "fungsi murni": input sama → output sama, tanpa efek samping.
 * Karena itu mudah diuji (lihat margin.test.ts) dan mudah dijelaskan.
 *
 * Rumus maju (SmartMargin Guard):
 *   Harga setelah diskon   P' = P × (1 − d) − A
 *   Dasar komisi           B  = P' (afterDiscount) atau P (beforeDiscount)
 *   Biaya platform         F  = B × r + biayaTetap        (r = komisi% + layanan%)
 *   Pendapatan bersih      N  = P' − F
 *   Laba bersih            L  = N − HPP
 *   Margin (sales margin)  M  = L ÷ P' × 100%
 *
 * Rumus mundur (ReversePrice Planner) diturunkan dari rumus di atas — lihat solvePrice().
 */
import type { FeeConfig, MarginResult, MarginStatus, MarginTarget, PricingInput } from './types'

const pct = (value: number) => value / 100

/** Total komisi persen (komisi + layanan) dalam bentuk pecahan. */
export function feeRate(fee: FeeConfig): number {
  return pct(fee.commissionPct) + pct(fee.servicePct)
}

/** Harga yang dibayar pembeli setelah diskon persen lalu potongan nominal. */
export function netPriceOf(price: number, discountPct: number, discountAmount: number): number {
  return price * (1 - pct(discountPct)) - discountAmount
}

export function marginStatus(marginPct: number | null, profit: number, target: MarginTarget): MarginStatus {
  if (marginPct === null || profit < 0) return 'loss'
  if (marginPct < target.minPct) return 'below'
  if (marginPct > target.maxPct) return 'above'
  return 'safe'
}

/** Hitung rincian laba & margin dari harga jual (alur maju). */
export function calculateMargin(input: PricingInput, fee: FeeConfig, target: MarginTarget): MarginResult {
  const { hpp, price, discountPct, discountAmount } = input
  const netPrice = netPriceOf(price, discountPct, discountAmount)
  const discountValue = price - netPrice
  const feeBaseAmount = fee.feeBase === 'afterDiscount' ? netPrice : price
  const percentFee = feeBaseAmount * feeRate(fee)
  const totalFee = percentFee + fee.fixedFee
  const netRevenue = netPrice - totalFee
  const profit = netRevenue - hpp
  const marginPct = netPrice > 0 ? (profit / netPrice) * 100 : null
  const markupPct = hpp > 0 ? (profit / hpp) * 100 : null

  return {
    price,
    discountValue,
    netPrice,
    feeBaseAmount,
    percentFee,
    fixedFee: fee.fixedFee,
    totalFee,
    netRevenue,
    hpp,
    profit,
    marginPct,
    markupPct,
    status: marginStatus(marginPct, profit, target),
  }
}

export type SolveFailure = 'impossible' | 'invalidDiscount' | 'notAchievable'

export type SolvePriceResult =
  | { ok: true; price: number; netPrice: number }
  | { ok: false; reason: SolveFailure }

export interface SolvePriceInput {
  hpp: number
  discountPct: number
  discountAmount: number
  /** Target margin (persen dari harga setelah diskon). Default 0. */
  targetMarginPct?: number
  /** Target laba nominal per unit (Rupiah). Default 0. */
  targetProfit?: number
}

/**
 * Cari harga jual P supaya:  laba = m × P' + L
 * (m = target margin, L = target laba nominal; biasanya salah satunya 0).
 *
 * afterDiscount:   P' = (HPP + F + L) ÷ (1 − r − m)          lalu  P = (P' + A) ÷ (1 − d)
 * beforeDiscount:  P  = (HPP + F + L + A(1 − m)) ÷ ((1 − d)(1 − m) − r)
 *
 * Jika penyebut ≤ 0 → target mustahil (biaya platform + target margin ≥ 100%).
 */
export function solvePrice(input: SolvePriceInput, fee: FeeConfig): SolvePriceResult {
  const m = pct(input.targetMarginPct ?? 0)
  const L = input.targetProfit ?? 0
  const k = 1 - pct(input.discountPct)
  const A = input.discountAmount
  const r = feeRate(fee)
  const F = fee.fixedFee

  if (k <= 0) return { ok: false, reason: 'invalidDiscount' }

  let price: number
  if (fee.feeBase === 'afterDiscount') {
    const denom = 1 - r - m
    if (denom <= 0) return { ok: false, reason: 'impossible' }
    const netPrice = (input.hpp + F + L) / denom
    price = (netPrice + A) / k
  } else {
    const denom = k * (1 - m) - r
    if (denom <= 0) return { ok: false, reason: 'impossible' }
    price = (input.hpp + F + L + A * (1 - m)) / denom
  }

  const netPrice = netPriceOf(price, input.discountPct, A)
  if (!(netPrice > 0) || !Number.isFinite(price)) return { ok: false, reason: 'impossible' }
  return { ok: true, price, netPrice }
}

export type MaxDiscountResult = { ok: true; maxDiscountPct: number } | { ok: false; reason: SolveFailure }

/**
 * Diskon persen terbesar agar margin tetap ≥ minMarginPct pada harga jual tertentu.
 *
 * afterDiscount:  P'min = (HPP + F) ÷ (1 − r − m)           d ≤ 1 − (P'min + A) ÷ P
 * beforeDiscount: P'min = (P×r + F + HPP) ÷ (1 − m)         d ≤ 1 − (P'min + A) ÷ P
 */
export function maxDiscount(
  input: { hpp: number; price: number; discountAmount: number; minMarginPct: number },
  fee: FeeConfig,
): MaxDiscountResult {
  const m = pct(input.minMarginPct)
  const r = feeRate(fee)
  const F = fee.fixedFee
  const { hpp, price, discountAmount: A } = input
  if (!(price > 0)) return { ok: false, reason: 'impossible' }

  let minNetPrice: number
  if (fee.feeBase === 'afterDiscount') {
    const denom = 1 - r - m
    if (denom <= 0) return { ok: false, reason: 'impossible' }
    minNetPrice = (hpp + F) / denom
  } else {
    if (1 - m <= 0) return { ok: false, reason: 'impossible' }
    minNetPrice = (price * r + F + hpp) / (1 - m)
  }

  const d = 1 - (minNetPrice + A) / price
  if (d < 0) return { ok: false, reason: 'notAchievable' }
  return { ok: true, maxDiscountPct: Math.min(d * 100, 100) }
}

/** Harga impas (laba = 0) pada skema diskon tertentu. */
export function breakEvenPrice(input: Omit<SolvePriceInput, 'targetMarginPct' | 'targetProfit'>, fee: FeeConfig) {
  return solvePrice({ ...input, targetMarginPct: 0, targetProfit: 0 }, fee)
}

/**
 * Bulatkan KE ATAS ke kelipatan step (mis. 500 → Rp68.889 menjadi Rp69.000).
 * Dibulatkan ke atas supaya margin tidak turun di bawah target.
 * Epsilon mencegah galat floating point (690.0000001 tidak menjadi 691).
 */
export function roundUpTo(value: number, step: number): number {
  if (!(step > 0)) return value
  return Math.ceil(value / step - 1e-9) * step
}

/** Bulatkan KE BAWAH (dipakai untuk batas diskon agar tetap aman). */
export function roundDownTo(value: number, step: number): number {
  if (!(step > 0)) return value
  return Math.floor(value / step + 1e-9) * step
}

/** Deret margin untuk grafik "margin vs diskon". */
export function marginCurve(
  input: Omit<PricingInput, 'discountPct'>,
  fee: FeeConfig,
  target: MarginTarget,
  maxDiscountPct = 60,
  step = 5,
): { discountPct: number; marginPct: number | null; profit: number }[] {
  const points: { discountPct: number; marginPct: number | null; profit: number }[] = []
  for (let d = 0; d <= maxDiscountPct + 1e-9; d += step) {
    const r = calculateMargin({ ...input, discountPct: d }, fee, target)
    points.push({ discountPct: d, marginPct: r.marginPct, profit: r.profit })
  }
  return points
}
