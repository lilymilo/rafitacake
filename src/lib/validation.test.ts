import { describe, expect, it } from 'vitest'
import { formatPct, formatRupiah, parsePctInput, parseRupiahInput } from './format'
import { validateFee, validatePricing, validateTarget } from './validation'

describe('validatePricing', () => {
  const ok = { hpp: 30000, price: 50000, discountPct: 10, discountAmount: 0 }
  it('input valid → tanpa error', () => expect(validatePricing(ok)).toEqual({}))
  it('HPP kosong/nol ditolak', () => {
    expect(validatePricing({ ...ok, hpp: Number.NaN }).hpp).toBeDefined()
    expect(validatePricing({ ...ok, hpp: 0 }).hpp).toBeDefined()
  })
  it('diskon 100% atau negatif ditolak', () => {
    expect(validatePricing({ ...ok, discountPct: 100 }).discountPct).toBeDefined()
    expect(validatePricing({ ...ok, discountPct: -1 }).discountPct).toBeDefined()
  })
  it('potongan yang membuat harga ≤ 0 ditolak', () => {
    expect(validatePricing({ ...ok, discountAmount: 45000 }).discountAmount).toBeDefined()
  })
  it('tarif platform tidak valid dilaporkan', () => {
    const e = validatePricing(ok, { commissionPct: 80, servicePct: 30, fixedFee: 0, feeBase: 'afterDiscount' })
    expect(e.fee).toBeDefined()
  })
})

describe('validateFee', () => {
  const base = { commissionPct: 0, servicePct: 0, fixedFee: 0, feeBase: 'afterDiscount' as const }
  it('nol semua valid (belum diatur bukan berarti invalid)', () => expect(validateFee(base)).toEqual({}))
  it('total ≥ 100% ditolak', () => expect(validateFee({ ...base, commissionPct: 60, servicePct: 40 }).servicePct).toBeDefined())
  it('biaya tetap negatif ditolak', () => expect(validateFee({ ...base, fixedFee: -1 }).fixedFee).toBeDefined())
})

describe('validateTarget', () => {
  it('maks < min ditolak', () => expect(validateTarget({ minPct: 40, maxPct: 30 }).maxPct).toBeDefined())
  it('35–50 valid', () => expect(validateTarget({ minPct: 35, maxPct: 50 })).toEqual({}))
})

describe('format', () => {
  it('formatRupiah', () => {
    expect(formatRupiah(45000)).toBe('Rp45.000')
    expect(formatRupiah(68888.89)).toBe('Rp68.889')
    expect(formatRupiah(-0.2)).toBe('Rp0')
    expect(formatRupiah(-11000)).toBe('-Rp11.000')
  })
  it('formatPct', () => {
    expect(formatPct(11.1111)).toBe('11,1%')
    expect(formatPct(null)).toBe('—')
  })
  it('parse input', () => {
    expect(parseRupiahInput('45.000')).toBe(45000)
    expect(Number.isNaN(parseRupiahInput(''))).toBe(true)
    expect(parsePctInput('12,5')).toBe(12.5)
    expect(Number.isNaN(parsePctInput('abc'))).toBe(true)
  })
})
