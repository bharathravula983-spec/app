import { useState, FormEvent } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

type Method = 'email' | 'google' | 'github' | 'phone'

/* ── Icons ──────────────────────────────────────────────────────────────────── */
const IcoEmail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
  </svg>
)
const IcoGoogle = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)
const IcoGithub = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
)
const IcoPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
    <line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
)

const TABS: { id: Method; label: string; Icon: () => JSX.Element; color: string }[] = [
  { id: 'email',  label: 'Email',  Icon: IcoEmail,  color: '#a78bfa' },
  { id: 'google', label: 'Google', Icon: IcoGoogle, color: '#4285F4' },
  { id: 'github', label: 'GitHub', Icon: IcoGithub, color: '#e2e8f0' },
  { id: 'phone',  label: 'Phone',  Icon: IcoPhone,  color: '#60a5fa' },
]

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px" style={{ background: 'rgba(37,37,96,0.8)' }} />
      <span className="text-[9px] text-muted font-display tracking-widest">OR</span>
      <div className="flex-1 h-px" style={{ background: 'rgba(37,37,96,0.8)' }} />
    </div>
  )
}
function Spinner({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block" />
      {label}
    </span>
  )
}

const inpBase = 'w-full border border-edge rounded-2xl px-5 py-4 text-base text-white outline-none focus:border-volt/60 transition-colors placeholder:text-muted/40'
const inpStyle = { background: 'rgba(19,19,58,0.70)' }

const OTP_INP = 'w-full border border-cyan/40 rounded-2xl px-5 py-5 text-2xl text-center text-cyan font-display tracking-[0.6em] outline-none focus:border-cyan/80 transition-colors placeholder:text-muted/30'

/* ── Main ───────────────────────────────────────────────────────────────────── */
export default function LoginPage({ onGoRegister }: { onGoRegister: () => void }) {
  const { login } = useAuth()
  const [method, setMethod]     = useState<Method>('email')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [phone, setPhone]       = useState('')
  const [otp, setOtp]           = useState('')
  const [otpSent, setOtpSent]   = useState(false)
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [info, setInfo]         = useState<string | null>(null)

  function switchMethod(m: Method) {
    setMethod(m); setError(null); setInfo(null); setOtpSent(false); setOtp('')
  }

  /* ── Email password login ── */
  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault(); setError(null); setBusy(true)
    try { login(await api.login(email, password)) }
    catch (err: any) { setError(err.message || 'Login failed.') }
    finally { setBusy(false) }
  }

  /* ── Email OTP: send ── */
  async function handleSendEmailOtp(e: FormEvent) {
    e.preventDefault(); setError(null)
    if (!email) { setError('Enter your email address first.'); return }
    setBusy(true)
    try {
      const res = await api.sendOtp(email, 'email')
      setOtpSent(true)
      setInfo('✅ ' + res.message + ' — check your inbox (and spam folder).')
    } catch (err: any) { setError(err.message || 'Failed to send OTP.') }
    finally { setBusy(false) }
  }

  /* ── Email OTP: verify ── */
  async function handleVerifyEmailOtp(e: FormEvent) {
    e.preventDefault(); setError(null); setBusy(true)
    try { login(await api.verifyOtp(email, otp, 'email')) }
    catch (err: any) { setError(err.message || 'OTP verification failed.') }
    finally { setBusy(false) }
  }

  /* ── Social ── */
  function handleSocial(provider: 'Google' | 'GitHub') {
    setInfo(`${provider} sign-in is coming in Stage 2. Use Email login for now.`)
  }

  /* ── Phone login ── */
  async function handlePhoneLogin(e: FormEvent) {
    e.preventDefault(); setError(null)
    setBusy(true)
    try { login(await api.phoneLogin(phone)) }
    catch (err: any) { setError(err.message || 'Phone login failed.') }
    finally { setBusy(false) }
  }

  return (
    <div className="app-shell">
      <div className="app-content px-5 pt-10 pb-8">

        {/* Top glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.09), transparent 70%)' }} />

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
        <div className="mb-7">
          <h1 className="text-3xl font-bold text-white leading-tight">
            Welcome<br/>back 👋
          </h1>
          <p className="text-muted text-sm mt-2">Choose how you'd like to sign in.</p>
        </div>

        {/* ── 4 method tabs ── */}
        <div className="grid grid-cols-4 gap-1.5 mb-7 p-1.5 rounded-2xl"
          style={{ background: 'rgba(19,19,58,0.60)', border: '1px solid rgba(37,37,96,0.7)' }}>
          {TABS.map(({ id, label, Icon, color }) => {
            const active = method === id
            return (
              <button key={id} onClick={() => switchMethod(id)}
                style={active ? { background: color, color: '#07071a' } : {}}
                className={`relative flex flex-col items-center gap-1.5 py-3 rounded-xl text-[9px] font-display uppercase tracking-wide transition-all duration-200 ${
                  active ? 'shadow-lg scale-[1.03]' : 'text-muted hover:text-white/70'}`}>
                <Icon />
                <span>{label}</span>
              </button>
            )
          })}
        </div>

        {/* ── Alerts ── */}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-2xl border border-magenta/40 bg-magenta/8 text-magenta text-sm flex items-start gap-2 slide-up">
            <span className="shrink-0 mt-0.5">⚠</span>
            <span className="whitespace-pre-line leading-relaxed">{error}</span>
          </div>
        )}
        {info && (
          <div className="mb-5 px-4 py-3 rounded-2xl border border-cyan/35 bg-cyan/8 text-cyan text-sm flex items-start gap-2 slide-up">
            <span className="shrink-0 mt-0.5">ℹ️</span>
            <span className="whitespace-pre-line leading-relaxed">{info}</span>
          </div>
        )}

        {/* ════ EMAIL ════ */}
        {method === 'email' && !otpSent && (
          <div className="space-y-4 slide-up">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted block mb-2">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" className={inpBase} style={inpStyle} />
            </div>

            {/* Password */}
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted block mb-2">Password</label>
                <div className="relative">
                  <input required type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Your password" className={`${inpBase} pr-14`} style={inpStyle} />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-muted hover:text-white transition-colors font-display tracking-wide">
                    {showPw ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={busy}
                className="w-full py-4 rounded-2xl font-bold font-display tracking-widest text-sm disabled:opacity-50 active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#07071a' }}>
                {busy ? <Spinner label="SIGNING IN…" /> : 'SIGN IN WITH PASSWORD →'}
              </button>
            </form>

            <OrDivider />

            {/* Email OTP */}
            <form onSubmit={handleSendEmailOtp}>
              <button type="submit" disabled={busy || !email}
                className="w-full py-4 rounded-2xl border font-bold font-display tracking-widest text-sm disabled:opacity-50 active:scale-95 transition-transform"
                style={{ borderColor: 'rgba(96,165,250,0.40)', background: 'rgba(96,165,250,0.06)', color: '#60a5fa' }}>
                {busy ? <Spinner label="SENDING OTP…" /> : '📧  SIGN IN WITH EMAIL OTP →'}
              </button>
            </form>
          </div>
        )}

        {/* Email OTP — verify */}
        {method === 'email' && otpSent && (
          <form onSubmit={handleVerifyEmailOtp} className="space-y-4 slide-up">
            <div className="rounded-2xl border border-cyan/30 bg-cyan/5 p-4 text-center">
              <p className="text-cyan text-sm font-semibold">OTP sent to</p>
              <p className="text-white font-bold text-lg font-display">{email}</p>
              <p className="text-muted text-xs mt-1">Check your inbox — valid for 10 mins</p>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted block mb-2">Enter 6-Digit OTP</label>
              <input type="text" inputMode="numeric" maxLength={6} value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000" className={OTP_INP} style={inpStyle} autoFocus />
            </div>
            <button type="submit" disabled={busy || otp.length < 6}
              className="w-full py-4 rounded-2xl font-bold font-display tracking-widest text-sm disabled:opacity-50 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', color: '#07071a' }}>
              {busy ? <Spinner label="VERIFYING…" /> : 'VERIFY OTP →'}
            </button>
            <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setInfo(null) }}
              className="w-full py-3 text-sm text-muted font-display tracking-wide">
              ← BACK TO LOGIN
            </button>
          </form>
        )}

        {/* ════ GOOGLE ════ */}
        {method === 'google' && (
          <div className="space-y-4 slide-up">
            <div className="rounded-2xl p-5 text-center"
              style={{ background: 'rgba(19,19,58,0.60)', border: '1px solid rgba(37,37,96,0.7)' }}>
              <div className="text-4xl mb-3">G</div>
              <p className="text-white font-semibold mb-1">Continue with Google</p>
              <p className="text-muted text-xs leading-relaxed">Sign in instantly using your Google account.<br/>No password needed.</p>
            </div>
            <button onClick={() => handleSocial('Google')}
              className="w-full py-4 rounded-2xl font-bold font-display tracking-widest text-sm flex items-center justify-center gap-3 active:scale-95 transition-transform"
              style={{ background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.35)', color: '#fff' }}>
              <IcoGoogle /> CONTINUE WITH GOOGLE
            </button>
            <OrDivider />
            <button onClick={() => switchMethod('email')}
              className="w-full py-3.5 rounded-2xl border border-volt/30 text-volt font-display tracking-widest text-sm active:scale-95 transition-transform">
              USE EMAIL INSTEAD
            </button>
          </div>
        )}

        {/* ════ GITHUB ════ */}
        {method === 'github' && (
          <div className="space-y-4 slide-up">
            <div className="rounded-2xl p-5 text-center"
              style={{ background: 'rgba(19,19,58,0.60)', border: '1px solid rgba(37,37,96,0.7)' }}>
              <div className="text-4xl mb-3">🐙</div>
              <p className="text-white font-semibold mb-1">Continue with GitHub</p>
              <p className="text-muted text-xs leading-relaxed">Sign in with your GitHub developer account.<br/>Perfect for developers.</p>
            </div>
            <button onClick={() => handleSocial('GitHub')}
              className="w-full py-4 rounded-2xl font-bold font-display tracking-widest text-sm flex items-center justify-center gap-3 active:scale-95 transition-transform"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
              <IcoGithub /> CONTINUE WITH GITHUB
            </button>
            <OrDivider />
            <button onClick={() => switchMethod('email')}
              className="w-full py-3.5 rounded-2xl border border-volt/30 text-volt font-display tracking-widest text-sm active:scale-95 transition-transform">
              USE EMAIL INSTEAD
            </button>
          </div>
        )}

        {/* ════ PHONE ════ */}
        {method === 'phone' && (
          <form onSubmit={handlePhoneLogin} className="space-y-4 slide-up">
            <div className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: 'rgba(19,19,58,0.60)', border: '1px solid rgba(37,37,96,0.7)' }}>
              <span className="text-2xl shrink-0">📱</span>
              <p className="text-xs text-muted leading-relaxed">
                Enter your registered mobile number to sign in. No OTP required.
              </p>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted block mb-2">Phone Number</label>
              <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210" className={inpBase} style={inpStyle} />
            </div>
            <button type="submit" disabled={busy}
              className="w-full py-4 rounded-2xl font-bold font-display tracking-widest text-sm disabled:opacity-50 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', color: '#07071a' }}>
              {busy ? <Spinner label="SIGNING IN…" /> : 'SIGN IN WITH PHONE →'}
            </button>
            <OrDivider />
            <button type="button" onClick={() => switchMethod('email')}
              className="w-full py-3.5 rounded-2xl border border-volt/30 text-volt font-display tracking-widest text-sm active:scale-95 transition-transform">
              USE EMAIL INSTEAD
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="mt-10 text-center text-sm text-muted">
          Don't have an account?{' '}
          <button onClick={onGoRegister} className="text-cyan font-semibold hover:underline underline-offset-2">
            Register free
          </button>
        </p>
      </div>
    </div>
  )
}
