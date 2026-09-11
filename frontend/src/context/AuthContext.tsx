import { createContext, useContext, useState, ReactNode } from 'react'

interface AuthUser {
  token: string
  name: string
  email: string
}

interface AuthCtx {
  user: AuthUser | null
  login: (u: AuthUser) => void
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem('volt_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  function login(u: AuthUser) {
    localStorage.setItem('volt_user', JSON.stringify(u))
    setUser(u)
  }

  function logout() {
    localStorage.removeItem('volt_user')
    setUser(null)
  }

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
