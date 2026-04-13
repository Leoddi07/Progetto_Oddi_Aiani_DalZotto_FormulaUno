// src/components/Sidebar.jsx
//
// Barra di navigazione laterale sinistra.
// Presente in tutte le pagine dopo il login.


import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Icone SVG inline
const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
)
const IconRaces = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
    <line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
)
const IconPredict = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)
const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
  </svg>
)
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

// Voci di navigazione
const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Dashboard',   Icon: IconDashboard },
  { to: '/races',       label: 'Gare',         Icon: IconRaces     },
  { to: '/predict',     label: 'Previsione',   Icon: IconPredict   },
  { to: '/admin',       label: 'Impostazioni', Icon: IconSettings  },
]

export default function Sidebar() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside style={styles.sidebar}>
      {/* Logo e titolo */}
      <div style={styles.logo}>
        <span style={styles.logoIcon}>▶</span>
        <div>
          <div style={styles.logoTitle}>FANalytics</div>
          <div style={styles.logoSub}>Stagione 2025</div>
        </div>
      </div>

      {/* Voci di menu */}
      <nav style={styles.nav}>
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          // Nascondi "Impostazioni" agli utenti non-admin
          if (to === '/admin' && !isAdmin) return null
          return (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              })}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Sezione utente in basso */}
      <div style={styles.userSection}>
        <div style={styles.userName}>{user?.username}</div>
        <div style={styles.userRole}>
          {isAdmin
            ? <span style={{ color: '#e10600', fontSize: 12, fontWeight: 700 }}>Amministratore</span>
            : <span style={{ color: '#a0a0a0', fontSize: 12 }}>Utente standard</span>
          }
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <IconLogout />
          <span>Esci</span>
        </button>
      </div>

      {/* Nota crediti */}
      <div style={styles.credits}>
        FANalytics · Stagione 2025<br />
        <span style={{ color: '#555' }}>Dati: F1api.dev</span>
      </div>
    </aside>
  )
}

// Stili inline per il sidebar
const styles = {
  sidebar: {
    position: 'fixed',
    top: 0, left: 0,
    width: 220,
    height: '100vh',
    background: '#141414',
    borderRight: '1px solid #2a2a2a',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
    zIndex: 100,
    overflowY: 'auto',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 20px 28px',
    borderBottom: '1px solid #2a2a2a',
    marginBottom: 16,
  },
  logoIcon: {
    color: '#e10600',
    fontSize: 22,
    lineHeight: 1,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: -0.5,
    color: '#fff',
  },
  logoSub: {
    fontSize: 11,
    color: '#a0a0a0',
    marginTop: 1,
  },
  nav: {
    flex: 1,
    padding: '0 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 8,
    color: '#a0a0a0',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.15s',
    borderLeft: '3px solid transparent',
  },
  navItemActive: {
    background: 'rgba(225,6,0,0.1)',
    color: '#fff',
    borderLeftColor: '#e10600',
  },
  userSection: {
    padding: '16px 20px',
    borderTop: '1px solid #2a2a2a',
    marginTop: 'auto',
  },
  userName: {
    fontWeight: 700,
    fontSize: 14,
    color: '#fff',
  },
  userRole: {
    marginBottom: 12,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'none',
    border: '1px solid #2a2a2a',
    color: '#a0a0a0',
    padding: '7px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'inherit',
    width: '100%',
    transition: 'all 0.15s',
  },
  credits: {
    padding: '12px 20px 0',
    fontSize: 11,
    color: '#555',
    lineHeight: 1.6,
  },
}
