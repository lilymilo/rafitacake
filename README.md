# RAFITACAKE

**SmartMargin Guard, ReversePrice Planner, dan Simulasi Multi-Platform** untuk membantu admin/penjual UMKM kue & roti menghitung keuntungan bersih sebelum memasang harga dan promo e-commerce.

Dikembangkan oleh tim siswa **XI PPLG 3** berdasarkan proses Design Thinking pada mata pelajaran Kreativitas Inovasi dan Kewirausahaan (KIK).

## Fitur Utama (MVP)
1. **Dashboard Operasional** — Ringkasan produk tersimpan, rata-rata sales margin, deteksi produk berisiko/rugi, status kelengkapan tarif platform, dan riwayat aktivitas.
2. **SmartMargin Guard (`#/kalkulator`)** — Kalkulator margin otomatis dengan slider simulasi diskon real-time, peringatan batas aman margin, bar komposisi harga, dan grafik sensitivitas diskon.
3. **ReversePrice Planner (`#/target-harga`)** — Menghitung harga jual yang disarankan dari target margin (%) atau target laba bersih (Rp), titik impas (break-even), dan batas maksimal diskon aman.
4. **Perbandingan Platform (`#/bandingkan`)** — Simulasi berdampingan untuk GoFood, TikTok Shop, GrabFood, dan platform kustom.
5. **Produk Saya (`#/produk`) & Pengaturan Tarif (`#/pengaturan`)** — Pengaturan tarif komisi/layanan secara manual oleh pengguna (tidak ada tarif resmi yang dikarang) serta target margin yang dapat disesuaikan.

## Teknologi
- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4**
- **Vitest** (336 unit test untuk mesin hitung, validasi, format, dan penyimpanan `localStorage`)
- **Penyimpanan**: `localStorage` browser (`rafitacake:v1`), tanpa backend/database.

## Menjalankan Secara Lokal
```bash
npm install
npm run dev
```

Menjalankan unit test & build produksi:
```bash
npm run test
npm run typecheck
npm run build
```

## Dokumentasi Desain & Keputusan
- [`docs/PRODUCT.md`](./docs/PRODUCT.md) — Visi produk, modul, dan cakupan MVP.
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — Keputusan produk & teknis serta catatan perbedaan antar-LKPD.
- [`docs/lkpd/`](./docs/lkpd) — Dokumen asli LKPD 3, LKPD 4, dan LKPD 5.

## Deployment (Vercel)
Proyek ini sudah dilengkapi [`vercel.json`](./vercel.json) dengan `buildCommand: "npm run test && npm run build"` dan `outputDirectory: "dist"`. Cukup hubungkan repository GitHub ke Vercel dan deploy otomatis akan berjalan.
