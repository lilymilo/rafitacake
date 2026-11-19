import { useState } from 'react'
import { IconInfo, IconPlus, IconShieldCheck, IconTrash } from '../components/Icons'
import { Card, CardHeader, PctInput, PlatformConfiguredBadge, RupiahInput } from '../components/ui'
import { formatRupiah } from '../lib/format'
import { ROUNDING_STEPS } from '../lib/storage'
import { useAppStore } from '../lib/store'
import type { FeeBase, PlatformFee } from '../lib/types'
import { hasErrors, validateFee, validateTarget } from '../lib/validation'

function PlatformEditorCard({
  platform,
  onSave,
  onDelete,
}: {
  platform: PlatformFee
  onSave: (patch: Partial<Omit<PlatformFee, 'id' | 'builtIn'>>) => void
  onDelete?: () => void
}) {
  const [commissionPct, setCommissionPct] = useState(platform.commissionPct)
  const [servicePct, setServicePct] = useState(platform.servicePct)
  const [fixedFee, setFixedFee] = useState(platform.fixedFee)
  const [feeBase, setFeeBase] = useState<FeeBase>(platform.feeBase)
  const [note, setNote] = useState(platform.note)
  const [saved, setSaved] = useState(false)

  const errors = validateFee({
    commissionPct: Number.isFinite(commissionPct) ? commissionPct : 0,
    servicePct: Number.isFinite(servicePct) ? servicePct : 0,
    fixedFee: Number.isFinite(fixedFee) ? fixedFee : 0,
    feeBase,
  })
  const valid = !hasErrors(errors)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    onSave({
      commissionPct: Number.isFinite(commissionPct) ? commissionPct : 0,
      servicePct: Number.isFinite(servicePct) ? servicePct : 0,
      fixedFee: Number.isFinite(fixedFee) ? fixedFee : 0,
      feeBase,
      note: note.trim(),
      configured: true,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-espresso">{platform.name}</h3>
            <PlatformConfiguredBadge configured={platform.configured} />
          </div>
          {!platform.builtIn && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-loss-soft hover:text-loss"
            >
              <IconTrash size={14} /> Hapus
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <PctInput
            label="Komisi Penjualan (%)"
            value={commissionPct}
            onChange={setCommissionPct}
            error={errors.commissionPct}
          />
          <PctInput
            label="Biaya Layanan (%)"
            value={servicePct}
            onChange={setServicePct}
            error={errors.servicePct}
          />
          <RupiahInput
            label="Biaya Tetap per Pesanan"
            value={fixedFee}
            onChange={setFixedFee}
            error={errors.fixedFee}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-espresso">Dasar Perhitungan Komisi</label>
            <select
              value={feeBase}
              onChange={(e) => setFeeBase(e.target.value as FeeBase)}
              className="mt-1.5 w-full cursor-pointer rounded-xl border border-cream-dark bg-surface px-3 py-2 text-xs font-medium text-espresso outline-none focus:border-terracotta"
            >
              <option value="afterDiscount">Dari harga setelah diskon (paling umum)</option>
              <option value="beforeDiscount">Dari harga sebelum diskon (harga awal)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-espresso">Catatan / Sumber Tarif</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Paket promo resto pilihan, akun pro"
              className="mt-1.5 w-full rounded-xl border border-cream-dark bg-surface px-3 py-2 text-xs text-espresso outline-none focus:border-terracotta"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          {saved ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-safe">
              <IconShieldCheck size={15} /> Tarif {platform.name} tersimpan.
            </span>
          ) : (
            <span className="text-[11px] text-muted">Pastikan angka komisi sesuai dashboard toko Anda.</span>
          )}
          <button
            type="submit"
            disabled={!valid}
            className="cursor-pointer rounded-xl bg-espresso px-4 py-2 text-xs font-semibold text-white transition hover:bg-espresso-light disabled:opacity-50"
          >
            Simpan Tarif
          </button>
        </div>
      </form>
    </Card>
  )
}

export function SettingsPage() {
  const { state, updatePlatform, addPlatform, deletePlatform, updateSettings, resetAllData } = useAppStore()
  const [minPct, setMinPct] = useState(state.settings.targetMinPct)
  const [maxPct, setMaxPct] = useState(state.settings.targetMaxPct)
  const [roundingStep, setRoundingStep] = useState(state.settings.roundingStep)
  const [targetSaved, setTargetSaved] = useState(false)

  const [newPlatformName, setNewPlatformName] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  const targetErrors = validateTarget({
    minPct: Number.isFinite(minPct) ? minPct : -1,
    maxPct: Number.isFinite(maxPct) ? maxPct : -1,
  })
  const targetValid = !hasErrors(targetErrors)

  function saveTarget(e: React.FormEvent) {
    e.preventDefault()
    if (!targetValid) return
    updateSettings({ targetMinPct: minPct, targetMaxPct: maxPct, roundingStep })
    setTargetSaved(true)
    setTimeout(() => setTargetSaved(false), 2500)
  }

  function handleAddPlatform(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newPlatformName.trim()
    if (!trimmed) return
    addPlatform({
      name: trimmed,
      commissionPct: 0,
      servicePct: 0,
      fixedFee: 0,
      feeBase: 'afterDiscount',
      configured: false,
      note: '',
    })
    setNewPlatformName('')
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-terracotta">Pengaturan Toko</p>
        <h1 className="mt-1 font-[var(--font-display)] text-2xl font-bold tracking-tight text-espresso sm:text-3xl">
          Pengaturan Tarif Platform &amp; Target Margin
        </h1>
        <p className="mt-1 text-sm text-muted">
          Sesuaikan persentase komisi aplikasi dan atur batas keuntungan sehat untuk toko Anda.
        </p>
      </div>

      {/* Info Transparansi Tarif */}
      <div className="flex items-start gap-3 rounded-2xl border border-cream-dark bg-cream/70 p-4 text-xs leading-relaxed text-espresso">
        <IconInfo size={18} className="mt-0.5 shrink-0 text-terracotta" />
        <div>
          <p className="font-semibold">Kenapa potongan aplikasi awalnya 0%?</p>
          <p className="mt-0.5 text-muted">
            Karena potongan komisi GoFood, GrabFood, atau ShopeeFood bisa berbeda tergantung status merchant dan paket promo toko Anda. Kami tidak memasukkan angka tebakan, silakan isi sesuai potongan resmi di aplikasi Anda agar hitungannya nyata.
          </p>
        </div>
      </div>

      {/* Target Margin Toko */}
      <Card>
        <CardHeader
          title="Standar Keuntungan Aman Toko"
          subtitle="Patokan margin sehat untuk toko kue (standar umum 35% sampai 50%)"
        />
        <form onSubmit={saveTarget} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PctInput label="Minimal Untung Bersih (%)" value={minPct} onChange={setMinPct} error={targetErrors.minPct} />
            <PctInput label="Maksimal Target Untung (%)" value={maxPct} onChange={setMaxPct} error={targetErrors.maxPct} />
            <div>
              <span className="block text-xs font-semibold text-espresso">Aturan Pembulatan Harga</span>
              <div className="mt-1.5 flex gap-2">
                {ROUNDING_STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setRoundingStep(step)}
                    className={`flex-1 cursor-pointer rounded-xl border py-2 text-xs font-semibold transition ${
                      roundingStep === step
                        ? 'border-terracotta bg-terracotta-soft text-terracotta'
                        : 'border-cream-dark bg-surface text-muted'
                    }`}
                  >
                    {formatRupiah(step)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {targetSaved ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-safe">
                <IconShieldCheck size={15} /> Target margin diperbarui.
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={!targetValid}
              className="cursor-pointer rounded-xl bg-terracotta px-4 py-2 text-xs font-semibold text-white transition hover:bg-terracotta-hover disabled:opacity-50"
            >
              Simpan Target Margin
            </button>
          </div>
        </form>
      </Card>

      {/* Daftar Platform */}
      <div className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-base font-bold text-espresso">Tarif Komisi per Aplikasi</h2>
          <form onSubmit={handleAddPlatform} className="flex gap-2">
            <input
              type="text"
              value={newPlatformName}
              onChange={(e) => setNewPlatformName(e.target.value)}
              placeholder="Tambah aplikasi lain (contoh: WhatsApp)"
              className="rounded-xl border border-cream-dark bg-surface px-3 py-1.5 text-xs text-espresso outline-none focus:border-terracotta"
            />
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-cream px-3 py-1.5 text-xs font-semibold text-espresso transition hover:bg-cream-dark"
            >
              <IconPlus size={14} /> Tambah
            </button>
          </form>
        </div>

        <div className="grid gap-4">
          {state.platforms.map((platform) => (
            <PlatformEditorCard
              key={platform.id}
              platform={platform}
              onSave={(patch) => updatePlatform(platform.id, patch)}
              onDelete={platform.builtIn ? undefined : () => deletePlatform(platform.id)}
            />
          ))}
        </div>
      </div>

      {/* Zona Reset Data */}
      <Card className="border-loss/25">
        <CardHeader
          title="Reset Data Toko"
          subtitle="Mengembalikan seluruh daftar kue, tarif aplikasi, dan riwayat ke setelan awal"
        />
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="cursor-pointer rounded-xl border border-loss/40 px-4 py-2 text-xs font-semibold text-loss transition hover:bg-loss-soft"
          >
            Reset Semua Data
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-espresso">Yakin ingin menghapus seluruh data yang tersimpan di browser ini?</span>
            <button
              type="button"
              onClick={() => {
                resetAllData()
                setConfirmReset(false)
              }}
              className="cursor-pointer rounded-xl bg-loss px-4 py-2 text-xs font-semibold text-white"
            >
              Ya, Reset Sekarang
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="cursor-pointer rounded-xl border border-cream-dark px-3 py-2 text-xs font-semibold text-muted"
            >
              Batal
            </button>
          </div>
        )}
      </Card>
    </div>
  )
}
