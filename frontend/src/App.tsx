import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'

type Screen = 'register' | 'login'

function hasRegistered() {
  return localStorage.getItem('volt_registered') === '1'
}

function AppInner() {
  const { user, logout } = useAuth()
  const [screen, setScreen] = useState<Screen>(hasRegistered() ? 'login' : 'register')

  if (!user) {
    if (screen === 'login') {
      return (
        <LoginPage onGoRegister={() => {
          localStorage.removeItem('volt_registered')
          setScreen('register')
        }} />
      )
    }
    return (
      <RegisterPage onGoLogin={() => setScreen('login')} />
    )
  }

  return <Dashboard user={user} onLogout={logout} />
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
