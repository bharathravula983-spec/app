import { Insight, Anomaly } from '../services/api'

const typeIcon: Record<string, string> = {
  trend:             '📈',
  peak_hours:        '⚡',
  forecast_warning:  '🔔',
  forecast_stable:   '✅',
  weekend_pattern:   '📅',
  info:              '💡',
}
const typeColor: Record<string, string> = {
  trend:             '#60a5fa',
  peak_hours:        '#fbbf24',
  forecast_warning:  '#f472b6',
  forecast_stable:   '#4ade80',
  weekend_pattern:   '#a78bfa',
  info:              '#a78bfa',
}

export function InsightsList({ insights }: { insights: Insight[] }) {
  return (
    <div className="space-y-2.5">
      {insights.map((ins, i) => {
        const icon  = typeIcon[ins.type]  ?? '💡'
        const color = typeColor[ins.type] ?? '#a78bfa'
        return (
          <div
            key={i}
            className="insight-card p-3.5 flex items-start gap-3 rise-in"
            style={{ animationDelay: `${i * 55}ms`, borderLeftColor: color, borderLeftWidth: 3 }}
          >
            <span className="text-xl shrink-0 mt-0.5">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/85 leading-relaxed">{ins.message}</p>
              <p className="text-[9px] font-display tracking-widest uppercase mt-1.5"
                style={{ color: `${color}90` }}>
                {ins.type.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function AnomalyList({ anomalies }: { anomalies: Anomaly[] }) {
  if (!anomalies.length) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="h-10 w-10 rounded-xl bg-emerald-400/10 border border-emerald-400/25 flex items-center justify-center text-lg shrink-0">
          ✅
        </div>
        <div>
          <p className="text-sm font-medium text-white/80">All clear!</p>
          <p className="text-xs text-muted">No unusual consumption detected in your recent data.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-2.5">
      {anomalies.slice(0, 6).map((a, i) => {
        const isHigh = a.severity === 'high'
        const color  = isHigh ? '#f472b6' : '#fbbf24'
        const bg     = isHigh ? 'rgba(244,114,182,0.06)' : 'rgba(251,191,36,0.06)'
        const border = isHigh ? 'rgba(244,114,182,0.30)' : 'rgba(251,191,36,0.25)'
        return (
          <div
            key={i}
            className="rise-in rounded-2xl p-3.5 flex items-start gap-3"
            style={{ animationDelay: `${i * 55}ms`, background: bg, border: `1px solid ${border}`, borderLeftWidth: 3, borderLeftColor: color }}
          >
            <span className="text-lg shrink-0 mt-0.5">{isHigh ? '🔴' : '🟡'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/85 leading-relaxed">{a.message}</p>
              <div className="flex items-center gap-3 mt-2">
                {/* z-score bar */}
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(Math.abs(a.z_score) / 5 * 100, 100)}%`, background: color }} />
                </div>
                <p className="text-[9px] font-display tracking-widest shrink-0" style={{ color }}>
                  z {a.z_score > 0 ? '+' : ''}{a.z_score} · {a.severity.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
