import { useEffect, useState, useCallback } from 'react'
import {
  api, Overview, TimeseriesPoint, ForecastResult,
  Anomaly, Insight, PeakHour, CostSummary, ActualVsPredicted, ModelComparisonResult, AuthUser,
} from '../services/api'
import ConsumptionChart from '../charts/ConsumptionChart'
import ActualVsPredictedChart from '../charts/ActualVsPredictedChart'
import PeakHourChart from '../charts/PeakHourChart'
import ModelComparisonTable from '../components/ModelComparisonTable'
import { InsightsList, AnomalyList } from '../components/InsightsAndAnomalies'
import AssistantChat from '../components/AssistantChat'
import UploadWidget from '../components/UploadWidget'

type Tab = 'home' | 'charts' | 'insights' | 'assistant' | 'profile'
type Granularity = 'daily' | 'weekly' | 'monthly'

interface Props { user: AuthUser; onLogout: () => void }

// ── Nav Icons ────────────────────────────────────────────────────────────────
const IconHome = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const IconCharts = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="12" width="4" height="10" rx="1" fill={active ? 'currentColor' : 'none'}/>
    <rect x="10" y="6"  width="4" height="16" rx="1" fill={active ? 'currentColor' : 'none'}/>
    <rect x="18" y="2" width="4" height="20" rx="1" fill={active ? 'currentColor' : 'none'}/>
  </svg>
)
const IconInsights = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.663 17h4.673M12 3v1M3.34 7l.86.5M20.66 7l-.86.5M3.34 17l.86-.5M20.66 17l-.86-.5M12 21a6 6 0 000-12 6 6 0 000 12z" fill={active ? 'rgba(167,139,250,0.2)' : 'none'}/>
  </svg>
)
const IconChat = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
)
const IconUser = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" fill={active ? 'rgba(167,139,250,0.2)' : 'none'}/>
    <circle cx="12" cy="7" r="4" fill={active ? 'rgba(167,139,250,0.2)' : 'none'}/>
  </svg>
)

// ── Energy Score Ring ─────────────────────────────────────────────────────────
function EnergyRing({ score, label }: { score: number; label: string }) {
  const r = 52, circ = 2 * Math.PI * r
  const pct = Math.min(Math.max(score, 0), 100)
  const offset = circ - (pct / 100) * circ
  const color = pct >= 75 ? '#4ade80' : pct >= 50 ? '#a78bfa' : pct >= 30 ? '#fbbf24' : '#f472b6'

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 128, height: 128 }}>
        <svg width="128" height="128" viewBox="0 0 128 128">
          <circle className="ring-track" cx="64" cy="64" r={r} />
          <circle
            className="ring-fill"
            cx="64" cy="64" r={r}
            stroke={color}
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-display" style={{ color }}>{pct}</span>
          <span className="text-[9px] text-muted uppercase tracking-widest">/ 100</span>
        </div>
      </div>
      <p className="text-xs text-muted tracking-wide mt-1">{label}</p>
    </div>
  )
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="stat-card p-4 flex items-center gap-4">
      <div className="skeleton h-11 w-11 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-2.5 w-20 rounded" />
        <div className="skeleton h-5 w-28 rounded" />
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon, delay = 0, loading = false }:
  { label: string; value: string; sub?: string; color: string; icon: string; delay?: number; loading?: boolean }) {
  if (loading) return <SkeletonCard />
  return (
    <div className="stat-card p-4 flex items-center gap-4 rise-in"
      style={{ animationDelay: `${delay}ms` }}>
      <div className="h-11 w-11 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest text-muted font-display truncate">{label}</p>
        <p className="text-[22px] font-bold font-display leading-tight" style={{ color }}>{value}</p>
        {sub && <p className="text-[11px] text-muted truncate mt-0.5">{sub}</p>}
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-muted/40 shrink-0">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[10px] uppercase tracking-[0.15em] text-muted font-display">{children}</h2>
      {action}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass p-4 ${className}`}>{children}</div>
}

// ── Pill filter ───────────────────────────────────────────────────────────────
function PillGroup<T extends string>({
  options, value, onChange, accent = '#a78bfa'
}: { options: T[]; value: T; onChange: (v: T) => void; accent?: string }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(o => {
        const active = value === o
        return (
          <button key={o} onClick={() => onChange(o)}
            style={active ? { background: `${accent}20`, borderColor: `${accent}60`, color: accent } : {}}
            className={`text-[10px] px-3 py-1.5 rounded-full uppercase tracking-wide border transition-all duration-200 font-display ${
              active ? '' : 'border-edge text-muted hover:text-white/70'}`}>
            {o}
          </button>
        )
      })}
    </div>
  )
}

// ── Quick action button ───────────────────────────────────────────────────────
function QuickAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button className="quick-action flex-1" onClick={onClick}>
      <span className="text-2xl">{icon}</span>
      <span className="text-[10px] text-muted font-display tracking-wide text-center leading-tight">{label}</span>
    </button>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ user, onLogout }: Props) {
  const [tab, setTab]           = useState<Tab>('home')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [granularity, setGranularity] = useState<Granularity>('daily')
  const [series, setSeries]     = useState<TimeseriesPoint[]>([])
  const [trainResult, setTrainResult] = useState<ModelComparisonResult | null>(null)
  const [forecastHorizon, setForecastHorizon] = useState<'day' | 'week' | 'month'>('day')
  const [forecast, setForecast] = useState<ForecastResult | null>(null)
  const [avp, setAvp]           = useState<ActualVsPredicted[]>([])
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [peaks, setPeaks]       = useState<PeakHour[]>([])
  const [rate, setRate]         = useState(8.0)
  const [cost, setCost]         = useState<CostSummary | null>(null)
  const [loading, setLoading]   = useState(true)
  const [training, setTraining] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const hasData = !loading && (overview?.rows ?? 0) > 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user.name.split(' ')[0]

  const loadCore = useCallback(async () => {
    setError(null)
    try {
      const [ov, ts] = await Promise.all([api.overview(), api.timeseries(granularity)])
      setOverview(ov); setSeries(ts)
    } catch {
      setError('Cannot reach backend. Is the server running on port 8080?')
    }
  }, [granularity])

  const loadExtra = useCallback(async () => {
    const [tr, fc, av, an, ins, pk, cs] = await Promise.all([
      api.modelsComparison().catch(() => null),
      api.predict(forecastHorizon).catch(() => null),
      api.actualVsPredicted().catch(() => []),
      api.anomalies().catch(() => []),
      api.insights().catch(() => []),
      api.peakHours().catch(() => []),
      api.cost(rate).catch(() => null),
    ])
    if (tr) setTrainResult(tr)
    if (fc) setForecast(fc as ForecastResult)
    if (Array.isArray(av)) setAvp(av as ActualVsPredicted[])
    if (Array.isArray(an)) setAnomalies(an as Anomaly[])
    if (Array.isArray(ins)) setInsights(ins as Insight[])
    if (Array.isArray(pk)) setPeaks(pk as PeakHour[])
    if (cs) setCost(cs as CostSummary)
  }, [forecastHorizon, rate])

  useEffect(() => {
    setLoading(true)
    loadCore().finally(() => setLoading(false))
  }, [loadCore])

  useEffect(() => { loadExtra() }, [loadExtra])

  async function handleTrain() {
    setTraining(true); setError(null)
    try {
      const res = await api.train()
      setTrainResult(res)
      await loadExtra()
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : String(e)).slice(0, 200))
    } finally { setTraining(false) }
  }

  async function handleDataChanged() { await loadCore(); await handleTrain() }

  const predictedTomorrow = forecast
    ? forecast.forecast.slice(0, 24).reduce((s, f) => s + f.predicted_consumption, 0).toFixed(1)
    : null

  // Compute a rough energy score (0–100) based on savings potential
  const energyScore = cost
    ? Math.round(Math.max(0, Math.min(100, 100 - (cost.potential_monthly_savings / (cost.current_bill || 1)) * 100)))
    : 72

  const scoreLabel = energyScore >= 80 ? 'Excellent efficiency' : energyScore >= 60 ? 'Good — room to improve' : 'High usage detected'

  // Tip of the day pool
  const TIPS = [
    '💡 Running your AC at 24 °C instead of 18 °C saves up to 24% on cooling bills.',
    '🌙 Shift heavy appliances like washing machines to after 11 PM — off-peak rates are cheaper.',
    '🔌 Unplug chargers and standby devices — they consume 5–10% of your total electricity.',
    '❄️ Clean your AC filters monthly to maintain efficiency and cut power draw.',
    '☀️ Natural light in the morning can replace 2 bulbs for 3+ hours — open those curtains!',
  ]
  const todayTip = TIPS[new Date().getDate() % TIPS.length]

  // ── HOME TAB ────────────────────────────────────────────────────────────────
  function HomeTab() {
    return (
      <div className="px-4 pt-5 pb-4 space-y-5 rise-in">

        {/* Greeting header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted text-sm">{greeting},</p>
            <h1 className="text-2xl font-bold text-white leading-tight">{firstName} 👋</h1>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {loading && <span className="text-[9px] text-muted font-display animate-pulse tracking-widest">SYNCING</span>}
            <div className={`h-2 w-2 rounded-full ${loading ? 'bg-amber animate-pulse' : 'bg-emerald-400 pulse-dot'}`} />
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-3 rounded-2xl border border-magenta/40 bg-magenta/8 text-magenta text-sm flex items-start gap-2 slide-up">
            <span className="shrink-0 mt-0.5">⚠</span>
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Energy score + today/tomorrow hero */}
        <div className="glass p-4 flex items-center gap-4 rise-in" style={{ animationDelay: '40ms' }}>
          <EnergyRing score={energyScore} label={scoreLabel} />
          <div className="flex-1 space-y-3 min-w-0">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-muted font-display">Today's Usage</p>
              <p className="text-2xl font-bold font-display text-gradient-volt leading-tight">
                {overview ? `${overview.today_usage_kwh}` : '—'}
                <span className="text-sm font-normal text-muted ml-1">kWh</span>
              </p>
            </div>
            <div className="h-px bg-edge/50" />
            <div>
              <p className="text-[9px] uppercase tracking-widest text-muted font-display">Predicted Tomorrow</p>
              <p className="text-xl font-bold font-display text-cyan leading-tight">
                {predictedTomorrow ? `${predictedTomorrow}` : '—'}
                <span className="text-sm font-normal text-muted ml-1">kWh</span>
              </p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <SectionTitle>Quick Actions</SectionTitle>
          <div className="flex gap-2">
            <QuickAction icon="📊" label={`Charts`}   onClick={() => setTab('charts')} />
            <QuickAction icon="🔮" label={`Forecast`} onClick={() => setTab('charts')} />
            <QuickAction icon="💬" label={`Ask AI`}   onClick={() => setTab('assistant')} />
            <QuickAction icon="⚠️" label={`Alerts`}   onClick={() => setTab('insights')} />
          </div>
        </div>

        {/* Bill + savings row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card p-4 rise-in" style={{ animationDelay: '80ms' }}>
            <p className="text-[9px] uppercase tracking-widest text-muted font-display mb-1">Est. Bill</p>
            <p className="text-lg font-bold font-display text-gradient-warm leading-tight">
              {cost ? `₹${cost.current_bill.toLocaleString()}` : '—'}
            </p>
            {cost && <p className="text-[10px] text-muted mt-0.5">prev ₹{cost.previous_bill.toLocaleString()}</p>}
          </div>
          <div className="stat-card p-4 rise-in" style={{ animationDelay: '120ms' }}>
            <p className="text-[9px] uppercase tracking-widest text-muted font-display mb-1">Savings Pot.</p>
            <p className="text-lg font-bold font-display text-emerald-400 leading-tight">
              {cost ? `₹${cost.potential_monthly_savings.toLocaleString()}` : '—'}
            </p>
            <p className="text-[10px] text-muted mt-0.5">off-peak shifting</p>
          </div>
        </div>

        {/* Monthly usage */}
        <StatCard
          label="Monthly Usage"
          value={overview ? `${overview.monthly_usage_kwh} kWh` : '—'}
          sub={overview ? `${overview.rows.toLocaleString()} data points loaded` : undefined}
          color="#fbbf24" icon="📅" delay={160} loading={loading}
        />

        {/* Mini sparkline */}
        <div className="rise-in" style={{ animationDelay: '200ms' }}>
          <SectionTitle>Consumption — Last 30 Days</SectionTitle>
          <Card>
            <ConsumptionChart data={series.slice(-30)} color="#a78bfa" height={120} />
          </Card>
        </div>

        {/* Anomaly badge */}
        {anomalies.length > 0 && (
          <button onClick={() => setTab('insights')}
            className="w-full glass p-4 flex items-center gap-3 text-left rise-in active:scale-98 transition-transform"
            style={{ animationDelay: '240ms' }}>
            <div className="h-10 w-10 rounded-xl bg-magenta/15 border border-magenta/30 flex items-center justify-center text-lg shrink-0">⚠️</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{anomalies.length} Anomaly Alert{anomalies.length > 1 ? 's' : ''}</p>
              <p className="text-[11px] text-muted truncate">Unusual consumption detected — tap to review</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-muted shrink-0"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        )}

        {/* Tip of the day */}
        <div className="glass p-4 rise-in" style={{ animationDelay: '280ms',
          background: 'linear-gradient(135deg, rgba(167,139,250,0.08), rgba(96,165,250,0.05))' }}>
          <p className="text-[9px] uppercase tracking-widest text-muted font-display mb-2">💡 Tip of the Day</p>
          <p className="text-sm text-white/80 leading-relaxed">{todayTip}</p>
        </div>

        {/* Data source */}
        <Card>
          <p className="text-[10px] uppercase tracking-widest text-muted font-display mb-3">Data Source</p>
          <UploadWidget onDone={handleDataChanged} />
        </Card>
      </div>
    )
  }

  // ── CHARTS TAB ──────────────────────────────────────────────────────────────
  function ChartsTab() {
    return (
      <div className="px-4 pt-5 pb-4 space-y-6 rise-in">

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Charts</h1>
          {training && <span className="text-[10px] font-display text-amber animate-pulse tracking-widest">TRAINING…</span>}
        </div>

        {/* Consumption */}
        <div>
          <SectionTitle>Consumption Over Time</SectionTitle>
          <Card className="space-y-4">
            <PillGroup options={['daily','weekly','monthly'] as Granularity[]} value={granularity} onChange={setGranularity} />
            <ConsumptionChart data={series} color="#a78bfa" />
          </Card>
        </div>

        {/* Forecast */}
        <div>
          <SectionTitle>AI Forecast</SectionTitle>
          <Card className="space-y-4">
            <PillGroup options={['day','week','month'] as const} value={forecastHorizon}
              onChange={setForecastHorizon} accent="#60a5fa" />
            {forecast && forecast.forecast.length > 0
              ? <ConsumptionChart
                  data={forecast.forecast.map(f => ({ label: f.timestamp.slice(5,16), value: f.predicted_consumption }))}
                  color="#60a5fa" />
              : <p className="text-sm text-muted py-6 text-center">{loading ? 'Loading…' : 'No forecast — upload data first.'}</p>
            }
          </Card>
        </div>

        {/* Actual vs Predicted */}
        <div>
          <SectionTitle>Actual vs Predicted — Backtest</SectionTitle>
          <Card>
            {avp.length > 0
              ? <ActualVsPredictedChart data={avp} />
              : <p className="text-sm text-muted py-6 text-center">{loading ? 'Loading…' : 'No backtest data yet.'}</p>
            }
          </Card>
        </div>

        {/* Peak hours */}
        <div>
          <SectionTitle>Peak Hour Analysis</SectionTitle>
          <Card><PeakHourChart data={peaks} /></Card>
        </div>

        {/* Cost */}
        <div>
          <SectionTitle>Cost Estimate</SectionTitle>
          <Card className="space-y-4">
            <div>
              <label className="text-[10px] text-muted uppercase tracking-widest font-display block mb-2">Tariff rate (₹ / kWh)</label>
              <input type="number" step="0.5" value={rate}
                onChange={e => setRate(parseFloat(e.target.value) || 0)}
                onBlur={() => api.cost(rate).then(setCost).catch(() => null)}
                className="w-full bg-void border border-edge rounded-2xl px-4 py-3 text-sm outline-none focus:border-volt/50 text-white" />
            </div>
            {cost ? (
              <div className="space-y-2 text-sm">
                {([
                  ['Current bill',      `₹${cost.current_bill.toLocaleString()}`,                       '#e5e7eb'],
                  ['Previous bill',     `₹${cost.previous_bill.toLocaleString()}`,                      '#6b7280'],
                  ['Predicted bill',    `₹${cost.predicted_bill.toLocaleString()}`,                     '#a78bfa'],
                  ['vs Previous',       `${cost.difference_vs_previous >= 0 ? '+' : ''}₹${cost.difference_vs_previous.toLocaleString()}`, cost.difference_vs_previous >= 0 ? '#f472b6' : '#4ade80'],
                  ['Potential savings', `₹${cost.potential_monthly_savings.toLocaleString()}`,           '#4ade80'],
                ] as [string, string, string][]).map(([label, value, color]) => (
                  <div key={label} className="flex justify-between items-center border-b border-edge/40 pb-2">
                    <span className="text-muted text-sm">{label}</span>
                    <span className="font-bold font-display text-sm" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted py-2">{loading ? 'Loading…' : 'Cost data unavailable.'}</p>
            )}
          </Card>
        </div>

        {/* Model */}
        <div>
          <SectionTitle action={
            <button onClick={handleTrain} disabled={training}
              className="text-[10px] px-4 py-1.5 rounded-full border border-volt/50 text-volt font-display tracking-widest disabled:opacity-50 active:scale-95 transition-transform">
              {training ? 'TRAINING…' : '↺ RETRAIN'}
            </button>
          }>Model Evaluation</SectionTitle>
          <Card>
            {trainResult
              ? <ModelComparisonTable result={trainResult} />
              : <p className="text-sm text-muted">No model trained yet — tap RETRAIN.</p>
            }
          </Card>
        </div>
      </div>
    )
  }

  // ── INSIGHTS TAB ────────────────────────────────────────────────────────────
  function InsightsTab() {
    const highAnomalies = anomalies.filter(a => a.severity === 'high').length
    const medAnomalies  = anomalies.filter(a => a.severity !== 'high').length

    return (
      <div className="px-4 pt-5 pb-4 space-y-5 rise-in">
        <h1 className="text-xl font-bold text-white">Insights</h1>

        {/* Score summary */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Insights', value: insights.length, color: '#a78bfa' },
            { label: 'High Alerts', value: highAnomalies, color: '#f472b6' },
            { label: 'Warnings',    value: medAnomalies,  color: '#fbbf24' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass p-3 text-center rise-in">
              <p className="text-2xl font-bold font-display" style={{ color }}>{value}</p>
              <p className="text-[9px] text-muted uppercase tracking-wide mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* AI Insights */}
        <div>
          <SectionTitle>AI Insights</SectionTitle>
          <Card>
            {insights.length > 0
              ? <InsightsList insights={insights} />
              : <p className="text-sm text-muted">{loading ? 'Loading…' : 'No insights yet. Upload data to get started.'}</p>
            }
          </Card>
        </div>

        {/* Anomaly Alerts */}
        <div>
          <SectionTitle action={
            anomalies.length > 0
              ? <span className="text-[9px] font-display px-2.5 py-1 rounded-full border border-magenta/40 text-magenta bg-magenta/10">
                  {anomalies.length} FOUND
                </span>
              : null
          }>Anomaly Alerts</SectionTitle>
          <Card>
            <AnomalyList anomalies={anomalies} />
          </Card>
        </div>

        {/* Energy tips */}
        <div>
          <SectionTitle>Energy Saving Tips</SectionTitle>
          <div className="space-y-2">
            {[
              { icon: '🌙', tip: 'Run heavy appliances off-peak (11 PM – 6 AM) to cut costs.' },
              { icon: '❄️', tip: 'Set AC to 24 °C — each degree colder adds ~6% to bill.' },
              { icon: '🔌', tip: 'Unplug standby devices — phantom loads cost ₹200–500/month.' },
              { icon: '💧', tip: 'Use cold-water wash cycles — heating water uses 90% of laundry energy.' },
            ].map(({ icon, tip }, i) => (
              <div key={i} className="insight-card p-3.5 flex items-start gap-3 rise-in" style={{ animationDelay: `${i * 50}ms` }}>
                <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                <p className="text-sm text-white/75 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── ASSISTANT TAB ────────────────────────────────────────────────────────────
  function AssistantTab() {
    return (
      <div className="flex flex-col h-full rise-in" style={{ height: 'calc(100% - 0px)' }}>
        {/* Header */}
        <div className="px-4 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-volt/15 border border-volt/30 flex items-center justify-center text-lg shrink-0">🤖</div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">VOLT AI Assistant</h1>
              <p className="text-[10px] text-emerald-400 font-display tracking-wide mt-0.5">● Online</p>
            </div>
          </div>
        </div>
        <div className="flex-1 px-4 pb-4 min-h-0">
          <AssistantChat ratePerKwh={rate} />
        </div>
      </div>
    )
  }

  // ── PROFILE TAB ──────────────────────────────────────────────────────────────
  function ProfileTab() {
    const initial = user.name.charAt(0).toUpperCase()
    return (
      <div className="px-4 pt-5 pb-4 space-y-5 rise-in">
        <h1 className="text-xl font-bold text-white">Profile</h1>

        {/* Avatar card */}
        <div className="glass p-5 flex items-center gap-4">
          <div className="h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold font-display shrink-0 uppercase"
            style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(96,165,250,0.2))', border: '2px solid rgba(167,139,250,0.4)', color: '#a78bfa' }}>
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-lg leading-tight truncate">{user.name}</p>
            <p className="text-muted text-sm truncate">{user.email}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-full border border-volt/40 text-volt font-display bg-volt/10">
              ⚡ VOLT MEMBER
            </span>
          </div>
        </div>

        {/* Usage summary */}
        <div>
          <SectionTitle>This Month</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass p-4">
              <p className="text-[9px] text-muted uppercase tracking-widest font-display mb-1">Usage</p>
              <p className="text-xl font-bold text-gradient-volt font-display">{overview ? `${overview.monthly_usage_kwh}` : '—'}</p>
              <p className="text-[10px] text-muted">kWh consumed</p>
            </div>
            <div className="glass p-4">
              <p className="text-[9px] text-muted uppercase tracking-widest font-display mb-1">Bill</p>
              <p className="text-xl font-bold text-gradient-warm font-display">{cost ? `₹${cost.current_bill.toLocaleString()}` : '—'}</p>
              <p className="text-[10px] text-muted">estimated total</p>
            </div>
          </div>
        </div>

        {/* Settings rows */}
        <div>
          <SectionTitle>Settings</SectionTitle>
          <Card className="divide-y divide-edge/40 !p-0 overflow-hidden">
            {[
              { icon: '⚡', label: 'Tariff Rate', value: `₹${rate}/kWh`, action: () => setTab('charts') },
              { icon: '🔔', label: 'Notifications', value: 'Coming soon', action: undefined },
              { icon: '📤', label: 'Upload Data',   value: 'CSV / Excel',  action: () => setTab('home') },
              { icon: '🎨', label: 'Theme',         value: 'Deep Blue',   action: undefined },
            ].map(({ icon, label, value, action }) => (
              <button key={label} onClick={action ?? undefined}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${action ? 'active:bg-white/5 transition-colors' : 'opacity-70'}`}>
                <span className="text-lg shrink-0">{icon}</span>
                <span className="flex-1 text-sm text-white/85">{label}</span>
                <span className="text-[11px] text-muted">{value}</span>
                {action && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-muted/50 shrink-0"><path d="M9 18l6-6-6-6"/></svg>}
              </button>
            ))}
          </Card>
        </div>

        {/* App info */}
        <div>
          <SectionTitle>About</SectionTitle>
          <Card className="space-y-2.5 text-sm">
            {[
              ['Version',  'v1.0.0 — Stage 1'],
              ['Backend',  'FastAPI + scikit-learn'],
              ['Frontend', 'React + Vite + Tailwind'],
              ['Data',     overview ? `${overview.rows.toLocaleString()} rows` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-edge/40 pb-2 last:border-0 last:pb-0">
                <span className="text-muted">{k}</span>
                <span className="text-white/75 text-right">{v}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* Sign out */}
        <button onClick={onLogout}
          className="w-full py-4 rounded-2xl border border-magenta/35 text-magenta font-display text-sm tracking-widest active:scale-95 transition-all hover:bg-magenta/8 flex items-center justify-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          SIGN OUT
        </button>
      </div>
    )
  }

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-edge/60 shrink-0"
        style={{ background: 'rgba(7,7,26,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-volt/15 border border-volt/30 flex items-center justify-center text-sm">⚡</div>
          <span className="font-display font-bold tracking-[0.25em] text-sm text-gradient-volt">VOLT</span>
        </div>
        <div className="flex items-center gap-2">
          {anomalies.length > 0 && (
            <button onClick={() => setTab('insights')}
              className="flex items-center gap-1 text-[9px] font-display px-2 py-1 rounded-full bg-magenta/15 border border-magenta/30 text-magenta">
              ⚠ {anomalies.length}
            </button>
          )}
          <div className={`h-2 w-2 rounded-full ${loading ? 'bg-amber animate-pulse' : 'bg-emerald-400 pulse-dot'}`} />
        </div>
      </div>

      {/* Page content */}
      <div className="app-content">
        {!hasData && !loading ? (
          /* ── Upload gate — shown until the user provides data ─────────── */
          <div className="flex flex-col items-center justify-center h-full px-8 text-center rise-in">
            <div className="h-20 w-20 rounded-3xl bg-volt/10 border border-volt/30 flex items-center justify-center text-4xl mb-6">
              📂
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No data yet</h2>
            <p className="text-sm text-muted mb-8 leading-relaxed max-w-xs">
              Upload your energy CSV to unlock charts, forecasts, anomaly detection, and AI insights.
            </p>
            <UploadWidget onDone={handleDataChanged} />
          </div>
        ) : (
          <>
            {tab === 'home'      && <HomeTab />}
            {tab === 'charts'    && <ChartsTab />}
            {tab === 'insights'  && <InsightsTab />}
            {tab === 'assistant' && <AssistantTab />}
            {tab === 'profile'   && <ProfileTab />}
          </>
        )}
      </div>

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        {([
          { id: 'home',      label: 'Home',     Icon: IconHome },
          { id: 'charts',    label: 'Charts',   Icon: IconCharts },
          { id: 'insights',  label: 'Insights', Icon: IconInsights },
          { id: 'assistant', label: 'AI Chat',  Icon: IconChat },
          { id: 'profile',   label: 'Profile',  Icon: IconUser },
        ] as { id: Tab; label: string; Icon: (p: { active?: boolean }) => JSX.Element }[]).map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button key={id} className={`nav-tab ${active ? 'active' : ''}`} onClick={() => setTab(id)}>
              <Icon active={active} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
