// SCRAPER — Raccolta dati da F1api.dev
// Ogni funzione:
//   1. Fa la richiesta HTTP all'API
//   2. Controlla che la risposta sia OK
//   3. Restituisce il JSON grezzo (la pulizia è in dataCleaner.js)

import fetch from 'node-fetch'

const BASE_URL = process.env.F1_API_BASE || 'https://f1api.dev/api'

// Helper: fetch con gestione errori e retry automatico
async function apiFetch(endpoint, retries = 3) {
  const url = `${BASE_URL}${endpoint}`

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`   [HTTP GET] ${url} (tentativo ${attempt}/${retries})`)
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FANalytics/1.0 (school project)',
        },
        timeout: 10000,  // 10 secondi di timeout
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()
      return data

    } catch (err) {
      console.warn(`   ⚠️  Tentativo ${attempt} fallito: ${err.message}`)
      if (attempt === retries) throw err
      // Aspetta prima di riprovare (backoff esponenziale)
      await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }
}

// ============================================================
// fetchDriversAndTeams — Piloti e scuderie della stagione
// ============================================================
export async function fetchDriversAndTeams(season) {
  // F1api.dev restituisce un oggetto con array "drivers"
  // Ogni driver include già info sulla sua scuderia
  const data = await apiFetch(`/${season}/drivers`)

  // L'API potrebbe restituire { drivers: [...] } o direttamente [...]
  // Gestiamo entrambi i casi
  const drivers = data?.drivers || data?.data || data
  if (!Array.isArray(drivers)) {
    throw new Error(`Risposta inattesa da /drivers: ${JSON.stringify(data).slice(0, 100)}`)
  }

  console.log(`   → Ricevuti ${drivers.length} piloti dall'API`)
  return drivers
}

// ============================================================
// fetchRaces — Calendario gare della stagione
// ============================================================
export async function fetchRaces(season) {
  const data = await apiFetch(`/${season}/races`)

  const races = data?.races || data?.data || data
  if (!Array.isArray(races)) {
    throw new Error(`Risposta inattesa da /races: ${JSON.stringify(data).slice(0, 100)}`)
  }

  console.log(`   → Ricevute ${races.length} gare dall'API`)
  return races
}

// ============================================================
// fetchRaceResults — Risultati di una gara specifica
// Restituisce classifica piloti + pit stop
// ============================================================
export async function fetchRaceResults(season, round) {
  // Risultati classifica
  const resultsData  = await apiFetch(`/${season}/${round}/results`)
  const results      = resultsData?.results || resultsData?.data || resultsData

  // Pit stop (endpoint separato)
  let pitStops = []
  try {
    const pitData = await apiFetch(`/${season}/${round}/pitstops`)
    pitStops = pitData?.pitstops || pitData?.data || pitData || []
  } catch {
    // I pit stop potrebbero non essere disponibili per tutte le gare
    console.warn('   ⚠️  Pit stop non disponibili per questo round')
  }

  return { results, pitStops }
}

// ============================================================
// fetchNextRace — Prossima gara in calendario
// ============================================================
export async function fetchNextRace(season) {
  try {
    const data = await apiFetch(`/current/next`)
    return data?.race || data?.data || data
  } catch {
    // Se non c'è una prossima gara, l'API potrebbe restituire 404
    console.warn('   ⚠️  Nessuna prossima gara trovata')
    return null
  }
}
