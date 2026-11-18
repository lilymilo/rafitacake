# Catatan Keputusan (Decision Log)

## Keputusan produk

| ID | Keputusan | Alasan |
|---|---|---|
| D1 | Fokus MVP = margin & promo (LKPD 4 & 5), **bukan** stok/CS | Persona & ide terpilih berfokus ke margin. Lihat K1. |
| D2 | Margin = **laba bersih ÷ harga setelah diskon** (sales margin), bukan markup HPP | Keputusan tim, 18 Nov 2026. |
| D3 | Platform awal: GoFood, TikTok Shop, GrabFood | Platform yang dipakai narasumber (LKPD 3). |
| D4 | **Semua tarif platform default = 0 dan berstatus "belum diatur"** | Tidak ada sumber tarif resmi di LKPD; tarif berubah-ubah. Pengguna mengisi sendiri dari dashboard merchant. |
| D5 | Target margin 35%–50% hanya nilai awal, bisa diubah | Itu target toko narasumber, bukan aturan universal. |
| D6 | Validasi wawancara dilakukan setelah MVP awal | Keputusan tim. |

## Keputusan teknis

| ID | Keputusan | Alasan (bahasa sederhana) |
|---|---|---|
| T1 | Vite + React + TypeScript | Standar industri; TypeScript mencegah salah tipe data (mis. teks dikira angka). |
| T2 | Tailwind CSS v4 | Styling cepat dan konsisten lewat design token. |
| T3 | Vitest | Menguji rumus otomatis supaya angka bisa dipercaya. |
| T4 | localStorage, tanpa backend | Data cukup disimpan di browser; gratis, tanpa server, mudah demo. |
| T5 | Navigasi pakai hash (`#/kalkulator`) tanpa library router | Tidak perlu package tambahan; aman di Vercel tanpa konfigurasi rewrite. |
| T6 | Grafik & ikon dibuat sendiri (SVG) | Tidak perlu package tambahan di luar yang disetujui. |
| T7 | Mesin hitung terpisah di `src/lib/` (fungsi murni) | Mudah diuji dan dijelaskan, tidak tercampur dengan tampilan. |

## Catatan perbedaan antar-LKPD (tidak diubah, hanya dicatat)

| ID | Temuan |
|---|---|
| K1 | Kesimpulan LKPD 3 menyebut stok & CS sebagai masalah paling mendasar, tetapi LKPD 4/5 memilih margin & promo (pain point #3 LKPD 3). |
| K2 | Tabel rekap LKPD 3: kolom "Total Kemunculan" berisi "Ya", bukan angka; pain point margin ditandai muncul di pembeli padahal jawaban pembeli tidak membahasnya. |
| K3 | Jawaban promo/margin tercatat di kolom "Ongkir & Logistik" dan "Sistem Pembayaran"; jawaban Penjual 1 & 2 identik. |
| K4 | Narasumber 2 penjual + 2 pembeli (target 3 + 3). |
| K5 | Pain point #5 (kurir merusak kue) tidak muncul di data wawancara. |
| K6 | Narasumber memakai GoFood/TikTok/GMaps, sedangkan LKPD 5 mencontohkan Shopee/Tokopedia. |
