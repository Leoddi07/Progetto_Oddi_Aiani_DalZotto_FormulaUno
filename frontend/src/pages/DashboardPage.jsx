// src/pages/DashboardPage.jsx
//
// Dashboard principale - prima pagina dopo il login.

import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { getDriverStandings, getTeamStandings, getNextRace, getRaces } from '../services/api.js'

const CURRENT_SEASON = new Date().getFullYear()

const TEAM_COLORS = {
  McLaren: '#FF8000',
  Ferrari: '#E8002D',
  'Red Bull Racing': '#3671C6',
  Mercedes: '#27F4D2',
  Williams: '#64C4FF',
  'Aston Martin': '#229971',
  Alpine: '#FF87BC',
  Haas: '#B6BABD',
  'Kick Sauber': '#52E252',
  RB: '#6692FF',
}

function teamColor(name) {
  return TEAM_COLORS[name] || '#e10600'
}

function daysUntil(dateStr) {
  const d = new Date(dateStr) - new Date()
  return Math.max(0, Math.ceil(d / 86400000))
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [drivers, setDrivers] = useState([])
  const [teams, setTeams] = useState([])
  const [nextRace, setNextRace] = useState(null)
  const [lastRace, setLastRace] = useState(null)
  const [completedRaceCount, setCompletedRaceCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState('Caricamento...')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [drv, tms, nxt, races] = await Promise.all([
          getDriverStandings(),
          getTeamStandings(),
          getNextRace(),
          getRaces(),
        ])
        setDrivers(drv)
        setTeams(tms)
        setNextRace(nxt)
        setCompletedRaceCount(races.length)
        setLastRace(races[races.length - 1] || null)
        setLastUpdate('Adesso')
      } catch (e) {
        setError('Errore nel caricamento dati. Backend connesso?')
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  async function handleRefresh() {
    setLastUpdate('Aggiornamento...')
    try {
      const [drv, tms, nxt, races] = await Promise.all([
        getDriverStandings(),
        getTeamStandings(),
        getNextRace(),
        getRaces(),
      ])
      setDrivers(drv)
      setTeams(tms)
      setNextRace(nxt)
      setCompletedRaceCount(races.length)
      setLastRace(races[races.length - 1] || null)
      setLastUpdate('Adesso')
    } catch {
      setLastUpdate('Errore aggiornamento')
    }
  }

  const leader = drivers[0]
  const maxTeamPts = Math.max(...teams.map(t => t.points), 1)

  if (loading) {
    return (
      <div className="page-enter">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h1 style={styles.pageTitle}>Dashboard - Panoramica Stagione {CURRENT_SEASON}</h1>
        </div>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={styles.pageTitle}>Dashboard - Panoramica Stagione {CURRENT_SEASON}</h1>
        <div style={{ textAlign: 'right' }}>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '8px 18px', fontSize: 12 }}
            onClick={handleRefresh}
          >
            AGGIORNA DATI
          </button>
          <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
            Ultimo aggiornamento: {lastUpdate}
          </div>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div style={styles.statGrid}>
        <div className="stat-card">
          <div className="stat-label">Piloti in gara</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {drivers.length}
            <span className="dot dot-green pulse" />
          </div>
          <div className="stat-sub">stagione</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Gare completate</div>
          <div className="stat-value">{completedRaceCount} <span style={{ fontSize: 20, color: '#555' }}>/ 24</span></div>
          <div className="stat-sub">{CURRENT_SEASON}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Punti leader</div>
          <div className="stat-value">{leader ? `${leader.points} pts` : '-'}</div>
          <div className="stat-sub">{leader ? `${leader.firstname} ${leader.lastname}` : '-'}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Prossima gara</div>
          <div className="stat-value" style={{ fontSize: 22, lineHeight: 1.2 }}>
            {nextRace ? nextRace.name : '-'}
            <span className="dot dot-orange" style={{ marginLeft: 10 }} />
          </div>
          <div className="stat-sub">
            {nextRace ? formatDate(nextRace.date) : ''}
          </div>
        </div>
      </div>

      <div style={styles.mainGrid}>
        <div className="card">
          <h3 style={styles.sectionTitle}>Classifica Piloti</h3>
          <table className="standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Pilota</th>
                <th>Team</th>
                <th>Pts</th>
                <th>Gap</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d, i) => (
                <tr key={d.id} className={i === 0 ? 'active-row' : ''}>
                  <td>
                    <span className={`pos-badge ${i < 3 ? `pos-${i + 1}` : 'pos-n'}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {d.code} - {d.firstname[0]}. {d.lastname}
                  </td>
                  <td style={{ color: '#a0a0a0', fontSize: 13 }}>{d.team}</td>
                  <td style={{ fontWeight: 700 }}>{d.points}</td>
                  <td style={{ color: i === 0 ? '#00d2be' : '#a0a0a0', fontSize: 13 }}>
                    {i === 0 ? '+0' : `-${leader.points - d.points}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={styles.sectionTitle}>Punti Costruttori</h3>
          {teams.slice().sort((a, b) => b.points - a.points).map(team => (
            <div key={team.id} className="constructor-bar-wrap">
              <div className="constructor-bar-label">
                <span style={{ fontWeight: 600, fontSize: 14 }}>{team.name}</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{team.points}</span>
              </div>
              <div className="constructor-bar-track">
                <div
                  className="constructor-bar-fill"
                  style={{
                    width: `${(team.points / maxTeamPts) * 100}%`,
                    background: teamColor(team.name),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.bottomGrid}>
        <div className="card">
          <div style={{ color: '#a0a0a0', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Prossima Gara
          </div>
          {nextRace ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>{nextRace.name}</div>
                <div style={{ color: '#a0a0a0', fontSize: 13 }}>Circuito: {nextRace.circuit}</div>
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  <span style={{ color: '#e10600', fontWeight: 700 }}>{formatDate(nextRace.date)}</span>
                  <span style={{ color: '#a0a0a0' }}> • Mancano {daysUntil(nextRace.date)} giorni</span>
                </div>
              </div>
              <div style={{
                width: 56,
                height: 56,
                background: '#2a2a2a',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: '#555',
              }}>
                {nextRace.country || 'GP'}
              </div>
            </div>
          ) : (
            <div style={{ color: '#555' }}>Nessuna gara programmata</div>
          )}
        </div>

        <div className="card">
          {lastRace ? (
            <>
              <div style={{ color: '#a0a0a0', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Ultimo GP - {lastRace.name}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                1° {lastRace.winner}   2° -   3° -
              </div>
              <div style={{ fontSize: 13, color: '#a0a0a0' }}>
                Giro veloce: <span className="laptime">{lastRace.fastestLap}</span>
              </div>
              <div style={{ fontSize: 13, color: '#a0a0a0', marginTop: 4 }}>
                Pit stop più veloce: <span className="pitstop-badge">{lastRace.avgPitStop}s</span>
              </div>
            </>
          ) : (
            <div style={{ color: '#555' }}>Nessuna gara disputata</div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  pageTitle: {
    fontSize: 22,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: -0.3,
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 20,
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    marginBottom: 20,
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 16,
    color: '#fff',
  },
}
