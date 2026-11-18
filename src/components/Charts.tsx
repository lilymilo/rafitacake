import { formatPct, formatRupiah } from '../lib/format'
import type { MarginResult, MarginTarget } from '../lib/types'

/**
 * Bar komposisi harga jual (menunjukkan ke mana perginya setiap Rupiah harga jual).
 */
export function PriceBreakdownBar({ result }: { result: MarginResult }) {
  const base = Math.max(result.price, 1)
  const items = [
    { label: 'HPP + Kemasan', value: Math.max(0, result.hpp), color: 'bg-espresso' },
    { label: 'Biaya Platform', value: Math.max(0, result.totalFee), color: 'bg-below' },
    { label: 'Diskon', value: Math.max(0, result.discountValue), color: 'bg-cream-dark' },
    {
      label: result.profit >= 0 ? 'Laba Bersih' : 'Rugi',
      value: Math.max(0, result.profit),
      color: result.profit >= 0 ? 'bg-safe' : 'bg-loss',
    },
  ]

  return (
    <div>
      <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-cream">
        {items.map((item) => {
          const width = Math.min(100, (item.value / base) * 100)
          if (width <= 0) return null
          return (
            <div
              key={item.label}
              style={{ width: `${width}%` }}
              className={`${item.color} transition-all duration-300`}
              title={`${item.label}: ${formatRupiah(item.value)}`}
            />
          )
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        {items.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${item.color}`} />
            <span>{item.label}:</span>
            <strong className="num font-semibold text-espresso">
              {item.label === 'Rugi' ? formatRupiah(result.profit) : formatRupiah(item.value)}
            </strong>
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Grafik SVG Kurva Margin vs Diskon dengan zona target aman.
 */
export function MarginCurveChart({
  points,
  activeDiscountPct,
  target,
}: {
  points: { discountPct: number; marginPct: number | null; profit: number }[]
  activeDiscountPct: number
  target: MarginTarget
}) {
  const valid = points.filter((p): p is { discountPct: number; marginPct: number; profit: number } => p.marginPct !== null)
  if (valid.length < 2) return null

  const width = 460
  const height = 190
  const pad = { top: 16, right: 16, bottom: 28, left: 42 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom

  const maxD = valid[valid.length - 1].discountPct || 60
  const rawMinY = Math.min(-10, ...valid.map((p) => p.marginPct))
  const rawMaxY = Math.max(target.maxPct + 10, ...valid.map((p) => p.marginPct))
  const minY = Math.floor(rawMinY / 10) * 10
  const maxY = Math.ceil(rawMaxY / 10) * 10

  const xOf = (d: number) => pad.left + (d / maxD) * innerW
  const yOf = (m: number) => pad.top + ((maxY - m) / Math.max(1, maxY - minY)) * innerH

  const pathD = valid
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xOf(p.discountPct).toFixed(1)} ${yOf(p.marginPct).toFixed(1)}`)
    .join(' ')

  const safeTop = yOf(Math.min(maxY, target.maxPct))
  const safeBottom = yOf(Math.max(minY, target.minPct))
  const zeroY = yOf(0)
  const activeX = xOf(Math.min(maxD, Math.max(0, activeDiscountPct)))

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full select-none" role="img" aria-label="Grafik perubahan margin terhadap diskon">
        {/* Zona target aman */}
        {safeBottom > safeTop && (
          <rect
            x={pad.left}
            y={safeTop}
            width={innerW}
            height={safeBottom - safeTop}
            fill="#E9F4EE"
            opacity={0.9}
          />
        )}

        {/* Garis bantu Y */}
        {[minY, 0, target.minPct, target.maxPct, maxY]
          .filter((v, i, arr) => arr.indexOf(v) === i && v >= minY && v <= maxY)
          .map((val) => (
            <g key={val}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={yOf(val)}
                y2={yOf(val)}
                stroke={val === 0 ? '#B83535' : '#E6DDD0'}
                strokeDasharray={val === 0 ? '4 3' : undefined}
                strokeWidth={val === 0 ? 1.2 : 0.8}
              />
              <text x={pad.left - 6} y={yOf(val) + 3.5} textAnchor="end" fontSize="9.5" fill="#705C50">
                {val}%
              </text>
            </g>
          ))}

        {/* Label zona aman */}
        <text x={width - pad.right - 4} y={safeTop + 11} textAnchor="end" fontSize="9" fontWeight="600" fill="#256445">
          Zona Aman ({target.minPct}%–{target.maxPct}%)
        </text>

        {/* Kurva margin */}
        <path d={pathD} fill="none" stroke="#C25E44" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Garis posisi diskon saat ini */}
        <line
          x1={activeX}
          x2={activeX}
          y1={pad.top}
          y2={height - pad.bottom}
          stroke="#2C1E16"
          strokeWidth={1.3}
          strokeDasharray="3 3"
        />

        {/* Label sumbu X */}
        {valid
          .filter((_, idx) => idx % 2 === 0 || idx === valid.length - 1)
          .map((p) => (
            <text
              key={p.discountPct}
              x={xOf(p.discountPct)}
              y={height - 8}
              textAnchor="middle"
              fontSize="9.5"
              fill="#705C50"
            >
              {p.discountPct}%
            </text>
          ))}

        {/* Garis 0 */}
        {zeroY >= pad.top && zeroY <= height - pad.bottom && (
          <text x={pad.left + 4} y={zeroY - 4} fontSize="8.5" fontWeight="600" fill="#B83535">
            Titik Impas (0%)
          </text>
        )}
      </svg>
    </div>
  )
}

/**
 * Grafik batang horizontal perbandingan laba bersih antar platform.
 */
export function PlatformBarChart({
  rows,
}: {
  rows: { id: string; name: string; profit: number; marginPct: number | null; configured: boolean }[]
}) {
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.profit)))

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const widthPct = Math.min(100, Math.max(4, (Math.abs(row.profit) / maxAbs) * 100))
        const positive = row.profit >= 0
        return (
          <div key={row.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-espresso">
                {row.name}{' '}
                {!row.configured && (
                  <span className="font-normal text-below">(tarif belum diatur)</span>
                )}
              </span>
              <span className={`num font-semibold ${positive ? 'text-espresso' : 'text-loss'}`}>
                {formatRupiah(row.profit)} ({formatPct(row.marginPct)})
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-cream">
              <div
                style={{ width: `${widthPct}%` }}
                className={`h-full rounded-full transition-all duration-300 ${
                  positive ? 'bg-terracotta' : 'bg-loss'
                }`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
