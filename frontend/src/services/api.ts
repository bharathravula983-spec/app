const BASE_URL = import.meta.env.VITE_API_URL || '/api'

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('volt_user')
    return raw ? (JSON.parse(raw) as { token: string }).token : null
  } catch {
    return null
  }
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...(options?.headers as Record<string, string> | undefined),
      },
    })
  } catch {
    throw new Error('Cannot reach the server. Make sure the backend is running on port 8080.')
  }
  if (!res.ok) {
    const text = await res.text()
    // FastAPI wraps errors as {"detail": "..."} — extract that if present
    try {
      const json = JSON.parse(text)
      const detail = json?.detail
      if (typeof detail === 'string') throw new Error(detail)
      if (Array.isArray(detail))       throw new Error(detail.map((d: any) => d.msg).join(', '))
    } catch (e) {
      if (e instanceof Error && e.message !== text) throw e
    }
    throw new Error(text || `Request failed (${res.status})`)
  }
  return res.json()
}

export interface Overview {
  today_usage_kwh: number
  monthly_usage_kwh: number
  rows: number
  date_range: [string, string]
}

export interface TimeseriesPoint { label: string; value: number }

export interface TrainResult {
  rows_used: number
  best_model: string
  metrics: Record<string, { mae: number; rmse: number; mape: number }>
}

export interface ForecastPoint { timestamp: string; predicted_consumption: number }
export interface ForecastResult { horizon: string; hours: number; forecast: ForecastPoint[] }

export interface Anomaly {
  date: string
  daily_kwh: number
  expected_kwh: number
  z_score: number
  severity: 'moderate' | 'high'
  message: string
}

export interface Insight { type: string; message: string }
export interface PeakHour { hour: number; avg_kwh: number }

export interface CostSummary {
  rate_per_kwh: number
  current_month_kwh: number
  previous_month_kwh: number
  predicted_month_kwh: number
  current_bill: number
  previous_bill: number
  predicted_bill: number
  difference_vs_previous: number
  potential_monthly_savings: number
}

export interface ActualVsPredicted { timestamp: string; actual: number; predicted: number }

export interface ModelComparisonResult {
  best_model: string
  metrics: TrainResult['metrics']
  rows_used?: number
}

export interface AuthUser { token: string; name: string; email: string }

export const api = {
  register: (name: string, email: string, password: string) =>
    request<AuthUser>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email: string, password: string) =>
    request<AuthUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  phoneLogin: (phone: string) =>
    request<AuthUser>('/auth/phone-login', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  sendOtp: (target: string, kind: 'email' | 'phone') =>
    request<{ message: string }>('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ target, kind }),
    }),
  verifyOtp: (target: string, code: string, kind: 'email' | 'phone') =>
    request<AuthUser>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ target, code, kind }),
    }),
  overview: () => request<Overview>('/data/overview'),
  timeseries: (granularity: 'hourly' | 'daily' | 'weekly' | 'monthly', limit = 90) =>
    request<TimeseriesPoint[]>(`/data/timeseries?granularity=${granularity}&limit=${limit}`),
  loadSample: () => request('/data/sample', { method: 'POST' }),
  upload: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: form,
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  train: () => request<TrainResult>('/train', { method: 'POST' }),
  modelsComparison: () => request<ModelComparisonResult>('/models/comparison'),
  predict: (horizon: 'day' | 'week' | 'month') => request<ForecastResult>(`/predict?horizon=${horizon}`),
  actualVsPredicted: () => request<ActualVsPredicted[]>('/predict/actual-vs-predicted'),
  anomalies: () => request<Anomaly[]>('/anomalies'),
  insights: () => request<Insight[]>('/insights'),
  peakHours: () => request<PeakHour[]>('/insights/peak-hours'),
  cost: (rate_per_kwh: number, fixed_charge = 0) =>
    request<CostSummary>('/cost', { method: 'POST', body: JSON.stringify({ rate_per_kwh, fixed_charge }) }),
  ask: (question: string, rate_per_kwh = 8.0) =>
    request<{ question: string; answer: string }>('/assistant', {
      method: 'POST',
      body: JSON.stringify({ question, rate_per_kwh }),
    }),
}
