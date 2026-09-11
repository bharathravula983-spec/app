import { ReactNode } from 'react'

interface Props {
  title: string
  tag?: ReactNode
  children: ReactNode
  className?: string
}

export default function Panel({ title, tag, children, className = '' }: Props) {
  return (
    <div className={`rounded-xl border border-edge bg-panel/80 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm uppercase tracking-wider text-white/90 font-semibold">{title}</h3>
        {tag && (
          typeof tag === 'string' || typeof tag === 'number' ? (
            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-edge text-muted">
              {tag}
            </span>
          ) : (
            <>{tag}</>
          )
        )}
      </div>
      {children}
    </div>
  )
}
