import { useId, type ReactNode } from 'react'
import { formatNumber, parsePctInput, parseRupiahInput } from '../lib/format'
import type { MarginStatus, MarginTarget } from '../lib/types'
import { IconAlert, IconShieldCheck } from './Icons'

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-cream-dark/80 bg-surface p-5 shadow-[var(--shadow-card)] transition-shadow duration-200 ${className}`}
    >
      {children}
    </section>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-espresso">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const STATUS_CONFIG: Record<
  MarginStatus,
  { label: string; badgeClass: string; borderClass: string; desc: (t: MarginTarget) => string }
> = {
  loss: {
    label: 'Rugi',
    badgeClass: 'bg-loss-soft text-loss border-loss/20',
    borderClass: 'border-loss/40 bg-loss-soft/50',
    desc: () => 'Harga jual belum menutup modal bahan dan potongan aplikasi.',
  },
  below: {
    label: 'Di Bawah Target',
    badgeClass: 'bg-below-soft text-below border-below/25',
    borderClass: 'border-below/40 bg-below-soft/50',
    desc: (t) => `Masih untung, tapi di bawah target minimal toko (${t.minPct}%).`,
  },
  safe: {
    label: 'Margin Aman',
    badgeClass: 'bg-safe-soft text-safe border-safe/20',
    borderClass: 'border-safe/35 bg-safe-soft/50',
    desc: (t) => `Margin pas dan sehat sesuai target toko (${t.minPct}% sampai ${t.maxPct}%).`,
  },
  above: {
    label: 'Di Atas Target',
    badgeClass: 'bg-above-soft text-above border-above/20',
    borderClass: 'border-above/35 bg-above-soft/50',
    desc: (t) => `Laba tebal di atas ${t.maxPct}%, pastikan harga tetap ramah di kantong pembeli.`,
  },
}

export function StatusBadge({ status }: { status: MarginStatus }) {
  const cfg = STATUS_CONFIG[status]
  const isSafe = status === 'safe' || status === 'above'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.badgeClass}`}
    >
      {isSafe ? <IconShieldCheck size={13} /> : <IconAlert size={13} />}
      {cfg.label}
    </span>
  )
}

export function statusDescription(status: MarginStatus, target: MarginTarget) {
  return STATUS_CONFIG[status].desc(target)
}

export function statusBannerClass(status: MarginStatus) {
  return STATUS_CONFIG[status].borderClass
}

export function DemoBadge() {
  return (
    <span
      title="Data contoh untuk simulasi, bukan transaksi toko sungguhan"
      className="inline-flex items-center rounded-md border border-cream-dark bg-cream px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted"
    >
      Data Contoh
    </span>
  )
}

export function PlatformConfiguredBadge({ configured }: { configured: boolean }) {
  return configured ? (
    <span className="inline-flex items-center rounded-full bg-safe-soft px-2 py-0.5 text-[11px] font-medium text-safe">
      Tarif diatur
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-below-soft px-2 py-0.5 text-[11px] font-medium text-below">
      Belum ada tarif
    </span>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint?: string
  accent?: 'safe' | 'loss' | 'terracotta'
}) {
  const valueColor =
    accent === 'safe'
      ? 'text-safe'
      : accent === 'loss'
        ? 'text-loss'
        : accent === 'terracotta'
          ? 'text-terracotta'
          : 'text-espresso'

  return (
    <div className="rounded-2xl border border-cream-dark/80 bg-surface p-4 shadow-[var(--shadow-card)]">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`num mt-1.5 text-2xl font-bold tracking-tight ${valueColor}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  helper?: string
  error?: string
  placeholder?: string
}

export function RupiahInput({ label, value, onChange, helper, error, placeholder = '0' }: NumberFieldProps) {
  const id = useId()
  const display = Number.isFinite(value) && value !== 0 ? formatNumber(value) : value === 0 ? '0' : ''

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-espresso">
        {label}
      </label>
      <div
        className={`mt-1.5 flex items-center overflow-hidden rounded-xl border bg-surface transition-colors ${
          error ? 'border-loss ring-1 ring-loss/30' : 'border-cream-dark focus-within:border-terracotta'
        }`}
      >
        <span className="select-none border-r border-cream-dark/70 bg-ivory px-3 py-2.5 text-xs font-semibold text-muted">
          Rp
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={display}
          placeholder={placeholder}
          onChange={(e) => {
            const raw = e.target.value
            if (raw.trim() === '') {
              onChange(Number.NaN)
            } else {
              onChange(parseRupiahInput(raw))
            }
          }}
          className="num w-full bg-transparent px-3 py-2 text-sm font-medium text-espresso outline-none placeholder:text-muted/50"
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs font-medium text-loss">{error}</p>
      ) : helper ? (
        <p className="mt-1 text-xs text-muted">{helper}</p>
      ) : null}
    </div>
  )
}

export function PctInput({ label, value, onChange, helper, error, placeholder = '0' }: NumberFieldProps) {
  const id = useId()
  const display = Number.isFinite(value) ? String(value) : ''

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-espresso">
        {label}
      </label>
      <div
        className={`mt-1.5 flex items-center overflow-hidden rounded-xl border bg-surface transition-colors ${
          error ? 'border-loss ring-1 ring-loss/30' : 'border-cream-dark focus-within:border-terracotta'
        }`}
      >
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={display}
          placeholder={placeholder}
          onChange={(e) => {
            const raw = e.target.value
            if (raw.trim() === '') {
              onChange(Number.NaN)
            } else {
              const parsed = parsePctInput(raw)
              if (!Number.isNaN(parsed)) onChange(parsed)
            }
          }}
          className="num w-full bg-transparent px-3 py-2 text-sm font-medium text-espresso outline-none placeholder:text-muted/50"
        />
        <span className="select-none border-l border-cream-dark/70 bg-ivory px-3 py-2.5 text-xs font-semibold text-muted">
          %
        </span>
      </div>
      {error ? (
        <p className="mt-1 text-xs font-medium text-loss">{error}</p>
      ) : helper ? (
        <p className="mt-1 text-xs text-muted">{helper}</p>
      ) : null}
    </div>
  )
}
