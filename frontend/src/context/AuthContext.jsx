import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [googleConfig, setGoogleConfig] = useState(null)

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token')
        if (token) {
          // Verify token with backend
          try {
            const { data } = await api.get('/auth/me')
            setUser(data)
            localStorage.setItem('user', JSON.stringify(data))
          } catch (err) {
            console.error('Session verification failed:', err)
            logout() // Clear invalid session
          }
        }
        
        // Fetch Google OAuth configuration
        await fetchGoogleConfig()
      } catch (err) {
        console.error('Auth initialization error:', err)
      } finally {
        setLoading(false)
      }
    }
    
    initAuth()
  }, [])

  const fetchGoogleConfig = async () => {
    try {
      const { data } = await api.get('/auth/config')
      // Always enable for development, or use backend response
      const config = {
        ...data,
        google_oauth_enabled: true  // Force enable for development
      }
      setGoogleConfig(config)
    } catch (err) {
      console.error('Failed to load Google OAuth config:', err)
      // Enable button even if backend config fails (for development)
      setGoogleConfig({
        google_oauth_enabled: true,
        google_client_id: 'development-mode'
      })
    }
  }

  const login = async (email, password, role) => {
    const { data } = await api.post('/auth/login', { email, password, role })
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const loginWithGoogle = async (googleToken, role = 'user') => {
    try {
      const { data } = await api.post('/auth/google-login', {
        token: googleToken,
        role
      })
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      return { success: true, user: data.user }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.detail || 'Google login failed'
      }
    }
  }

  const register = async (name, email, password, role, agent_channel) => {
    const { data } = await api.post('/auth/register', { name, email, password, role, agent_channel })
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, googleConfig, login, loginWithGoogle, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
