// scrapers/f1ApiScraper.js — Raccolta dati da F1api.dev

// ENDPOINT REALI (documentati da f1api.dev):
//
//   GET /api/current/drivers-championship → classifica piloti
//   GET /api/current/constructors-championship → classifica costruttori
//   GET /api/current/drivers             → piloti stagione corrente
//   GET /api/current/teams               → team stagione corrente
//   GET /api/current                     → tutte le gare stagione (con winner)
//   GET /api/current/next                → prossima gara
//   GET /api/{year}/{round}              → singola gara (per dettagli extra)

// ❌ NON ESISTONO:
//   /api/{year}/races
//   /api/{year}/{round}/results
//   /api/{year}/{round}/pitstops
// ============================================================

import fetch from 'node-fetch'

const BASE_URL = process.env.F1_API_BASE || 'https://f1api.dev/api'

// Helper fetch con retry automatico (backoff esponenziale)
async function apiFetch(endpoint, retries = 3) {
  const url = `${BASE_URL}${endpoint}`

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`   [HTTP GET] ${url}`)
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FANalytics/1.0 (school project)',
        },
      })

      // 404 = risorsa non esistente (es. round futuro) — non è un errore da retry
      if (res.status === 404) {
        return null
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      return await res.json()

    } catch (err) {
      console.warn(`   ⚠️  Tentativo ${attempt}/${retries} fallito: ${err.message}`)
      if (attempt === retries) throw err
      await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }
}

// ============================================================
// fetchCurrentSeason — Tutte le gare della stagione corrente
//
// Usa GET /api/current (con paginazione se total > limit)
// Risposta: { total, races: [ { raceId, raceName, round,
//   schedule.race.date, circuit, winner, teamWinner,
//   fast_lap, laps } ] }
// ============================================================
export async function fetchCurrentSeason() {
  // Prima chiamata per sapere il totale
  const first = await apiFetch('/current?limit=30&offset=0')
  if (!first || !Array.isArray(first.races)) {
    throw new Error('Risposta inattesa da /current')
  }

  let races = [...first.races]
  const total = first.total || races.length

  // Paginazione: se ci sono più di 30 gare, fetch pagine successive
  if (total > 30) {
    let offset = 30
    while (offset < total) {
      const page = await apiFetch(`/current?limit=30&offset=${offset}`)
      if (!page?.races?.length) break
      races = races.concat(page.races)
      offset += 30
    }
  }

  console.log(`   → Stagione ${first.season}: ${races.length}/${total} gare`)
  return { season: first.season, races }
}

// ============================================================
// fetchDriversChampionship — Classifica piloti corrente
//
// GET /api/current/drivers-championship
// Risposta: { standings: [ { position, points, driverId,
//   driver: { name, surname, nationality, number, shortName },
//   team: { teamId, teamName } } ] }
// ============================================================
export async function fetchDriversChampionship() {
  const data = await apiFetch('/current/drivers-championship')
  const standings = data?.standings || data?.driverStandings || []
  if (!Array.isArray(standings)) {
    throw new Error('Risposta inattesa da /drivers-championship')
  }
  console.log(`   → Classifica piloti: ${standings.length} entry`)
  return standings
}

// ============================================================
// fetchConstructorsChampionship — Classifica costruttori
//
// GET /api/current/constructors-championship
// Risposta: { standings: [ { position, points,
//   team: { teamId, teamName, country } } ] }
// ============================================================
export async function fetchConstructorsChampionship() {
  const data = await apiFetch('/current/constructors-championship')
  const standings = data?.standings || data?.constructorStandings || []
  if (!Array.isArray(standings)) {
    throw new Error('Risposta inattesa da /constructors-championship')
  }
  console.log(`   → Classifica costruttori: ${standings.length} entry`)
  return standings
}

// ============================================================
// fetchNextRace — Prossima gara
//
// GET /api/current/next
// Risposta: { season, round, race: [ { raceId, raceName,
//   schedule: { race: { date } }, circuit: { ... } } ] }
// ============================================================
export async function fetchNextRace() {
  try {
    const data = await apiFetch('/current/next')
    if (!data) return null
    // L'API restituisce race come array con un elemento
    const race = Array.isArray(data.race) ? data.race[0] : data.race
    return race || null
  } catch {
    console.warn('   ⚠️  Nessuna prossima gara trovata')
    return null
  }
}

// ============================================================
// fetchSingleRace — Singola gara per round
//
// GET /api/{year}/{round}
// Usato per dettagli aggiuntivi non presenti in /current
// Restituisce null se il round non esiste (404)
// ============================================================
export async function fetchSingleRace(year, round) {
  const data = await apiFetch(`/${year}/${round}`)
  if (!data) return null
  const race = Array.isArray(data.race) ? data.race[0] : data.race
  return race || null
}
