import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: { label: string; value: number }[]
  color?: string
  unit?: string
  height?: number
}

export default function ConsumptionChart({ data, color = '#a78bfa', unit = 'kWh', height = 260 }: Props) {
  const gradId = `grad-${color.replace('#', '')}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#252560" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
          axisLine={{ stroke: '#252560' }}
          tickLine={false}
          minTickGap={30}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{ background: '#0e0e2c', border: '1px solid #252560', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#6b7280' }}
          formatter={(v: number) => [`${v.toFixed(2)} ${unit}`, 'Usage']}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
