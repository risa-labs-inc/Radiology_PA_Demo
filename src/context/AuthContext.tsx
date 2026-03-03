import { createContext, useContext, useState, ReactNode } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  user: string | null
  login: (email: string, password: string) => { success: boolean; error?: string }
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('isAuthenticated') === 'true'
  })
  const [user, setUser] = useState<string | null>(() => {
    return sessionStorage.getItem('user')
  })

  const login = (email: string, password: string) => {
    // Validate email ends with @risalabs.ai
    if (!email.toLowerCase().endsWith('@risalabs.ai')) {
      return { success: false, error: 'Please use a valid @risalabs.ai email address' }
    }

    // Validate password
    if (password !== 'risa@2026') {
      return { success: false, error: 'Invalid password' }
    }

    setIsAuthenticated(true)
    setUser(email)
    sessionStorage.setItem('isAuthenticated', 'true')
    sessionStorage.setItem('user', email)
    return { success: true }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
    sessionStorage.removeItem('isAuthenticated')
    sessionStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
