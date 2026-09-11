import { useState, FormEvent } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  { icon: '⚡', text: 'Real-time energy monitoring' },
  { icon: '🔮', text: 'AI-powered consumption forecasts' },
  { icon: '💰', text: 'Smart bill & savings insights' },
  { icon: '🔔', text: 'Anomaly alerts & peak detection' },
]

export default function RegisterPage({ onGoLogin }: { onGoLogin: () => void }) {
  const { login } = useAuth()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [done, setDone]         = useState(false)

  const inp = 'w-full border border-edge rounded-2xl px-5 py-4 text-base text-white outline-none focus:border-volt/60 transition-colors placeholder:text-muted/40'
  const inpBg = { background: 'rgba(19,19,58,0.70)' }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return }
    setBusy(true)
    try {
      const res = await api.register(name, email, password)
      login(res)
      localStorage.setItem('volt_registered', '1')
      setDone(true)
    } catch (err: any) {
      setError(err.message || 'Registration failed.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="app-shell">
        <div className="app-content flex items-center justify-center px-6">
          <div className="w-full text-center slide-up space-y-5">
            {/* Success ring */}
            <div className="h-24 w-24 rounded-full mx-auto flex items-center justify-center text-4xl"
              style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(96,165,250,0.15))', border: '2px solid rgba(167,139,250,0.5)' }}>
              ✅
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gradient-volt font-display tracking-wide">You're in!</h2>
              <p className="text-white font-semibold text-xl mt-1">{name}</p>
              <p className="text-muted text-sm mt-1">Account created successfully.</p>
              <p className="text-sm mt-2">
                Welcome email sent to <span className="text-cyan font-medium">{email}</span>
              </p>
            </div>

            {/* Features reminder */}
            <div className="glass p-4 text-left space-y-2.5">
              <p className="text-[9px] font-display text-muted uppercase tracking-widest mb-3">What's waiting for you</p>
              {FEATURES.map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2.5">
                  <span className="text-base">{icon}</span>
                  <span className="text-sm text-white/75">{text}</span>
                </div>
              ))}
            </div>

            <button onClick={onGoLogin}
              className="w-full py-4 rounded-2xl font-bold font-display tracking-widest text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#07071a' }}>
              OPEN DASHBOARD
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-content px-5 py-8">

        {/* Top glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-3xl opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.12), transparent 70%)' }} />

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 relative">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)' }}>
            ⚡
          </div>
          <div>
            <p className="text-2xl font-bold tracking-[0.2em] font-display text-gradient-volt leading-none">VOLT</p>
            <p className="text-[10px] text-muted uppercase tracking-widest mt-0.5">Smart Energy AI</p>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white leading-tight">
            Create your<br/>
            <span className="text-gradient-volt">free account</span>
          </h1>
          <p className="text-muted text-sm mt-2">AI-powered energy insights in seconds.</p>
        </div>

        {/* Feature chips */}
        <div className="flex flex-wrap gap-2 mb-7">
          {FEATURES.map(({ icon, text }) => (
            <span key={text} className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-full font-display text-muted"
              style={{ background: 'rgba(37,37,96,0.4)', border: '1px solid rgba(37,37,96,0.8)' }}>
              {icon} {text}
            </span>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-2xl border border-magenta/40 bg-magenta/8 text-magenta text-sm flex items-start gap-2 slide-up">
            <span className="mt-0.5 shrink-0">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted block mb-2">Full Name</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              placeholder="Bharath Kumar" className={inp} style={inpBg} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted block mb-2">Email Address</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" className={inp} style={inpBg} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted block mb-2">Password</label>
            <div className="relative">
              <input required type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className={`${inp} pr-16`} style={inpBg} />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-muted hover:text-white transition-colors font-display tracking-wide">
                {showPw ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted block mb-2">Confirm Password</label>
            <input required type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password" className={inp} style={inpBg} />
          </div>

          <button type="submit" disabled={busy}
            className="w-full mt-2 py-4 rounded-2xl font-bold font-display tracking-widest text-sm disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center gap-2"
            style={{ background: busy ? 'rgba(167,139,250,0.4)' : 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#07071a' }}>
            {busy
              ? <><span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> CREATING…</>
              : <>CREATE FREE ACCOUNT <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
            }
          </button>
        </form>

        {/* Terms hint */}
        <p className="mt-4 text-center text-[11px] text-muted leading-relaxed">
          By creating an account you agree to our<br/>
          <span className="text-volt/70">Terms of Service</span> &amp; <span className="text-volt/70">Privacy Policy</span>
        </p>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <button onClick={onGoLogin} className="text-cyan font-semibold hover:underline underline-offset-2">
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
