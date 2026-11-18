import { describe, expect, it } from 'vitest'
import {
  breakEvenPrice,
  calculateMargin,
  marginCurve,
  marginStatus,
  maxDiscount,
  roundDownTo,
  roundUpTo,
  solvePrice,
} from './margin'
import type { FeeConfig, MarginTarget } from './types'

// CATATAN: semua angka tarif di bawah adalah ANGKA SIMULASI untuk pengujian rumus,
// bukan tarif resmi platform mana pun.
const target: MarginTarget = { minPct: 35, maxPct: 50 }
const noFee: FeeConfig = { commissionPct: 0, servicePct: 0, fixedFee: 0, feeBase: 'afterDiscount' }
const feeAfter: FeeConfig = { commissionPct: 20, servicePct: 0, fixedFee: 1000, feeBase: 'afterDiscount' }
const feeBefore: FeeConfig = { ...feeAfter, feeBase: 'beforeDiscount' }

describe('calculateMargin — alur maju (SmartMargin Guard)', () => {
  it('menghitung rincian sesuai hitungan manual (komisi dari harga setelah diskon)', () => {
    // P=50.000, diskon 10% → P'=45.000; biaya = 45.000×20% + 1.000 = 10.000
    // pendapatan bersih 35.000; laba = 35.000 − 30.000 = 5.000; margin = 5.000/45.000 = 11,11%
    const r = calculateMargin({ hpp: 30000, price: 50000, discountPct: 10, discountAmount: 0 }, feeAfter, target)
    expect(r.discountValue).toBe(5000)
    expect(r.netPrice).toBe(45000)
    expect(r.feeBaseAmount).toBe(45000)
    expect(r.percentFee).toBe(9000)
    expect(r.totalFee).toBe(10000)
    expect(r.netRevenue).toBe(35000)
    expect(r.profit).toBe(5000)
    expect(r.marginPct).toBeCloseTo(11.1111, 3)
    expect(r.markupPct).toBeCloseTo(16.6667, 3)
    expect(r.status).toBe('below')
  })

  it('komisi dari harga SEBELUM diskon menghasilkan biaya lebih besar', () => {
    // biaya = 50.000×20% + 1.000 = 11.000; pendapatan 34.000; laba 4.000; margin 8,89%
    const r = calculateMargin({ hpp: 30000, price: 50000, discountPct: 10, discountAmount: 0 }, feeBefore, target)
    expect(r.feeBaseAmount).toBe(50000)
    expect(r.totalFee).toBe(11000)
    expect(r.profit).toBe(4000)
    expect(r.marginPct).toBeCloseTo(8.8889, 3)
  })

  it('menerapkan diskon persen dulu, lalu potongan nominal', () => {
    const r = calculateMargin({ hpp: 20000, price: 50000, discountPct: 10, discountAmount: 5000 }, noFee, target)
    expect(r.netPrice).toBe(40000)
    expect(r.discountValue).toBe(10000)
    expect(r.profit).toBe(20000)
    expect(r.marginPct).toBe(50)
  })

  it('menandai rugi jika laba negatif', () => {
    const r = calculateMargin({ hpp: 50000, price: 50000, discountPct: 0, discountAmount: 0 }, feeAfter, target)
    expect(r.profit).toBe(-11000)
    expect(r.status).toBe('loss')
  })

  it('margin null & status rugi jika harga setelah diskon ≤ 0', () => {
    const r = calculateMargin({ hpp: 1000, price: 10000, discountPct: 0, discountAmount: 10000 }, noFee, target)
    expect(r.marginPct).toBeNull()
    expect(r.status).toBe('loss')
  })
})

describe('marginStatus — batas target inklusif', () => {
  it.each([
    [34.99, 'below'],
    [35, 'safe'],
    [50, 'safe'],
    [50.01, 'above'],
    [0, 'below'],
  ] as const)('margin %s%% → %s', (m, expected) => {
    expect(marginStatus(m, 1, target)).toBe(expected)
  })
  it('target bisa diubah pengguna (bukan aturan baku 35–50%)', () => {
    expect(marginStatus(25, 1, { minPct: 20, maxPct: 30 })).toBe('safe')
  })
})

describe('solvePrice — alur mundur (ReversePrice Planner)', () => {
  it('target margin 35% tanpa diskon: P = 31.000 / 0,45', () => {
    const r = solvePrice({ hpp: 30000, discountPct: 0, discountAmount: 0, targetMarginPct: 35 }, feeAfter)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.price).toBeCloseTo(68888.889, 2)
    const check = calculateMargin({ hpp: 30000, price: r.price, discountPct: 0, discountAmount: 0 }, feeAfter, target)
    expect(check.marginPct).toBeCloseTo(35, 6)
  })

  it('pembulatan ke atas Rp500 tetap memenuhi target (contoh di dokumen: Rp69.000 → 35,07%)', () => {
    const r = solvePrice({ hpp: 30000, discountPct: 0, discountAmount: 0, targetMarginPct: 35 }, feeAfter)
    if (!r.ok) throw new Error('harus berhasil')
    const rounded = roundUpTo(r.price, 500)
    expect(rounded).toBe(69000)
    const check = calculateMargin({ hpp: 30000, price: rounded, discountPct: 0, discountAmount: 0 }, feeAfter, target)
    expect(check.profit).toBe(24200)
    expect(check.marginPct).toBeCloseTo(35.072, 2)
  })

  it('target margin dengan rencana diskon 10% (komisi setelah diskon)', () => {
    const r = solvePrice({ hpp: 30000, discountPct: 10, discountAmount: 0, targetMarginPct: 35 }, feeAfter)
    if (!r.ok) throw new Error('harus berhasil')
    expect(r.price).toBeCloseTo(76543.21, 1)
    expect(r.netPrice).toBeCloseTo(68888.889, 2)
  })

  it('target margin dengan diskon 10% (komisi sebelum diskon): P = 31.000 / 0,385', () => {
    const r = solvePrice({ hpp: 30000, discountPct: 10, discountAmount: 0, targetMarginPct: 35 }, feeBefore)
    if (!r.ok) throw new Error('harus berhasil')
    expect(r.price).toBeCloseTo(80519.48, 1)
    const check = calculateMargin({ hpp: 30000, price: r.price, discountPct: 10, discountAmount: 0 }, feeBefore, target)
    expect(check.marginPct).toBeCloseTo(35, 6)
  })

  it('target laba nominal Rp15.000: P\' = 46.000 / 0,8 = 57.500', () => {
    const r = solvePrice({ hpp: 30000, discountPct: 0, discountAmount: 0, targetProfit: 15000 }, feeAfter)
    if (!r.ok) throw new Error('harus berhasil')
    expect(r.price).toBeCloseTo(57500, 6)
    const check = calculateMargin({ hpp: 30000, price: r.price, discountPct: 0, discountAmount: 0 }, feeAfter, target)
    expect(check.profit).toBeCloseTo(15000, 6)
  })

  it('menolak target mustahil (komisi 70% + margin 35% ≥ 100%)', () => {
    const r = solvePrice(
      { hpp: 30000, discountPct: 0, discountAmount: 0, targetMarginPct: 35 },
      { ...feeAfter, commissionPct: 70 },
    )
    expect(r).toEqual({ ok: false, reason: 'impossible' })
  })

  it('menolak diskon 100%', () => {
    const r = solvePrice({ hpp: 30000, discountPct: 100, discountAmount: 0, targetMarginPct: 35 }, feeAfter)
    expect(r).toEqual({ ok: false, reason: 'invalidDiscount' })
  })

  it('harga impas (laba = 0): P = 31.000 / 0,8 = 38.750', () => {
    const r = breakEvenPrice({ hpp: 30000, discountPct: 0, discountAmount: 0 }, feeAfter)
    if (!r.ok) throw new Error('harus berhasil')
    expect(r.price).toBeCloseTo(38750, 6)
  })

  // Uji "bolak-balik": harga hasil solvePrice, jika dihitung maju, harus kembali ke target.
  const grid = {
    hpp: [5000, 30000, 125000],
    discountPct: [0, 15, 40],
    discountAmount: [0, 2000],
    targetMarginPct: [0, 20, 35, 50],
    fee: [noFee, feeAfter, feeBefore, { commissionPct: 12.5, servicePct: 4, fixedFee: 2500, feeBase: 'beforeDiscount' as const }],
  }
  for (const hpp of grid.hpp)
    for (const discountPct of grid.discountPct)
      for (const discountAmount of grid.discountAmount)
        for (const targetMarginPct of grid.targetMarginPct)
          for (const fee of grid.fee) {
            it(`bolak-balik hpp=${hpp} d=${discountPct}% A=${discountAmount} m=${targetMarginPct}% ${fee.feeBase} r=${fee.commissionPct + fee.servicePct}%`, () => {
              const r = solvePrice({ hpp, discountPct, discountAmount, targetMarginPct }, fee)
              if (!r.ok) {
                expect(r.reason).toBe('impossible')
                return
              }
              const check = calculateMargin({ hpp, price: r.price, discountPct, discountAmount }, fee, target)
              expect(check.marginPct).toBeCloseTo(targetMarginPct, 6)
            })
          }
})

describe('maxDiscount — batas maksimal diskon', () => {
  it('komisi setelah diskon: 1 − 68.888,89 / 80.000 = 13,89%', () => {
    const r = maxDiscount({ hpp: 30000, price: 80000, discountAmount: 0, minMarginPct: 35 }, feeAfter)
    if (!r.ok) throw new Error('harus berhasil')
    expect(r.maxDiscountPct).toBeCloseTo(13.8889, 3)
    const check = calculateMargin(
      { hpp: 30000, price: 80000, discountPct: r.maxDiscountPct, discountAmount: 0 },
      feeAfter,
      target,
    )
    expect(check.marginPct).toBeCloseTo(35, 6)
  })

  it('komisi sebelum diskon tetap tepat di batas target', () => {
    const r = maxDiscount({ hpp: 30000, price: 90000, discountAmount: 0, minMarginPct: 35 }, feeBefore)
    if (!r.ok) throw new Error('harus berhasil')
    const check = calculateMargin(
      { hpp: 30000, price: 90000, discountPct: r.maxDiscountPct, discountAmount: 0 },
      feeBefore,
      target,
    )
    expect(check.marginPct).toBeCloseTo(35, 6)
  })

  it('diskon lebih besar dari batas → margin di bawah target', () => {
    const r = maxDiscount({ hpp: 30000, price: 80000, discountAmount: 0, minMarginPct: 35 }, feeAfter)
    if (!r.ok) throw new Error('harus berhasil')
    const over = calculateMargin(
      { hpp: 30000, price: 80000, discountPct: r.maxDiscountPct + 0.5, discountAmount: 0 },
      feeAfter,
      target,
    )
    expect(over.status).toBe('below')
  })

  it('melaporkan "tidak tercapai" jika tanpa diskon pun margin sudah di bawah target', () => {
    const r = maxDiscount({ hpp: 30000, price: 50000, discountAmount: 0, minMarginPct: 35 }, feeAfter)
    expect(r).toEqual({ ok: false, reason: 'notAchievable' })
  })
})

describe('pembulatan', () => {
  it('roundUpTo tidak melompat karena galat floating point', () => {
    expect(roundUpTo(69000.0000001, 100)).toBe(69000)
    expect(roundUpTo(68888.89, 100)).toBe(68900)
    expect(roundUpTo(68888.89, 1000)).toBe(69000)
    expect(roundUpTo(123, 0)).toBe(123)
  })
  it('roundDownTo untuk batas diskon', () => {
    expect(roundDownTo(13.8889, 0.5)).toBe(13.5)
    expect(roundDownTo(14, 0.5)).toBe(14)
  })
})

describe('marginCurve', () => {
  it('margin turun saat diskon naik', () => {
    const pts = marginCurve({ hpp: 30000, price: 80000, discountAmount: 0 }, feeAfter, target, 30, 10)
    expect(pts.map((p) => p.discountPct)).toEqual([0, 10, 20, 30])
    for (let i = 1; i < pts.length; i++) expect(pts[i].marginPct!).toBeLessThan(pts[i - 1].marginPct!)
  })
})
