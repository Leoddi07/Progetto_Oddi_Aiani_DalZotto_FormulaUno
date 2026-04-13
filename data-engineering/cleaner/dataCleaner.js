// ============================================================
// cleaners/dataCleaner.js
//
// DATA CLEANING — Pulizia e normalizzazione dati grezzi
// Operazioni principali:
//   - Rimozione valori null/undefined
//   - Normalizzazione nomi (trim, capitalize)
//   - Conversione tipi (stringhe → numeri, date ISO)
//   - Deduplicazione scuderie
//   - Validazione dati obbligatori
//   - Mappatura campi API → campi DB
// ============================================================

// ============================================================
// cleanTeams — Pulisce e deduplica le scuderie
// Input:  array piloti grezzi dall'API (ognuno ha info team)
// Output: array scuderie uniche pronte per il DB
// ============================================================
export function cleanTeams(rawDrivers) {
  if (!Array.isArray(rawDrivers)) return []

  const teamsMap = new Map()  // usato per deduplicare

  for (const driver of rawDrivers) {
    // F1api.dev può usare nomi campo diversi — gestiamo varianti comuni
    const teamName = driver?.team?.name
                  || driver?.constructor?.name
                  || driver?.constructorName
                  || driver?.team
                  || null

    const teamNationality = driver?.team?.nationality
                         || driver?.constructor?.nationality
                         || driver?.constructorNationality
                         || null

    // Salta se manca il nome (dato obbligatorio)
    if (!teamName || typeof teamName !== 'string') continue

    // Normalizzazione: trim + rimozione spazi multipli
    const name = teamName.trim().replace(/\s+/g, ' ')

    // Deduplicazione: usiamo il nome come chiave
    if (!teamsMap.has(name)) {
      teamsMap.set(name, {
        nome:        name,
        nazionalita: cleanString(teamNationality) || 'N/A',
        colore:      '#FFFFFF',  // colore default, aggiornato manualmente
      })
    }
  }

  const teams = Array.from(teamsMap.values())
  console.log(`   [cleaner] Scuderie uniche trovate: ${teams.length}`)
  return teams
}

// ============================================================
// cleanDrivers — Pulisce i dati dei piloti
// Input:  array piloti grezzi
// Output: array piloti normalizzati per il DB
// ============================================================
export function cleanDrivers(rawDrivers) {
  if (!Array.isArray(rawDrivers)) return []

  const cleaned = []

  for (const driver of rawDrivers) {
    // Estrazione con fallback su varianti API
    const code      = driver?.code        || driver?.driverCode    || driver?.abbreviation || null
    const firstName = driver?.name        || driver?.givenName     || driver?.firstName    || null
    const lastName  = driver?.surname     || driver?.familyName    || driver?.lastName     || null
    const nat       = driver?.nationality || driver?.driverNationality                     || null
    const number    = driver?.number      || driver?.permanentNumber                       || null
    const teamName  = driver?.team?.name  || driver?.constructor?.name || driver?.constructorName || null

    // Validazione: saltiamo piloti senza dati essenziali
    if (!code || !firstName || !lastName || !teamName) {
      console.warn(`   [cleaner] Pilota saltato (dati incompleti): ${JSON.stringify(driver).slice(0, 80)}`)
      continue
    }

    // Normalizzazione codice: 3 lettere maiuscole
    const cleanCode = cleanString(code)?.toUpperCase().slice(0, 3)
    if (!cleanCode || cleanCode.length !== 3) continue

    cleaned.push({
      codice:       cleanCode,
      nome:         cleanString(firstName),
      cognome:      cleanString(lastName),
      nazionalita:  cleanString(nat) || 'N/A',
      numero:       parseIntSafe(number) || 99,
      team_nome:    cleanString(teamName),  // useremo questo per trovare id_scuderia nel DB
    })
  }

  console.log(`   [cleaner] Piloti validi: ${cleaned.length} / ${rawDrivers.length}`)
  return cleaned
}

// ============================================================
// cleanRaces — Pulisce gare e circuiti
// Input:  array gare grezzo
// Output: { circuits: [...], races: [...] }
// ============================================================
export function cleanRaces(rawRaces) {
  if (!Array.isArray(rawRaces)) return { circuits: [], races: [] }

  const circuitsMap = new Map()
  const races       = []

  for (const race of rawRaces) {
    // Estrazione dati circuito
    const circuitName    = race?.circuit?.name     || race?.circuitName   || null
    const circuitCountry = race?.circuit?.country  || race?.country       || null
    const circuitCity    = race?.circuit?.location || race?.locality      || null
    const circuitLength  = race?.circuit?.length   || null

    // Estrazione dati gara
    const raceName  = race?.raceName  || race?.name   || race?.grandPrix || null
    const round     = race?.round     || race?.roundNumber               || null
    const season    = race?.season    || race?.year   || process.env.F1_SEASON || 2025
    const dateRaw   = race?.date      || race?.raceDate                  || null

    if (!raceName || !round || !circuitName) {
      console.warn(`   [cleaner] Gara saltata: dati incompleti`)
      continue
    }

    // Pulizia data: assicuriamoci sia in formato YYYY-MM-DD
    const date      = cleanDate(dateRaw)
    const completed = date ? new Date(date) <= new Date() : false

    // Deduplicazione circuiti
    const circKey = cleanString(circuitName)
    if (circKey && !circuitsMap.has(circKey)) {
      circuitsMap.set(circKey, {
        nome:          circKey,
        paese:         cleanString(circuitCountry) || 'N/A',
        citta:         cleanString(circuitCity)    || null,
        lunghezza_km:  parseFloatSafe(circuitLength),
        numero_curve:  null,  // non sempre disponibile nell'API
        tipologia:     inferCircuitType(circKey, circuitCity),
      })
    }

    races.push({
      nome_gran_premio: cleanString(raceName),
      numero_gara:      parseIntSafe(round),
      stagione:         parseIntSafe(season) || 2025,
      data:             date,
      circuito_nome:    circKey,  // usato per trovare id_circuito nel DB
      completed,
      round:            parseIntSafe(round),
    })
  }

  const circuits = Array.from(circuitsMap.values())
  console.log(`   [cleaner] Circuiti unici: ${circuits.length}, Gare: ${races.length}`)
  return { circuits, races }
}

// ============================================================
// cleanRaceResults — Pulisce risultati e pit stop di una gara
// Input:  { results: [...], pitStops: [...] }, id_gara
// Output: { results: [...], pitStops: [...] }
// ============================================================
export function cleanRaceResults({ results, pitStops }, id_gara) {
  const cleanedResults = []
  const cleanedPitStops = []

  // --- Risultati ---
  if (Array.isArray(results)) {
    for (const r of results) {
      const driverCode = r?.driver?.code     || r?.driverCode     || r?.code          || null
      const position   = r?.position         || r?.positionNumber || r?.finishPosition || null
      const grid       = r?.grid             || r?.gridPosition                        || null
      const points     = r?.points           || r?.racePoints                          || 0
      const time       = r?.time?.time       || r?.raceTime       || r?.totalRaceTime  || null
      const fastest    = r?.fastestLap?.rank === 1 || r?.fastestLap === true           || false
      const status     = r?.status?.status   || r?.status                              || 'finito'

      if (!driverCode || position === null) continue

      cleanedResults.push({
        driver_code:      cleanString(driverCode)?.toUpperCase().slice(0, 3),
        id_gara,
        posizione_arrivo: parseIntSafe(position),
        posizione_griglia:parseIntSafe(grid),
        punti_ottenuti:   parseFloatSafe(points) || 0,
        giro_veloce:      fastest ? 1 : 0,
        tempo_totale:     cleanString(time),
        stato:            mapStatus(status),
      })
    }
  }

  // --- Pit Stop ---
  if (Array.isArray(pitStops)) {
    for (const ps of pitStops) {
      const driverCode = ps?.driver?.code || ps?.driverCode || ps?.code || null
      const stop       = ps?.stop         || ps?.stopNumber               || 1
      const lap        = ps?.lap          || ps?.lapNumber                || null
      const duration   = ps?.duration     || ps?.pitStopTime             || null

      if (!driverCode || !duration) continue

      const durationSec = parsePitStopTime(duration)
      if (!durationSec) continue

      cleanedPitStops.push({
        driver_code:    cleanString(driverCode)?.toUpperCase().slice(0, 3),
        id_gara,
        numero_stop:    parseIntSafe(stop) || 1,
        giro:           parseIntSafe(lap),
        tempo_pitstop:  durationSec,
      })
    }
  }

  return { results: cleanedResults, pitStops: cleanedPitStops }
}

// ============================================================
// cleanNextRace — Prossima gara
// ============================================================
export function cleanNextRace(rawNext) {
  if (!rawNext) return null
  return {
    name:    cleanString(rawNext?.raceName || rawNext?.name) || 'Prossima Gara',
    date:    cleanDate(rawNext?.date || rawNext?.raceDate),
    circuit: cleanString(rawNext?.circuit?.name || rawNext?.circuitName),
    country: cleanString(rawNext?.circuit?.country || rawNext?.country),
    round:   parseIntSafe(rawNext?.round || rawNext?.roundNumber),
  }
}

// ============================================================
// Funzioni di utilità
// ============================================================

// Pulisce una stringa: trim + rimozione caratteri strani
function cleanString(val) {
  if (val === null || val === undefined) return null
  return String(val).trim().replace(/\s+/g, ' ') || null
}

// Converte in intero, restituisce null se non valido
function parseIntSafe(val) {
  const n = parseInt(val, 10)
  return isNaN(n) ? null : n
}

// Converte in float, restituisce null se non valido
function parseFloatSafe(val) {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

// Normalizza data in formato YYYY-MM-DD
function cleanDate(val) {
  if (!val) return null
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)  // YYYY-MM-DD
  } catch { return null }
}

// Converte stringa tempo pit stop (es. "2.456" o "2:23.456") in secondi decimali
function parsePitStopTime(val) {
  if (!val) return null
  const str = String(val).trim()

  // Formato "2.456" → già in secondi
  if (/^\d+\.\d+$/.test(str)) return parseFloatSafe(str)

  // Formato "1:23.456" → converti in secondi
  const match = str.match(/^(\d+):(\d+)\.(\d+)$/)
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]) + parseFloat(`0.${match[3]}`)
  }

  return parseFloatSafe(str)
}

// Deduce il tipo di circuito dal nome/città
function inferCircuitType(name, city) {
  const n = (name + ' ' + (city || '')).toLowerCase()
  if (n.includes('street') || n.includes('city') || n.includes('cittadino')
      || n.includes('monaco') || n.includes('baku') || n.includes('singapore')
      || n.includes('jeddah') || n.includes('las vegas') || n.includes('miami')) {
    return 'cittadino'
  }
  return 'permanente'
}

// Mappa lo status API al ENUM del DB
function mapStatus(status) {
  if (!status) return 'finito'
  const s = String(status).toLowerCase()
  if (s === 'finished' || s === 'finito' || s === '1') return 'finito'
  if (s.includes('disq') || s.includes('squalif')) return 'squalificato'
  return 'ritirato'  // qualsiasi altro valore = ritiro
}
