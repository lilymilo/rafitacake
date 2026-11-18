/**
 * Tipe data inti RAFITACAKE.
 *
 * Konvensi:
 * - Semua uang dalam Rupiah (number, boleh desimal saat dihitung, dibulatkan saat ditampilkan).
 * - Semua persentase disimpan dalam bentuk persen (20 berarti 20%), bukan pecahan (0.2).
 */

/** Dasar pengenaan komisi platform. */
export type FeeBase = 'afterDiscount' | 'beforeDiscount'

/** Konfigurasi biaya satu platform. Nilainya SELALU diisi pengguna, bukan tarif resmi. */
export interface PlatformFee {
  id: string
  name: string
  /** Komisi / biaya admin platform dalam persen. */
  commissionPct: number
  /** Biaya layanan / potongan lain dalam persen. */
  servicePct: number
  /** Biaya tetap per pesanan dalam Rupiah. */
  fixedFee: number
  /** Komisi dihitung dari harga setelah diskon (umum) atau sebelum diskon. */
  feeBase: FeeBase
  /** false = pengguna belum mengisi/mengonfirmasi tarif. */
  configured: boolean
  /** Catatan pengguna, mis. "dicek di dashboard merchant 18 Nov". */
  note: string
  /** Platform bawaan tidak bisa dihapus (hanya diedit). */
  builtIn: boolean
}

/** Bagian biaya yang dibutuhkan mesin hitung (subset PlatformFee). */
export type FeeConfig = Pick<PlatformFee, 'commissionPct' | 'servicePct' | 'fixedFee' | 'feeBase'>

export interface PricingInput {
  /** Harga Pokok Produksi per unit, termasuk kemasan/box. */
  hpp: number
  /** Harga jual (harga coret / sebelum diskon). */
  price: number
  /** Diskon penjual dalam persen. */
  discountPct: number
  /** Potongan nominal tambahan (voucher toko) dalam Rupiah. */
  discountAmount: number
}

export interface MarginTarget {
  /** Batas bawah margin yang dianggap aman (persen). */
  minPct: number
  /** Batas atas target margin (persen). */
  maxPct: number
}

/**
 * Status margin:
 * - loss: laba bersih negatif (rugi)
 * - below: untung, tapi margin di bawah target minimum
 * - safe: margin di dalam rentang target
 * - above: margin di atas target maksimum (aman, mungkin harga kurang kompetitif)
 */
export type MarginStatus = 'loss' | 'below' | 'safe' | 'above'

export interface MarginResult {
  price: number
  discountValue: number
  /** Harga yang dibayar pembeli setelah diskon. */
  netPrice: number
  /** Nilai yang menjadi dasar komisi persen. */
  feeBaseAmount: number
  percentFee: number
  fixedFee: number
  totalFee: number
  /** Uang yang diterima penjual dari platform. */
  netRevenue: number
  hpp: number
  profit: number
  /** Sales margin = profit / netPrice × 100. null jika netPrice <= 0. */
  marginPct: number | null
  /** Markup = profit / hpp × 100 (informasi tambahan). null jika hpp <= 0. */
  markupPct: number | null
  status: MarginStatus
}
