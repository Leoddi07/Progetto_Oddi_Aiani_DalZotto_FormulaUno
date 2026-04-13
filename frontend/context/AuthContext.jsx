// ============================================================
// src/context/AuthContext.jsx
// Gestione globale dell'autenticazione (API Backend)
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Controllo sessione esistente all'avvio
  useEffect(() => {
    const savedUser = localStorage.getItem('fanalytics_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('fanalytics_user')
      }
    }
    setLoading(false)
  }, [])

  // Login reale verso il backend
  async function login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Credenziali non valide')
    }

    const userData = await res.json() // Riceve { id, username, role, email, token }
    setUser(userData)
    localStorage.setItem('fanalytics_user', JSON.stringify(userData))
    return userData
  }

  // Registrazione reale verso il backend
  async function register(username, email, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Errore durante la registrazione')
    }

    return await res.json()
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('fanalytics_user')
  }

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    isAdmin: user?.role === 'admin',
    isLoggedIn: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}