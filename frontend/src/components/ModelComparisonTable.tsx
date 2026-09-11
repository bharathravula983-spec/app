import { TrainResult } from '../services/api'

interface Props {
  result: Pick<TrainResult, 'best_model' | 'metrics'> & { rows_used?: number }
}

export default function ModelComparisonTable({ result }: Props) {
  const rows = Object.entries(result.metrics)
  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-muted font-display border-b border-edge">
            <th className="pb-2 pr-3">Model</th>
            <th className="pb-2 pr-3">MAE</th>
            <th className="pb-2 pr-3">RMSE</th>
            <th className="pb-2">MAPE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, m]) => {
            const isBest = name === result.best_model
            return (
              <tr key={name} className={`border-b border-edge/50 ${isBest ? 'bg-volt/5' : ''}`}>
                <td className="py-2 pr-3 font-display text-white/85">
                  {name}
                  {isBest && (
                    <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-volt/15 text-volt align-middle">BEST</span>
                  )}
                </td>
                <td className="py-2 pr-3 font-display text-cyan">{m.mae}</td>
                <td className="py-2 pr-3 font-display text-cyan">{m.rmse}</td>
                <td className="py-2 font-display text-cyan">{m.mape}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {result.rows_used != null && (
        <p className="text-[11px] text-muted mt-3">
          Trained on {result.rows_used.toLocaleString()} hourly records · lower is better on all metrics · best model auto-selected by MAE.
        </p>
      )}
    </div>
  )
}
