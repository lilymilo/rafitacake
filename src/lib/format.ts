const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const plain = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

/** Rp45.000 — dibulatkan ke rupiah terdekat. -0 ditampilkan sebagai Rp0. */
export function formatRupiah(value: number): string {
  const r = Math.round(value)
  return rupiah.format(r === 0 ? 0 : r).replace(/\u00a0/g, '')
}

export function formatNumber(value: number): string {
  return plain.format(Math.round(value))
}

/** 11,1% — satu angka desimal. null → "—". */
export function formatPct(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return '—'
  const fixed = Number(value.toFixed(digits))
  return `${(fixed === 0 ? 0 : fixed).toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`
}

/** Ubah teks input "45.000" / "45000" menjadi angka 45000. Teks kosong → NaN. */
export function parseRupiahInput(text: string): number {
  const digits = text.replace(/[^\d]/g, '')
  return digits === '' ? Number.NaN : Number(digits)
}

/** Ubah teks persen "12,5" / "12.5" menjadi 12.5. */
export function parsePctInput(text: string): number {
  const t = text.trim().replace(',', '.')
  if (t === '' || !/^\d*\.?\d*$/.test(t)) return Number.NaN
  return Number(t)
}
