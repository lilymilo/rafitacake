# RAFITACAKE — Product Definition

> Sumber kebenaran: dokumen LKPD di [`docs/lkpd/`](./lkpd). Dokumen ini merangkum, tidak menggantikan.

## Visi
Membantu admin toko kue online mengetahui **keuntungan bersih sebenarnya sebelum** memasang harga atau promo.

## Problem Statement (LKPD 4)
Kak Zahira (staf admin pengelola orderan cabang) membutuhkan kalkulator margin otomatis karena aturan diskon,
promo, dan potongan aplikasi membuatnya bingung dan berisiko menggerus margin toko (target toko 35%–50%).

## Target User
Admin/pegawai cabang UMKM makanan (kue & roti) yang berjualan di beberapa platform (GoFood, TikTok Shop, GrabFood).

## Value Proposition
Masukkan HPP sekali → langsung terlihat laba bersih, status margin, harga yang disarankan, dan perbandingan platform.

## USP
1. Peringatan margin **sebelum** promo dipasang (SmartMargin Guard).
2. Hitung terbalik dari target margin/laba ke harga jual & batas diskon (ReversePrice Planner).
3. Tarif platform **transparan dan diatur sendiri** oleh pengguna — tidak ada tarif yang dikarang.

## Satu aplikasi, tiga modul
Ketiga konsep LKPD 5 memakai data dan rumus yang sama, jadi digabung dalam satu aplikasi:

| Modul | Konsep LKPD 5 | Halaman |
|---|---|---|
| SmartMargin Guard | Ide #1 (+ slider ide #4) | Kalkulator |
| ReversePrice Planner | Ide #2 (+ batas diskon ide #5) | Harga Target |
| Simulasi Multi-Platform | Ide #3 (+ preset ide #8/9) | Bandingkan |

## MVP
- Kalkulator margin + indikator Rugi / Di bawah target / Aman / Di atas target.
- Slider diskon real-time.
- Reverse pricing (target margin % atau target laba Rp) + batas maksimal diskon.
- Perbandingan GoFood, TikTok Shop, GrabFood.
- Pengaturan tarif platform (manual) & target margin.
- Produk tersimpan + dashboard dari data pengguna sendiri (localStorage).

## Di luar MVP (nanti)
Bundling, laporan harian, audit promo pasca-order, login/multi-cabang, backend/database, integrasi API marketplace,
manajemen stok & customer service (lihat catatan K1 di [DECISIONS.md](./DECISIONS.md)).
