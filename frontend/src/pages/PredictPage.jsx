// src/pages/PredictPage.jsx
//
// Pagina "Previsione" - l'utente sceglie due scuderie e un
// circuito, poi clicca "Calcola" per ottenere le probabilita'.
//
// BACKEND: POST /api/predict

import React, { useState, useEffect } from 'react'
import { predictResult, getTeamStandings } from '../services/api.js'

// Lista circuiti F1 corrente
// BACKEND: questa lista viene da GET /api/circuits
const CIRCUITS = [
  'Bahrain International Circuit',
  'Jeddah Corniche Circuit',
  'Albert Park Circuit',
  'Suzuka International Racing Circuit',
  'Shanghai International Circuit',
  'Miami International Autodrome',
  'Circuit de Monaco',
  'Circuit de Barcelona-Catalunya',
  'Circuit Gilles Villeneuve',
  'Red Bull Ring',
  'Silverstone Circuit',
  'Hungaroring',
  'Circuit de Spa-Francorchamps',
  'Circuit Zandvoort',
  'Autodromo Nazionale Monza',
  'Baku City Circuit',
  'Marina Bay Street Circuit',
  'Circuit of the Americas',
  'Autodromo Hermanos Rodriguez',
  'Autodromo Jose Carlos Pace',
  'Las Vegas Strip Circuit',
  'Lusail International Circuit',
  'Yas Marina Circuit',
]

const CIRCUIT_FACTORS = {
  'Circuit de Monaco': 'Monaco favorisce team con ottima gestione gomme e setup aerodinamico. Fattore imprevedibilita: +15%',
  'Silverstone Circuit': 'Silverstone premia le vetture con alto carico aerodinamico e buona trazione.',
  'Autodromo Nazionale Monza': 'Monza favorisce i team con i motori piu potenti.',
  'Baku City Circuit': 'Baku combina velocita e tecnica con alta imprevedibilita.',
}

export default function PredictPage() {
  const [teams, setTeams] = useState([])
  const [team1, setTeam1] = useState('')
  const [team2, setTeam2] = useState('')
  const [circuit, setCircuit] = useState(CIRCUITS[0])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getTeamStandings().then(t => {
      setTeams(t)
      if (t.length >= 2) {
        setTeam1(t[0].name)
        setTeam2(t[1].name)
      }
    })
  }, [])

  async function handlePredict() {
    if (!team1 || !team2 || team1 === team2) {
      setError('Seleziona due scuderie diverse')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await predictResult(team1, team2, circuit)
      setResult(res)
    } catch {
      setError('Errore nella previsione. Backend connesso?')
    } finally {
      setLoading(false)
    }
  }

  const circuitFactor = CIRCUIT_FACTORS[circuit] || `Circuito ${circuit}: analisi basata sui dati storici.`

  return (
    <div className="page-enter">
      <h1 style={styles.pageTitle}>Previsione Risultato Gara</h1>

      <div style={styles.mainGrid}>
        <div className="card">
          <h3 style={styles.sectionTitle}>Configura Previsione</h3>

          <div style={styles.field}>
            <label className="form-label">Scuderia A</label>
            <div style={{ position: 'relative' }}>
              <select className="input-dark" value={team1} onChange={e => setTeam1(e.target.value)}>
                {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
              <span style={styles.selectArrow}>▾</span>
            </div>
          </div>

          <div style={styles.field}>
            <label className="form-label">Scuderia B</label>
            <div style={{ position: 'relative' }}>
              <select className="input-dark" value={team2} onChange={e => setTeam2(e.target.value)}>
                {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
              <span style={styles.selectArrow}>▾</span>
            </div>
          </div>

          <div style={styles.field}>
            <label className="form-label">Circuito</label>
            <div style={{ position: 'relative' }}>
              <select className="input-dark" value={circuit} onChange={e => setCircuit(e.target.value)}>
                {CIRCUITS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span style={styles.selectArrow}>▾</span>
            </div>
          </div>

          <div style={styles.factorsList}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#555', marginBottom: 10 }}>
              Fattori considerati
            </div>
            {['Forza media scuderia', 'Risultati stagionali', 'Tipo circuito', 'Imprevedibilita gara'].map(f => (
              <div key={f} style={styles.factorItem}>
                <span style={styles.factorDot} />
                <span>{f}</span>
              </div>
            ))}
          </div>

          {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}

          <button className="btn-primary" onClick={handlePredict} disabled={loading}>
            {loading ? 'CALCOLO IN CORSO...' : 'CALCOLA PREVISIONE'}
          </button>
        </div>

        <div className="card">
          <h3 style={styles.sectionTitle}>Risultato Previsione</h3>

          {!result && !loading && (
            <div style={{ color: '#555', textAlign: 'center', padding: '60px 0', fontSize: 14 }}>
              Configura i parametri e clicca "Calcola Previsione"
            </div>
          )}

          {loading && <div className="spinner" />}

          {result && (
            <>
              <div style={{ color: '#a0a0a0', fontSize: 13, marginBottom: 20 }}>
                {team1} vs {team2} • {circuit.split(' ').slice(-2).join(' ')}
              </div>

              <div style={styles.predGrid}>
                <div className="prediction-box" style={{ borderColor: '#3671C6' }}>
                  <div style={{ color: '#3671C6', fontWeight: 700, marginBottom: 4 }}>{team1}</div>
                  <div className="prediction-pct" style={{ color: '#3671C6' }}>{result.win_team1}%</div>
                  <div className="prediction-label">vittoria</div>
                </div>

                <div className="prediction-box" style={{ borderColor: '#ffd700' }}>
                  <div style={{ color: '#ffd700', fontWeight: 700, marginBottom: 4 }}>Evento<br />neutro</div>
                  <div className="prediction-pct" style={{ color: '#ffd700' }}>{result.draw}%</div>
                  <div className="prediction-label">pareggio</div>
                </div>

                <div className="prediction-box" style={{ borderColor: '#e10600' }}>
                  <div style={{ color: '#e10600', fontWeight: 700, marginBottom: 4 }}>{team2}</div>
                  <div className="prediction-pct" style={{ color: '#e10600' }}>{result.win_team2}%</div>
                  <div className="prediction-label">vittoria</div>
                </div>
              </div>

              <div className="prob-bar">
                <div className="prob-bar-a" style={{ flex: result.win_team1 }} />
                <div className="prob-bar-draw" style={{ flex: result.draw }} />
                <div className="prob-bar-b" style={{ flex: result.win_team2 }} />
              </div>

              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <strong>Analisi algoritmo:</strong>
              </div>
              <div style={{ fontSize: 13, color: '#a0a0a0', marginBottom: 4, lineHeight: 1.6 }}>
                {circuitFactor}
              </div>
              {result.circuit_factor && (
                <div style={{ color: '#e10600', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                  {result.circuit_factor}
                </div>
              )}

              <div style={{
                background: '#1a2a1a',
                border: '1px solid #1f4a1f',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 13,
              }}>
                <span>
                  <strong>Affidabilita previsione: </strong>
                  <span style={{ color: '#00d2be' }}>{result.reliability}</span>
                </span>
                <div style={{ width: 28, height: 16, background: '#00d2be', borderRadius: 8 }} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  pageTitle: { fontSize: 22, fontWeight: 900, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 700, marginBottom: 20 },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
  },
  field: { marginBottom: 18 },
  selectArrow: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: '#555',
  },
  factorsList: {
    margin: '20px 0',
    padding: '14px',
    background: '#1a1a1a',
    borderRadius: 8,
  },
  factorItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 13,
    color: '#a0a0a0',
    marginBottom: 8,
  },
  factorDot: {
    width: 8,
    height: 8,
    background: '#e10600',
    borderRadius: 2,
    flexShrink: 0,
  },
  predGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginBottom: 16,
  },
}
