import { describe, expect, it } from 'vitest'
import { defaultState, loadState, sanitizeState, saveState, STORAGE_KEY } from './storage'

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial))
  return {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  }
}

describe('defaultState', () => {
  it('tiga platform bawaan dengan tarif 0 dan status belum diatur (tidak mengarang tarif)', () => {
    const s = defaultState()
    expect(s.platforms.map((p) => p.name)).toEqual(['GoFood', 'TikTok Shop', 'GrabFood'])
    for (const p of s.platforms) {
      expect(p.commissionPct).toBe(0)
      expect(p.servicePct).toBe(0)
      expect(p.fixedFee).toBe(0)
      expect(p.configured).toBe(false)
    }
    expect(s.settings).toEqual({ targetMinPct: 35, targetMaxPct: 50, roundingStep: 500 })
  })
})

describe('sanitizeState', () => {
  it('data sampah → default', () => {
    expect(sanitizeState(null)).toEqual(defaultState())
    expect(sanitizeState('halo')).toEqual(defaultState())
  })
  it('membuang produk tidak valid dan mempertahankan yang valid', () => {
    const s = sanitizeState({
      products: [
        { id: 'a', name: 'Tart', hpp: 30000, price: 50000, discountPct: 10, discountAmount: 0, platformId: 'gofood' },
        { id: 'b', name: 'Rusak', hpp: 'x', price: 50000 },
        { name: 'tanpa id', hpp: 1, price: 2 },
      ],
    })
    expect(s.products.map((p) => p.id)).toEqual(['a'])
  })
  it('produk dengan platform yang sudah dihapus dipindahkan ke platform pertama', () => {
    const s = sanitizeState({ products: [{ id: 'a', hpp: 1, price: 2, platformId: 'hilang' }] })
    expect(s.products[0].platformId).toBe('gofood')
  })
  it('platform bawaan selalu ada & tarif tidak masuk akal dikoreksi', () => {
    const s = sanitizeState({ platforms: [{ id: 'gofood', name: 'GoFood', commissionPct: 150, servicePct: 5 }] })
    expect(s.platforms).toHaveLength(3)
    expect(s.platforms[0].commissionPct).toBe(0)
    expect(s.platforms[0].servicePct).toBe(5)
  })
  it('target min > max dikembalikan ke default', () => {
    const s = sanitizeState({ settings: { targetMinPct: 60, targetMaxPct: 40, roundingStep: 7 } })
    expect(s.settings).toEqual({ targetMinPct: 35, targetMaxPct: 50, roundingStep: 500 })
  })
})

describe('load/save', () => {
  it('simpan lalu baca kembali menghasilkan data yang sama', () => {
    const st = memoryStorage()
    const s = defaultState()
    s.settings.targetMinPct = 30
    expect(saveState(s, st)).toBe(true)
    expect(loadState(st).state).toEqual(s)
  })
  it('JSON rusak tidak membuat crash', () => {
    const r = loadState(memoryStorage({ [STORAGE_KEY]: '{rusak' }))
    expect(r.recovered).toBe(true)
    expect(r.state).toEqual(defaultState())
  })
  it('storage penuh/terkunci → saveState false, bukan crash', () => {
    const st = memoryStorage()
    st.setItem = () => { throw new Error('QuotaExceeded') }
    expect(saveState(defaultState(), st)).toBe(false)
  })
})
