/**
 * Penyimpanan lokal (localStorage).
 * - Data diberi nomor versi supaya struktur bisa diubah di masa depan tanpa merusak data lama.
 * - Data yang rusak/tidak dikenal TIDAK membuat aplikasi crash: setiap field diperiksa lalu
 *   diganti nilai default jika tidak valid (lihat sanitizeState, diuji di storage.test.ts).
 */
import type { FeeBase, PlatformFee } from './types'

export const STORAGE_KEY = 'rafitacake:v1'
export const STATE_VERSION = 1

export interface Product {
  id: string
  name: string
  /** HPP bahan & produksi per unit. */
  hpp: number
  /** Biaya kemasan/box per unit. */
  packaging: number
  price: number
  discountPct: number
  discountAmount: number
  platformId: string
  /** true = data contoh/simulasi, bukan data toko sungguhan. */
  isDemo: boolean
  createdAt: string
  updatedAt: string
}

export type ActivityKind =
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'platform_updated'
  | 'platform_created'
  | 'platform_deleted'
  | 'settings_updated'
  | 'demo_loaded'
  | 'demo_cleared'
  | 'data_reset'

export interface Activity {
  id: string
  at: string
  kind: ActivityKind
  label: string
}

export interface Settings {
  targetMinPct: number
  targetMaxPct: number
  /** Kelipatan pembulatan harga saran (Rupiah). */
  roundingStep: number
}

export interface AppState {
  version: number
  settings: Settings
  platforms: PlatformFee[]
  products: Product[]
  activity: Activity[]
}

export const MAX_ACTIVITY = 30
export const ROUNDING_STEPS = [100, 500, 1000] as const

/**
 * Platform bawaan. SEMUA TARIF = 0 dan configured = false.
 * Kami sengaja tidak mengisi tarif karena tidak ada sumber resmi di LKPD dan tarif bisa berubah.
 * Pengguna mengisi sendiri dari dashboard merchant masing-masing.
 */
export function defaultPlatforms(): PlatformFee[] {
  const base = { commissionPct: 0, servicePct: 0, fixedFee: 0, feeBase: 'afterDiscount' as FeeBase, configured: false, note: '', builtIn: true }
  return [
    { ...base, id: 'gofood', name: 'GoFood' },
    { ...base, id: 'tiktokshop', name: 'TikTok Shop' },
    { ...base, id: 'grabfood', name: 'GrabFood' },
  ]
}

export function defaultState(): AppState {
  return {
    version: STATE_VERSION,
    settings: { targetMinPct: 35, targetMaxPct: 50, roundingStep: 500 },
    platforms: defaultPlatforms(),
    products: [],
    activity: [],
  }
}

// ---------- sanitasi ----------
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, fallback: number, min = 0, max = Number.POSITIVE_INFINITY) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : fallback
const str = (v: unknown, fallback: string, maxLen = 120) => (typeof v === 'string' ? v.slice(0, maxLen) : fallback)
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
const iso = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : new Date(0).toISOString())

function sanitizePlatform(v: unknown): PlatformFee | null {
  if (!isObj(v) || typeof v.id !== 'string' || !v.id) return null
  const commissionPct = num(v.commissionPct, 0, 0, 99.99)
  let servicePct = num(v.servicePct, 0, 0, 99.99)
  if (commissionPct + servicePct >= 100) servicePct = 0
  return {
    id: v.id.slice(0, 60),
    name: str(v.name, 'Platform', 40).trim() || 'Platform',
    commissionPct,
    servicePct,
    fixedFee: num(v.fixedFee, 0, 0),
    feeBase: v.feeBase === 'beforeDiscount' ? 'beforeDiscount' : 'afterDiscount',
    configured: bool(v.configured, false),
    note: str(v.note, '', 200),
    builtIn: bool(v.builtIn, false),
  }
}

function sanitizeProduct(v: unknown): Product | null {
  if (!isObj(v) || typeof v.id !== 'string' || !v.id) return null
  const price = num(v.price, Number.NaN, 0.01)
  const hpp = num(v.hpp, Number.NaN, 0)
  if (Number.isNaN(price) || Number.isNaN(hpp)) return null
  return {
    id: v.id.slice(0, 60),
    name: str(v.name, 'Produk tanpa nama', 80).trim() || 'Produk tanpa nama',
    hpp,
    packaging: num(v.packaging, 0, 0),
    price,
    discountPct: num(v.discountPct, 0, 0, 99.99),
    discountAmount: num(v.discountAmount, 0, 0),
    platformId: str(v.platformId, 'gofood', 60),
    isDemo: bool(v.isDemo, false),
    createdAt: iso(v.createdAt),
    updatedAt: iso(v.updatedAt),
  }
}

const ACTIVITY_KINDS: ActivityKind[] = [
  'product_created', 'product_updated', 'product_deleted', 'platform_updated', 'platform_created',
  'platform_deleted', 'settings_updated', 'demo_loaded', 'demo_cleared', 'data_reset',
]

function sanitizeActivity(v: unknown): Activity | null {
  if (!isObj(v) || typeof v.id !== 'string') return null
  if (!ACTIVITY_KINDS.includes(v.kind as ActivityKind)) return null
  return { id: v.id, at: iso(v.at), kind: v.kind as ActivityKind, label: str(v.label, '', 160) }
}

/** Ubah data apa pun (mis. hasil JSON.parse) menjadi AppState yang dijamin valid. */
export function sanitizeState(raw: unknown): AppState {
  const d = defaultState()
  if (!isObj(raw)) return d

  const s = isObj(raw.settings) ? raw.settings : {}
  let targetMinPct = num(s.targetMinPct, d.settings.targetMinPct, 0, 99)
  let targetMaxPct = num(s.targetMaxPct, d.settings.targetMaxPct, 1, 99)
  if (targetMaxPct < targetMinPct) [targetMinPct, targetMaxPct] = [d.settings.targetMinPct, d.settings.targetMaxPct]
  const roundingStep = (ROUNDING_STEPS as readonly number[]).includes(s.roundingStep as number)
    ? (s.roundingStep as number)
    : d.settings.roundingStep

  const seen = new Set<string>()
  const platforms = (Array.isArray(raw.platforms) ? raw.platforms : [])
    .map(sanitizePlatform)
    .filter((p): p is PlatformFee => !!p && !seen.has(p.id) && !!seen.add(p.id))
  // Pastikan platform bawaan selalu ada.
  for (const bp of d.platforms) if (!platforms.some((p) => p.id === bp.id)) platforms.push(bp)
  for (const p of platforms) if (d.platforms.some((bp) => bp.id === p.id)) p.builtIn = true

  const platformIds = new Set(platforms.map((p) => p.id))
  const products = (Array.isArray(raw.products) ? raw.products : [])
    .map(sanitizeProduct)
    .filter((p): p is Product => !!p)
    .map((p) => (platformIds.has(p.platformId) ? p : { ...p, platformId: platforms[0].id }))

  const activity = (Array.isArray(raw.activity) ? raw.activity : [])
    .map(sanitizeActivity)
    .filter((a): a is Activity => !!a)
    .slice(0, MAX_ACTIVITY)

  return { version: STATE_VERSION, settings: { targetMinPct, targetMaxPct, roundingStep }, platforms, products, activity }
}

export type LoadResult = { state: AppState; storageAvailable: boolean; recovered: boolean }

/** Baca dari localStorage. Tidak pernah melempar error. */
export function loadState(storage: Storage | undefined = globalThis.localStorage): LoadResult {
  try {
    if (!storage) return { state: defaultState(), storageAvailable: false, recovered: false }
    const text = storage.getItem(STORAGE_KEY)
    if (!text) return { state: defaultState(), storageAvailable: true, recovered: false }
    try {
      return { state: sanitizeState(JSON.parse(text)), storageAvailable: true, recovered: false }
    } catch {
      return { state: defaultState(), storageAvailable: true, recovered: true }
    }
  } catch {
    return { state: defaultState(), storageAvailable: false, recovered: false }
  }
}

/** Simpan ke localStorage. Mengembalikan false jika gagal (penuh / mode privat). */
export function saveState(state: AppState, storage: Storage | undefined = globalThis.localStorage): boolean {
  try {
    if (!storage) return false
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function newId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}${rand}`
}
