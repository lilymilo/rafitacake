/**
 * Validasi input. Mengembalikan objek { namaField: pesanError }.
 * Objek kosong = valid. Pesan ditulis dalam bahasa yang dimengerti pengguna nonteknis.
 */
import { feeRate, netPriceOf } from './margin'
import type { FeeConfig, MarginTarget } from './types'

export type Errors<K extends string> = Partial<Record<K, string>>

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function validatePricing(
  v: { hpp: number; price: number; discountPct: number; discountAmount: number },
  fee?: FeeConfig,
): Errors<'hpp' | 'price' | 'discountPct' | 'discountAmount' | 'fee'> {
  const e: Errors<'hpp' | 'price' | 'discountPct' | 'discountAmount' | 'fee'> = {}
  if (!isNum(v.hpp) || v.hpp <= 0) e.hpp = 'HPP harus lebih dari Rp0.'
  if (!isNum(v.price) || v.price <= 0) e.price = 'Harga jual harus lebih dari Rp0.'
  if (!isNum(v.discountPct) || v.discountPct < 0 || v.discountPct >= 100)
    e.discountPct = 'Diskon harus antara 0% dan kurang dari 100%.'
  if (!isNum(v.discountAmount) || v.discountAmount < 0) e.discountAmount = 'Potongan tidak boleh negatif.'
  if (!e.price && !e.discountPct && !e.discountAmount && netPriceOf(v.price, v.discountPct, v.discountAmount) <= 0)
    e.discountAmount = 'Total diskon membuat harga jadi Rp0 atau kurang.'
  if (fee) {
    const fe = validateFee(fee)
    if (Object.keys(fe).length) e.fee = 'Tarif platform tidak valid. Periksa di Pengaturan.'
  }
  return e
}

export function validateFee(f: FeeConfig): Errors<'commissionPct' | 'servicePct' | 'fixedFee'> {
  const e: Errors<'commissionPct' | 'servicePct' | 'fixedFee'> = {}
  if (!isNum(f.commissionPct) || f.commissionPct < 0 || f.commissionPct >= 100)
    e.commissionPct = 'Komisi harus 0% sampai kurang dari 100%.'
  if (!isNum(f.servicePct) || f.servicePct < 0 || f.servicePct >= 100)
    e.servicePct = 'Biaya layanan harus 0% sampai kurang dari 100%.'
  if (!e.commissionPct && !e.servicePct && feeRate(f) >= 1)
    e.servicePct = 'Total komisi + layanan harus di bawah 100%.'
  if (!isNum(f.fixedFee) || f.fixedFee < 0) e.fixedFee = 'Biaya tetap tidak boleh negatif.'
  return e
}

export function validateTarget(t: MarginTarget): Errors<'minPct' | 'maxPct'> {
  const e: Errors<'minPct' | 'maxPct'> = {}
  if (!isNum(t.minPct) || t.minPct < 0 || t.minPct >= 100) e.minPct = 'Margin minimum 0%–99%.'
  if (!isNum(t.maxPct) || t.maxPct <= 0 || t.maxPct >= 100) e.maxPct = 'Margin maksimum 1%–99%.'
  if (!e.minPct && !e.maxPct && t.maxPct < t.minPct) e.maxPct = 'Maksimum tidak boleh lebih kecil dari minimum.'
  return e
}

export const hasErrors = (e: object) => Object.keys(e).length > 0
