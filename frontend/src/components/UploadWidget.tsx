import { useRef, useState } from 'react'
import { api } from '../services/api'

export default function UploadWidget({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File) {
    setBusy(true)
    setStatus(null)
    try {
      const res = await api.upload(file)
      setStatus(`Loaded ${res.rows.toLocaleString()} rows (${res.date_range[0].slice(0, 10)} → ${res.date_range[1].slice(0, 10)})`)
      onDone()
    } catch (e: any) {
      setStatus(`Upload failed: ${e.message?.slice(0, 120) || 'unknown error'}`)
    } finally {
      setBusy(false)
    }
  }

  async function useSample() {
    setBusy(true)
    setStatus(null)
    try {
      await api.loadSample()
      setStatus('Sample smart-meter dataset loaded (180 days, synthetic).')
      onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <button
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="text-xs px-3 py-1.5 rounded-lg border border-cyan/40 text-cyan hover:bg-cyan/10 transition-colors font-display disabled:opacity-50"
      >
        UPLOAD CSV
      </button>
      <button
        disabled={busy}
        onClick={useSample}
        className="text-xs px-3 py-1.5 rounded-lg border border-edge text-muted hover:text-white/80 transition-colors font-display disabled:opacity-50"
      >
        USE SAMPLE DATA
      </button>
      {status && <span className="text-[11px] text-muted">{status}</span>}
    </div>
  )
}
