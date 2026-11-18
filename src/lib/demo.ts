/**
 * Data simulasi / contoh produk kue untuk demonstrasi.
 * SELALU ditandai isDemo = true dan TIDAK mengklaim tarif resmi platform.
 */
import type { Product } from './storage'

export function createDemoProducts(): Product[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'demo_tart_coklat',
      name: 'Kue Tart Coklat Klasik (20cm)',
      hpp: 65000,
      packaging: 8000,
      price: 155000,
      discountPct: 10,
      discountAmount: 0,
      platformId: 'gofood',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo_brownies_fudge',
      name: 'Fudge Brownies Box (Isi 12)',
      hpp: 28000,
      packaging: 4500,
      price: 68000,
      discountPct: 15,
      discountAmount: 0,
      platformId: 'tiktokshop',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo_roti_sisir',
      name: 'Roti Sisir Mentega (Pack 6)',
      hpp: 18000,
      packaging: 3000,
      price: 38000,
      discountPct: 20,
      discountAmount: 2000,
      platformId: 'grabfood',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo_red_velvet',
      name: 'Red Velvet Slice Box',
      hpp: 22000,
      packaging: 3500,
      price: 55000,
      discountPct: 0,
      discountAmount: 0,
      platformId: 'gofood',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
  ]
}
