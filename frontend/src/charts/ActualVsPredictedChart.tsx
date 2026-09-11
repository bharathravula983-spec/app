import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Props {
  data: { timestamp: string; actual: number; predicted: number }[]
}

export default function ActualVsPredictedChart({ data }: Props) {
  const trimmed = data.map((d) => ({ ...d, label: d.timestamp.slice(5, 16) }))
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={trimmed} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="#252560" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
          axisLine={{ stroke: '#252560' }}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={{ background: '#0e0e2c', border: '1px solid #252560', borderRadius: 8, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#6b7280' }} />
        <Line type="monotone" dataKey="actual"    stroke="#60a5fa" strokeWidth={2} dot={false} name="Actual" />
        <Line type="monotone" dataKey="predicted" stroke="#a78bfa" strokeWidth={2} strokeDasharray="4 3" dot={false} name="Predicted" />
      </LineChart>
    </ResponsiveContainer>
  )
}
