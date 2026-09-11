import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'

interface Props {
  data: { hour: number; avg_kwh: number }[]
}

export default function PeakHourChart({ data }: Props) {
  const full = Array.from({ length: 24 }, (_, h) => {
    const found = data.find((d) => d.hour === h)
    return { hour: `${h}:00`, avg_kwh: found ? found.avg_kwh : 0, isPeak: !!found }
  })
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={full} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="#252560" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="hour" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={{ stroke: '#252560' }} tickLine={false} interval={2} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={{ background: '#0e0e2c', border: '1px solid #252560', borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey="avg_kwh" radius={[3, 3, 0, 0]}>
          {full.map((entry, i) => (
            <Cell key={i} fill={entry.isPeak ? '#f472b6' : '#1e1e4a'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
