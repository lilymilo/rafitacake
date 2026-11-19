# RAFITACAKE — SmartMargin Guard & Promo Engine Backend

Backend service berpresisi tinggi berbasis **Python (FastAPI + Pydantic v2 + Uvicorn)** untuk **10 Fitur USP (Unique Selling Point) Sistem Manajemen Margin dan Promo** website e-commerce toko kue RAFITACAKE.

---

## 🚀 Ringkasan Arsitektur

- **Modular Clean Architecture**: Pemisahan tegas antar layer `routers` -> `services` -> `repositories` -> `schemas`.
- **In-Memory Store (Repository Pattern)**: Berjalan tanpa database/migrasi SQL (DB-ready). Data katalog kue, preset platform, template promo, dan dummy order otomatis di-seed saat server start.
- **Financial Precision (`Decimal`)**: Seluruh perhitungan finansial menggunakan modul bawaan Python `decimal.Decimal` dengan pembulatan `ROUND_HALF_UP` (zero-bug tolerance untuk selisih sen/rupiah).
- **Format Response Standar**: Seluruh response menggunakan envelope seragam:
  ```json
  {
    "success": true,
    "message": "Operasi berhasil",
    "data": { ... },
    "errors": null
  }
  ```
- **Real-Time Ready**: Perhitungan stateless `< 50ms` dan endpoint **Server-Sent Events (SSE)** untuk notifikasi `DANGER` & `MARGIN_LEAKAGE`.

---

## 📦 Instalasi & Menjalankan Server

### 1. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 2. Jalankan Automated Tests (Pytest)
```bash
python -m pytest backend/tests -v
```
*(Seluruh 37 skenario unit test & integration test wajib 100% PASS).*

### 3. Jalankan Dev Server (Uvicorn)
```bash
uvicorn backend.app.main:app --reload --port 8000
```
Server akan aktif di:
- **API Base URL**: `http://localhost:8000/api/v1`
- **Interactive Swagger Docs (OpenAPI)**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`
- **SSE Stream**: `http://localhost:8000/api/v1/events/stream`

---

## 📚 Daftar Lengkap 10 Fitur USP & Endpoint API

### 1. SmartMargin Guard (Kalkulator Margin Otomatis)
- **Endpoint**: `POST /api/v1/calculator/margin`
- **Deskripsi**: Menghitung harga setelah diskon, rincian potongan platform fee, laba bersih, persentase margin, dan status margin.
- **Request Body**:
```json
{
  "hpp": 50000,
  "packaging_cost": 5000,
  "selling_price": 100000,
  "discount_percent": 10,
  "discount_nominal": 0,
  "platform_preset_id": "shopee"
}
```
- **Response Data Highlights**:
```json
{
  "success": true,
  "message": "Kalkulasi margin berhasil dihitung.",
  "data": {
    "selling_price": "100000.00",
    "price_after_discount": "90000.00",
    "fees": {
      "fee_base_amount": "90000.00",
      "admin_fee": "7200.00",
      "service_fee": "1800.00",
      "fixed_fee": "1000.00",
      "total_platform_fees": "10000.00"
    },
    "total_cost": "55000.00",
    "net_revenue": "80000.00",
    "net_profit": "25000.00",
    "margin_percent": "27.78",
    "status": "DANGER",
    "alert_message": "DANGER: Margin (27.78%) di bawah batas aman (35.0%). Kekurangan laba Rp 6,500.",
    "profit_shortfall": "6500.00",
    "max_safe_discount_percent": "0.00",
    "minimum_required_price": "101818.18"
  }
}
```

---

### 2. Margin Alert (Batas Merah Dinamis)
- **Endpoint**:
  - `GET /api/v1/config/margin` : Membaca batas aman (default min: 35%, max: 50%).
  - `PUT /api/v1/config/margin` : Mengubah batas aman secara dinamis di memory.
- **Request Body (PUT)**:
```json
{
  "target_min_margin_percent": 30.0,
  "target_max_margin_percent": 55.0,
  "rounding_step": 500
}
```

---

### 3. Rekomendasi Batas Maksimal Diskon
- **Endpoint**: `POST /api/v1/calculator/max-discount`
- **Request Body**:
```json
{
  "hpp": 40000,
  "packaging_cost": 5000,
  "selling_price": 120000,
  "admin_fee_percent": 10
}
```
- **Response Data**:
```json
{
  "selling_price": "120000.00",
  "max_safe_discount_percent": "31.82",
  "max_safe_discount_nominal": "38181.82",
  "minimum_required_price": "81818.18",
  "current_status": "SAFE"
}
```

---

### 4. ReversePrice Planner (Target Laba ke Harga Jual)
- **Endpoint**: `POST /api/v1/reverse-price/calculate`
- **Deskripsi**: Menghitung rekomendasi harga jual bersih & harga coret dari target laba nominal atau target margin %. Dilengkapi guard clause jika potongan $\ge 100\%$ (HTTP 422).
- **Request Body (Target % dengan Harga Coret 15%)**:
```json
{
  "hpp": 50000,
  "packaging_cost": 5000,
  "target_mode": "PERCENT",
  "target_value": 40.0,
  "admin_fee_percent": 10.0,
  "planned_discount_percent": 15.0
}
```
- **Response Data**:
```json
{
  "recommended_final_price": "110000.00",
  "recommended_base_price": "129411.76",
  "rounded_base_price": "129500.00",
  "planned_discount_percent": "15.00",
  "planned_discount_nominal": "19411.76",
  "projected_net_profit": "44000.00",
  "projected_margin_percent": "40.00",
  "status": "SAFE"
}
```

---

### 5. Simulasi Multi-Platform E-Commerce
- **Endpoint**: `POST /api/v1/calculator/multi-platform`
- **CRUD Platform**: `GET`, `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}` di `/api/v1/platforms`
- **Request Body**:
```json
{
  "hpp": 30000,
  "packaging_cost": 3000,
  "selling_price": 75000,
  "discount_percent": 5
}
```
- **Response Data**: Mengembalikan komparasi laba bersih & margin di Website Direct, Shopee, Tokopedia, GoFood, GrabFood yang otomatis diurutkan dari margin tertinggi ke terendah.

---

### 6. Slider Simulasi Harga & Diskon Real-Time
- **Single Point**: `POST /api/v1/calculator/slider` (stateless, < 50ms).
- **Batch Curve Generator**: `POST /api/v1/calculator/slider-curve`
- **Request Body**:
```json
{
  "hpp": 30000,
  "selling_price": 75000,
  "min_discount": 0,
  "max_discount": 40,
  "step": 5
}
```
- **Response Data**: Menghasilkan array titik data `points: [{ discount_percent, price_after_discount, net_profit, margin_percent, is_danger }]` untuk me-render kurva grafik pada frontend tanpa spam request.

---

### 7. Template Preset Promo Cepat (1-Click Promo)
- **CRUD Template**: `/api/v1/promo-templates`
- **Apply 1-Click Promo**: `POST /api/v1/promo-templates/{template_id}/apply`
- **Request Body**:
```json
{
  "product_ids": ["demo_tart_coklat", "demo_brownies_fudge"]
}
```
- **Response Data**: Langsung mengevaluasi seluruh produk kue target, menghitung laba & persentase margin, serta mengembalikan ringkasan `safe_count` vs `danger_count`.

---

### 8. Kalkulator Bundling Paket Promo + Cek Margin
- **Preview Bundling**: `POST /api/v1/bundles/preview`
- **CRUD Bundling**: `GET`, `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}` di `/api/v1/bundles`
- **Proteksi**: Jika status paket `DANGER`, publikasi otomatis ditolak (HTTP 422) kecuali disertakan `force_publish: true`.
- **Request Body**:
```json
{
  "name": "Paket Afternoon Tea Hemat",
  "items": [
    { "product_id": "demo_brownies_fudge", "quantity": 1 },
    { "product_id": "demo_roti_sisir", "quantity": 1 }
  ],
  "packaging_cost": 5000,
  "bundle_selling_price": 95000,
  "is_published": true,
  "force_publish": false
}
```

---

### 9. Audit Promo Otomatis Pasca-Order (Real-Time)
- **Endpoint**:
  - `POST /api/v1/orders/complete` (atau `POST /api/v1/audits/run`)
  - `GET /api/v1/audits` (Query params: `platform_id`, `start_date`, `end_date`, `only_leaked=true`)
- **Fitur**: Membandingkan margin aktual transaksi vs ambang batas aman 35%. Jika margin < 35%, otomatis menandai `is_margin_leaked: true`, menghitung `leakage_amount`, dan memancarkan event SSE `MARGIN_LEAKAGE`.

---

### 10. Laporan Rekap Harian + Mock Sync Marketplace
- **Rekap Harian**: `GET /api/v1/reports/daily?date=2026-11-19`
- **Export CSV**: `GET /api/v1/reports/daily/export-csv` (Download file `.csv` terformat rapi).
- **Marketplace Sync Preview**: `POST /api/v1/marketplace/sync-preview`
  - Validasi margin sebelum push ke marketplace (Shopee, GoFood, dll.).
  - Jika terdapat item berstatus `DANGER`, proses sinkronisasi diblokir otomatis kecuali `allow_danger: true`.
  - Mengembalikan payload standar marketplace siap kirim.

---

## 🌐 Server-Sent Events (SSE) Stream
Frontend React dapat melakukan *listen* secara real-time ke stream notifikasi:
```typescript
const eventSource = new EventSource("http://localhost:8000/api/v1/events/stream");

eventSource.addEventListener("MARGIN_LEAKAGE", (e) => {
  const alertData = JSON.parse(e.data);
  console.warn("⚠️ Kebocoran Margin Terdeteksi:", alertData);
});
```

---

## 🚢 Panduan Deployment (Vercel & Render)

### A. Deploy ke Render
1. Pilih **New Web Service** pada dashboard Render.
2. Hubungkan repository GitHub ini.
3. Konfigurasikan:
   - **Environment**: Python
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
4. Deploy langsung aktif otomatis setiap ada commit baru ke branch ini.

### B. Deploy ke Vercel (FastAPI Serverless)
Buat entry file `api/index.py`:
```python
from backend.app.main import app
```
Dan pastikan `vercel.json` mengarahkan rute `/api/(.*)` ke file tersebut.
