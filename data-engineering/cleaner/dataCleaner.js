// ============================================================
// cleaners/dataCleaner.js — Pulizia dati API → formato DB
//
// Basato sulla struttura JSON REALE di f1api.dev (da /current):
//
// race: {
//   raceId, raceName, round, laps,
//   schedule: { race: { date, time } },
//   circuit:  { circuitId, circuitName, country, city,
//               circuitLength, corners },
//   winner:   { driverId, name, surname, number, shortName } | null,
//   teamWinner: { teamId, teamName, country } | null,
//   fast_lap: { fast_lap, fast_lap_driver_id, fast_lap_team_id }
// }
//
// standings driver: {
//   position, points, driverId,
//   driver: { name, surname, nationality, number, shortName },
//   team:   { teamId, teamName, country }
// }
//
// Colonne DB (F1.sql definitivo):
//   scuderia: nome, nazionalita, punti_totali
//   pilota:   nome, cognome, nazionalita, numero, id_scuderia_FK
//   circuito: nome, paese, lunghezza_tracciato, tipologia
//   gara:     nome_gara_premio, data, id_circuito_FK
//   risultato: posizione_arrivo, punti_ottenuti, giro_veloce,
//              tempo_totale, id_pilota_FK, id_gara_FK
//   pitstop:  numero_stop, tempo_pitstop, id_pilota_FK, id_gara_FK
// ============================================================

// ============================================================
// cleanTeamsFromStandings
// Input: array standings costruttori da /constructors-championship
// Output: array scuderie per il DB
// ============================================================
export function cleanTeamsFromStandings(standings) {
  if (!Array.isArray(standings)) return []
  const cleaned = []

  for (const entry of standings) {
    const team = entry?.team || entry
    const nome = cleanDbString(team?.teamName || team?.name, 30)
    if (!nome) continue

    cleaned.push({
      nome,
      nazionalita:  cleanDbString(team?.country || team?.nationality, 20) || 'N/A',
      punti_totali: parseIntSafe(entry?.points) || 0,
      // indice_potenza NON inserito — gestito dall'admin
    })
  }

  console.log(`   [cleaner] Scuderie da standings: ${cleaned.length}`)
  return cleaned
}

// ============================================================
// cleanDriversFromStandings
// Input: array standings piloti da /drivers-championship
// Output: array piloti per il DB
// ============================================================
export function cleanDriversFromStandings(standings) {
  if (!Array.isArray(standings)) return []
  const cleaned = []

  for (const entry of standings) {
    const driver   = entry?.driver  || entry
    const team     = entry?.team    || {}
    const nome     = cleanDbString(driver?.name, 20)
    const cognome  = cleanDbString(driver?.surname, 30)
    const teamNome = cleanDbString(team?.teamName || team?.name, 30)

    if (!nome || !cognome || !teamNome) {
      console.warn(`   [cleaner] Pilota saltato: ${JSON.stringify(entry).slice(0, 80)}`)
      continue
    }

    cleaned.push({
      nome,
      cognome,
      nazionalita: cleanDbString(driver?.nationality || driver?.country, 20) || 'N/A',
      numero:      parseIntSafe(driver?.number) || 99,
      team_nome:   teamNome,  // usato per lookup id_scuderia_FK
    })
  }

  console.log(`   [cleaner] Piloti da standings: ${cleaned.length}`)
  return cleaned
}

// ============================================================
// cleanRacesFromCurrent
// Input: array races da /current (struttura reale API)
// Output: { circuits: [...], races: [...] }
//
// NOTA: winner e fast_lap sono già nella risposta /current,
// quindi non servono endpoint separati per i risultati!
// ============================================================
export function cleanRacesFromCurrent(rawRaces) {
  if (!Array.isArray(rawRaces)) return { circuits: [], races: [] }

  const circuitsMap = new Map()
  const races       = []

  for (const race of rawRaces) {
    // ---- Dati circuito (da race.circuit) ----
    const circ = race?.circuit || {}
    const circNome = cleanDbString(circ.circuitName, 30)
    if (!circNome) { console.warn(`   [cleaner] Circuito mancante in race ${race.raceId}`); continue }

    if (!circuitsMap.has(circNome)) {
      // circuitLength arriva come stringa tipo "5278km" → togliamo "km" e convertiamo in km
      const lunghezzaMetri = parseFloatSafe(
        String(circ.circuitLength || '0').replace(/[^\d.]/g, '')
      )
      circuitsMap.set(circNome, {
        nome:                circNome,
        paese:               cleanDbString(circ.country, 30) || 'N/A',
        lunghezza_tracciato: lunghezzaMetri ? lunghezzaMetri / 1000 : 0.00,
        tipologia:           inferTipologia(circNome, circ.city),
        // indice_imprevedibilita NON inserito — gestito dall'admin
      })
    }

    // ---- Data gara (da race.schedule.race.date) ----
    const dateRaw  = race?.schedule?.race?.date || null
    const data     = cleanDate(dateRaw)
    const completed = data ? new Date(data) <= new Date() : false

    // ---- Nome gara (max VARCHAR(30)) ----
    const nomeGara = cleanDbString(race.raceName, 30) || `Round ${race.round}`

    // ---- Winner (disponibile direttamente in /current) ----
    const winner     = race?.winner     || null   // { name, surname, number, shortName } | null
    const teamWinner = race?.teamWinner || null   // { teamId, teamName } | null
    const fastLap    = race?.fast_lap?.fast_lap   || null

    races.push({
      // Campi per DB
      nome_gara_premio: nomeGara,
      data,
      circuito_nome:    circNome,
      // Metadati (usati dopo per inserire risultato vincitore)
      round:            parseIntSafe(race.round),
      raceId:           race.raceId,
      completed,
      laps:             parseIntSafe(race.laps),
      winner,
      teamWinner,
      fastLap,
    })
  }

  const circuits = Array.from(circuitsMap.values())
  console.log(`   [cleaner] Circuiti: ${circuits.length}, Gare: ${races.length} (${races.filter(r=>r.completed).length} disputate)`)
  return { circuits, races }
}

// ============================================================
// cleanNextRace
// Input: singolo oggetto race da /current/next
// ============================================================
export function cleanNextRace(rawRace) {
  if (!rawRace) return null
  return {
    nome_gara_premio: cleanDbString(rawRace.raceName, 30) || 'Prossima Gara',
    data:             cleanDate(rawRace?.schedule?.race?.date),
    circuito_nome:    cleanDbString(rawRace?.circuit?.circuitName, 30),
    paese:            cleanDbString(rawRace?.circuit?.country, 30),
    round:            parseIntSafe(rawRace.round),
  }
}

// ============================================================
// buildWinnerResult
// Costruisce un record `risultato` dal winner già disponibile
// in /current — evita la necessità di endpoint separati
// ============================================================
export function buildWinnerResult(race) {
  if (!race.completed || !race.winner || !race.id_gara) return null

  return {
    pilota_nome:      cleanDbString(race.winner.name, 20),
    pilota_cognome:   cleanDbString(race.winner.surname, 30),
    pilota_numero:    parseIntSafe(race.winner.number),
    id_gara:          race.id_gara,
    posizione_arrivo: 1,
    punti_ottenuti:   25,        // il vincitore prende 25 punti
    giro_veloce:      race.fastLap ? 1 : 0,
    tempo_totale:     'winner',  // non disponibile da /current
  }
}

// ---- Utility ----

function cleanString(val) {
  if (val == null) return null
  return String(val).trim().replace(/\s+/g, ' ') || null
}
function cleanDbString(val, maxLen) {
  const cleaned = cleanString(val)
  if (!cleaned) return null
  return maxLen ? cleaned.slice(0, maxLen) : cleaned
}
function parseIntSafe(val) {
  const n = parseInt(val, 10); return isNaN(n) ? null : n
}
function parseFloatSafe(val) {
  const n = parseFloat(val); return isNaN(n) ? null : n
}
function cleanDate(val) {
  if (!val) return null
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  } catch { return null }
}
function inferTipologia(name, city) {
  const n = (name + ' ' + (city || '')).toLowerCase()
  if (n.includes('monaco') || n.includes('baku') || n.includes('jeddah')
      || n.includes('singapore') || n.includes('marina bay') || n.includes('las vegas')
      || n.includes('miami') || n.includes('street') || n.includes('city circuit')) {
    return 'cittadino'
  }
  if (n.includes('albert park') || n.includes('zandvoort')) return 'misto'
  return 'permanente'
}
