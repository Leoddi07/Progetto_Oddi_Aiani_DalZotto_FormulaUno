
// src/pages/AdminPage.jsx
// Pannello di amministrazione — visibile SOLO agli admin.
// Permette di:
//  - Modificare manualmente i dati nel database
//  - Gestire gli utenti (reset password, eliminazione)
//  - Forzare il refresh dei dati da F1api.dev


import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import { getUsers, deleteUser, forceRefresh, adminEditData } from '../services/api.js'

// Tabelle disponibili per la modifica manuale
const TABLES = ['Piloti', 'Scuderie', 'Gare', 'Risultati', 'PitStop']

export default function AdminPage() {
  const { isAdmin } = useAuth()
  const navigate    = useNavigate()

  // Redirect se non admin
  useEffect(() => {
    if (!isAdmin) navigate('/dashboard')
  }, [isAdmin])

  const [users, setUsers]         = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  // Form modifica dati
  const [editTable,   setEditTable]   = useState('Piloti')
  const [editId,      setEditId]      = useState('')
  const [editField,   setEditField]   = useState('')
  const [editSuccess, setEditSuccess] = useState('')

  // Stato refresh
  const [refreshStatus, setRefreshStatus] = useState({
    drivers: '',
    races:   '',
    next:    '',
  })

  // Carica lista utenti
  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoadingUsers(false))
  }, [])

  // Elimina utente
  async function handleDelete(userId, username) {
    if (!confirm(`Eliminare l'account "${username}"?`)) return
    try {
      await deleteUser(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (e) {
      alert('Errore eliminazione: ' + e.message)
    }
  }

  // Reset password 
  function handleReset(userId, username) {
    //PUT /api/admin/users/:id/reset-password
    alert(`Reset password per "${username}" — implementare l'endpoint nel backend`)
  }

  // Forza refresh dati da F1api.dev
  async function handleRefresh(type, label) {
    setRefreshStatus(prev => ({ ...prev, [type]: '⏳ Aggiornamento...' }))
    try {
      await forceRefresh(type)
      setRefreshStatus(prev => ({ ...prev, [type]: '✅ Aggiornato!' }))
    } catch {
      setRefreshStatus(prev => ({ ...prev, [type]: '❌ Errore' }))
    }
  }

  // Salva modifica manuale
  async function handleSaveEdit() {
    if (!editId || !editField) {
      alert('Compila Record ID e Campo da modificare')
      return
    }
    // Il campo potrebbe essere scritto come "punti_totali = 295"
    // lo splittiamo su "=" per ottenere campo e valore
    const parts = editField.split('=')
    const field = parts[0]?.trim()
    const value = parts[1]?.trim()
    try {
      await adminEditData(editTable, editId, field, value)
      setEditSuccess('Modifica salvata!')
      setTimeout(() => setEditSuccess(''), 3000)
    } catch (e) {
      alert('Errore modifica: ' + e.message)
    }
  }

  if (!isAdmin) return null

  return (
    <div className="page-enter">
      {/* Titolo con badge admin */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={styles.pageTitle}>Pannello di Amministrazione</h1>
        <span style={{
          background: 'rgba(225,6,0,0.15)',
          color: '#e10600',
          border: '1px solid rgba(225,6,0,0.4)',
          padding: '6px 14px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 1,
        }}>
          ACCESSO ADMIN
        </span>
      </div>

      <div style={styles.mainGrid}>

        {/* ---- Modifica Dati Manuale ---- */}
        <div className="card">
          <h3 style={styles.sectionTitle}>Modifica Dati Manuale</h3>
          <p style={{ color: '#a0a0a0', fontSize: 13, marginBottom: 20 }}>
            Seleziona entità da modificare
          </p>

          <div style={styles.field}>
            <label className="form-label">Tabella</label>
            <div style={{ position: 'relative' }}>
              <select className="input-dark" value={editTable} onChange={e => setEditTable(e.target.value)}>
                {TABLES.map(t => <option key={t}>{t}</option>)}
              </select>
              <span style={styles.selectArrow}>▾</span>
            </div>
          </div>

          <div style={styles.field}>
            <label className="form-label">Record ID</label>
            <input
              className="input-dark"
              type="text"
              placeholder="es. 001"
              value={editId}
              onChange={e => setEditId(e.target.value)}
            />
          </div>

          <div style={styles.field}>
            <label className="form-label">Campo da modificare</label>
            <input
              className="input-dark"
              type="text"
              placeholder="es. punti_totali = 295"
              value={editField}
              onChange={e => setEditField(e.target.value)}
            />
          </div>

          {editSuccess && (
            <div style={{ color: '#00d2be', fontSize: 13, marginBottom: 12 }}>{editSuccess}</div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button className="btn-primary" onClick={handleSaveEdit}>Salva modifica</button>
            <button className="btn-secondary" onClick={() => { setEditId(''); setEditField('') }}>Annulla</button>
          </div>
        </div>

        {/* ---- Gestione Utenti ---- */}
        <div className="card">
          <h3 style={styles.sectionTitle}>Gestione Utenti</h3>

          {loadingUsers ? (
            <div className="spinner" />
          ) : (
            <table className="standings-table">
              <thead>
                <tr>
                  <th>Utente</th>
                  <th>Ruolo</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{u.username}</div>
                      <div style={{ fontSize: 12, color: '#555' }}>{u.email}</div>
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                        {u.role === 'admin' ? 'Admin' : 'Utente'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleReset(u.id, u.username)}
                          style={styles.actionBtn}
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.username)}
                          style={{ ...styles.actionBtn, color: '#e10600', borderColor: 'rgba(225,6,0,0.3)' }}
                        >
                          Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ---- Aggiornamento Dati API ---- */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={styles.sectionTitle}>Aggiornamento Dati API dal DB MySQL</h3>
        <p style={{ color: '#a0a0a0', fontSize: 13, marginBottom: 20 }}>
          Forza il refresh dei dati da F1api.dev
        </p>

        {[
          { key: 'drivers', label: 'Piloti & Scuderie',  sub: 'Aggiorna classifiche'    },
          { key: 'races',   label: 'Risultati Gare',     sub: 'Aggiorna storico gare'   },
          { key: 'next',    label: 'Prossima Gara',      sub: 'Aggiorna calendario'     },
        ].map(({ key, label, sub }) => (
          <div key={key} style={styles.refreshRow}>
            <div>
              <div style={{ fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#555' }}>{sub}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {refreshStatus[key] && (
                <span style={{ fontSize: 13, color: '#a0a0a0' }}>{refreshStatus[key]}</span>
              )}
              <button
                style={styles.refreshBtn}
                onClick={() => handleRefresh(key, label)}
              >
                Aggiorna
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Nota implementazione */}
      <div className="info-box" style={{ marginTop: 20 }}>
        <strong>🔌 Nota backend:</strong> Tutte le operazioni admin chiamano endpoint{' '}
        <code style={{ fontFamily: 'monospace', color: '#ff8700' }}>/api/admin/*</code>.
        Ricordatevi di proteggere questi endpoint con middleware di autenticazione che verifica il ruolo admin!
      </div>
    </div>
  )
}

const styles = {
  pageTitle:    { fontSize: 22, fontWeight: 900 },
  sectionTitle: { fontSize: 16, fontWeight: 700, marginBottom: 16 },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  },
  field: { marginBottom: 16 },
  selectArrow: {
    position: 'absolute',
    right: 14, top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: '#555',
  },
  actionBtn: {
    background: 'none',
    border: '1px solid #2a2a2a',
    color: '#a0a0a0',
    padding: '5px 12px',
    borderRadius: 5,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 600,
    transition: 'all 0.15s',
  },
  refreshRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
    borderBottom: '1px solid #2a2a2a',
  },
  refreshBtn: {
    background: 'none',
    border: '1px solid rgba(225,6,0,0.4)',
    color: '#e10600',
    padding: '7px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 700,
    transition: 'all 0.15s',
  },
}
