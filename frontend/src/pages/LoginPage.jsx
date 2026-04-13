// src/pages/LoginPage.jsx
//
// Pagina di login — Prima cosa che vede l'utente.
// Layout: sidebar sinistra con logo/menu + form login a destra


import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Schermata di registrazione (mostrata quando l'utente clicca "Crea account")
function RegisterForm({ onBack }) {
  const { register } = useAuth()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.username || !form.email || !form.password) {
      setError('Compila tutti i campi')
      return
    }
    setLoading(true)
    setError('')
    try {
      await register(form.username, form.email, form.password)
      onBack()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.formCard}>
      <h2 style={styles.welcome}>Crea Account</h2>
      <p style={styles.welcomeSub}>Registrati su FANalytics</p>

      {error && <div className="error-msg">{error}</div>}

      <div style={styles.field}>
        <label className="form-label">Username</label>
        <input
          className="input-dark"
          type="text"
          placeholder="es. mario.rossi"
          value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
        />
      </div>
      <div style={styles.field}>
        <label className="form-label">Email</label>
        <input
          className="input-dark"
          type="email"
          placeholder="es. mario@email.it"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        />
      </div>
      <div style={styles.field}>
        <label className="form-label">Password</label>
        <input
          className="input-dark"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
        />
      </div>

      <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? 'REGISTRAZIONE...' : 'REGISTRATI'}
      </button>
      <div style={styles.dividerRow}><span>oppure</span></div>
      <button className="btn-secondary" onClick={onBack}>Torna al login</button>
    </div>
  )
}

// Componente principale pagina login
export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [showRegister, setShowRegister] = useState(false)
  const [form, setForm]     = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    if (!form.username || !form.password) {
      setError('Inserisci username e password')
      return
    }
    setLoading(true)
    setError('')
    try {
      await login(form.username, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Credenziali non valide')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      {/* Sidebar sinistra con logo e menu */}
      <div style={styles.leftPanel}>
        {/* Logo */}
        <div style={styles.logo}>
          <span style={styles.logoIcon}>▶</span>
          <div>
            <div style={styles.logoTitle}>FANalytics</div>
            <div style={styles.logoSub}>Dai FAN, per i FAN</div>
          </div>
        </div>

        {/* Menu items (solo decorativi nel login) */}
        <nav style={styles.fakeNav}>
          {['Classifiche Piloti & Costruttori', 'Analisi Gare e Pit Stop', 'Previsione Risultati'].map(item => (
            <div key={item} style={styles.fakeNavItem}>
              <div style={styles.fakeNavBorder} />
              <span>{item}</span>
            </div>
          ))}
        </nav>

        {/* Credits in basso */}
        <div style={styles.leftBottom}>
          <div style={{ color: '#555', fontSize: 12 }}>FANalytics · Stagione 2025</div>
          <div style={{ color: '#444', fontSize: 11 }}>Dati: F1api.dev</div>
        </div>
      </div>

      {/* Pannello destro con form */}
      <div style={styles.rightPanel}>
        {showRegister ? (
          <RegisterForm onBack={() => setShowRegister(false)} />
        ) : (
          <div style={styles.formCard} className="page-enter">
            <h2 style={styles.welcome}>Benvenuto</h2>
            <p style={styles.welcomeSub}>Accedi alla piattaforma di Analytics come un vero FAN</p>

            {error && <div className="error-msg">{error}</div>}

            <div style={styles.field}>
              <label className="form-label">Username</label>
              <input
                className="input-dark"
                type="text"
                placeholder="es. mario.rossi"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleLogin(e)}
              />
            </div>

            <div style={styles.field}>
              <label className="form-label">Password</label>
              <input
                className="input-dark"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleLogin(e)}
              />
            </div>

            {/* Link password dimenticata*/}
            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <span
                style={{ color: '#e10600', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                onClick={() => alert('Funzione "password dimenticata" — da implementare nel backend')}
              >
                Password dimenticata?
              </span>
            </div>

            <button className="btn-primary" onClick={handleLogin} disabled={loading}>
              {loading ? 'ACCESSO IN CORSO...' : 'ACCEDI'}
            </button>

            <div style={styles.dividerRow}><span>oppure</span></div>

            <button className="btn-secondary" onClick={() => setShowRegister(true)}>
              Crea un nuovo account
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0f0f0f',
  },
  // --- Pannello sinistro ---
  leftPanel: {
    width: 320,
    minWidth: 280,
    background: '#141414',
    borderRight: '1px solid #2a2a2a',
    display: 'flex',
    flexDirection: 'column',
    padding: '32px 0',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 24px 32px',
    borderBottom: '1px solid #2a2a2a',
    marginBottom: 24,
  },
  logoIcon: { color: '#e10600', fontSize: 28, lineHeight: 1 },
  logoTitle: { fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: -0.5 },
  logoSub:   { fontSize: 12, color: '#a0a0a0', marginTop: 2 },
  fakeNav: {
    padding: '0 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  fakeNavItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    color: '#a0a0a0',
    fontSize: 14,
    fontWeight: 600,
  },
  fakeNavBorder: {
    width: 3,
    height: 18,
    background: '#e10600',
    borderRadius: 2,
    flexShrink: 0,
  },
  leftBottom: {
    marginTop: 'auto',
    padding: '24px',
    borderTop: '1px solid #2a2a2a',
  },
  // --- Pannello destro ---
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  formCard: {
    width: '100%',
    maxWidth: 520,
  },
  welcome: {
    fontSize: 34,
    fontWeight: 900,
    color: '#fff',
    marginBottom: 8,
  },
  welcomeSub: {
    color: '#a0a0a0',
    fontSize: 15,
    marginBottom: 32,
  },
  field: {
    marginBottom: 16,
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '20px 0',
    color: '#555',
    fontSize: 13,
    '::before': { content: '""', flex: 1, height: 1, background: '#2a2a2a' },
    '::after':  { content: '""', flex: 1, height: 1, background: '#2a2a2a' },
  },
}
