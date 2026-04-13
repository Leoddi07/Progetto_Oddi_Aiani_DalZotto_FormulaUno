// src/pages/RacesPage.jsx
//
// Pagina "Gare" — mostra il calendario gare, i risultati
// del GP selezionato, i tempi pit stop medi e statistiche.
//
//     BACKEND: getRaces(), getRaceResults(id), getPitStopStats()
//    Tutti gli endpoint sono in src/services/api.js


import React, { useState, useEffect } from 'react'
import { getRaces, getRaceResults, getPitStopStats } from '../services/api.js'

// Formatta data breve per il calendario
function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

// Componente dettaglio gara selezionata (box in cima)
function RaceDetail({ race, results }) {
  if (!race) return null
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 16 }}>
        {race.name} — Dettaglio Gara
      </h3>

      {/* Colonne informazioni gara */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Vincitore', value: results[0]?.driverName || race.winner },
          { label: 'Team',      value: results[0]?.team || race.winnerTeam },
          { label: 'Giri totali', value: '—' },  
          { label: 'Distanza',    value: '—' },   
          { label: 'Giro veloce', value: race.fastestLap },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Podio */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, background: '#242424', borderRadius: 8, padding: '14px 20px' }}>
        {results.slice(0, 3).map((r, i) => (
          <div key={r.pos} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <span style={{ fontSize: 18 }}>{['🥇','🥈','🥉'][i]}</span>
            <span>{r.driverName} — {r.time}</span>
          </div>
        ))}
        {/* Placeholder se non ci sono risultati reali */}
        {results.length === 0 && (
          <div style={{ color: '#555', fontSize: 13, gridColumn: '1/-1' }}>
            Risultati non disponibili — collegare il backend
          </div>
        )}
      </div>
    </div>
  )
}

export default function RacesPage() {
  const [races, setRaces]         = useState([])
  const [selected, setSelected]   = useState(null) // gara selezionata
  const [results, setResults]     = useState([])
  const [pitStops, setPitStops]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [loadingRes, setLoadingRes] = useState(false)
  const [error, setError]         = useState('')

  // Carica elenco gare e pit stop al montaggio
  useEffect(() => {
    async function load() {
      try {
        const [r, p] = await Promise.all([getRaces(), getPitStopStats()])
        setRaces(r)
        setPitStops(p)
        // Seleziona automaticamente la prima gara
        if (r.length > 0) {
          setSelected(r[0])
          loadResults(r[0].id)
        }
      } catch (e) {
        setError('Errore caricamento gare')
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Carica risultati di una gara specifica
  async function loadResults(raceId) {
    setLoadingRes(true)
    try {
      const res = await getRaceResults(raceId)
      setResults(res)
    } catch { setResults([]) }
    finally { setLoadingRes(false) }
  }

  // Quando l'utente clicca su una riga del calendario
  function handleSelectRace(race) {
    setSelected(race)
    loadResults(race.id)
  }

  // Massimo tempo pit stop (per le barre proporzionali)
  const maxPit = Math.max(...pitStops.map(p => p.avgTime), 1)

  if (loading) return <div className="spinner" />

  return (
    <div className="page-enter">
      <h1 style={styles.pageTitle}>Analisi Gare — Stagione 2025</h1>
      {error && <div className="error-msg">{error}</div>}

      {/* Dettaglio gara selezionata */}
      {selected && (
        loadingRes
          ? <div className="spinner" />
          : <RaceDetail race={selected} results={results} />
      )}

      {/* Calendario gare */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={styles.sectionTitle}>Calendario & Risultati 2025</h3>

        {/* Header colonne */}
        <div style={{ ...styles.tableHeader }}>
          <span>Gran Premio</span>
          <span>Data</span>
          <span>Vincitore</span>
          <span>Team</span>
          <span>Giro Veloce</span>
          <span>Pit Stop</span>
        </div>

        {races.map(race => (
          <div
            key={race.id}
            className={`gp-row ${selected?.id === race.id ? 'selected' : ''}`}
            onClick={() => handleSelectRace(race)}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{race.name}</div>
              <div style={{ color: '#555', fontSize: 12 }}>{fmtDate(race.date)}</div>
            </div>
            <div style={{ color: '#a0a0a0', fontSize: 13 }}>{fmtDate(race.date)}</div>
            <div style={{ fontWeight: 600 }}>{race.winner}</div>
            <div style={{ color: '#a0a0a0', fontSize: 13 }}>{race.winnerTeam}</div>
            <div className="laptime">{race.fastestLap}</div>
            <div><span className="pitstop-badge">{race.avgPitStop}s</span></div>
          </div>
        ))}

        {races.length === 0 && (
          <div style={{ padding: 24, color: '#555', textAlign: 'center' }}>
            Nessuna gara trovata — verificare la connessione al backend
          </div>
        )}
      </div>

      {/* Grid inferiore: pit stop + statistiche */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Tempi Pit Stop Medi */}
        <div className="card">
          <h3 style={styles.sectionTitle}>Tempi Pit Stop Medi — Top Teams</h3>
          {pitStops.map(p => (
            <div key={p.team} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>{p.team}</span>
                <span style={{ color: '#00d2be', fontFamily: 'monospace' }}>{p.avgTime}s</span>
              </div>
              <div style={{ height: 8, background: '#2a2a2a', borderRadius: 4, overflow: 'hidden' }}>
                {/* Barra inversa: pit stop più corto = barra più lunga */}
                <div style={{
                  height: '100%',
                  background: '#00d2be',
                  borderRadius: 4,
                  width: `${(1 - (p.avgTime - 2) / (maxPit - 2 + 0.1)) * 100}%`,
                  transition: 'width 0.8s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Statistiche stagione */}
        <div className="card">
          <h3 style={styles.sectionTitle}>Statistiche Stagione 2025</h3>
          {/* BACKEND: questi dati vengono da /api/races/stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { label: 'Gare completate',  value: `${races.length}/24` },
              { label: 'Safety Car totali', value: '4' }, 
              { label: 'Ritiri totali',     value: '18' }, 
              { label: 'Giro Veloce rec.', value: races[0]?.fastestLap || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 32, fontWeight: 900 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

const styles = {
  pageTitle: { fontSize: 22, fontWeight: 900, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 700, marginBottom: 16 },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1fr 1fr',
    padding: '8px 16px',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#555',
    borderBottom: '1px solid #2a2a2a',
    marginBottom: 4,
  },
}
