interface Props {
  label: string
  value: string
  sub?: string
  accent?: 'volt' | 'cyan' | 'amber' | 'magenta'
  index?: number
}

const accentMap = {
  volt: { text: 'text-volt', ring: 'shadow-glow', dot: 'bg-volt' },
  cyan: { text: 'text-cyan', ring: 'shadow-cyanGlow', dot: 'bg-cyan' },
  amber: { text: 'text-amber', ring: 'shadow-[0_0_24px_rgba(255,180,84,0.25)]', dot: 'bg-amber' },
  magenta: { text: 'text-magenta', ring: 'shadow-[0_0_24px_rgba(255,92,138,0.25)]', dot: 'bg-magenta' },
}

export default function OverviewCard({ label, value, sub, accent = 'volt', index = 0 }: Props) {
  const a = accentMap[accent]
  return (
    <div
      className={`rise-in relative overflow-hidden rounded-xl border border-edge bg-panel p-5 ${a.ring}`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`h-1.5 w-1.5 rounded-full ${a.dot} pulse-dot`} />
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted font-display">{label}</span>
      </div>
      <div className={`text-3xl font-display font-bold ${a.text}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  )
}
