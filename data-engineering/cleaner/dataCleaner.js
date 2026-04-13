// ============================================================
// cleaners/dataCleaner.js — Pulizia e normalizzazione dati API
//
// Mappa i campi dell'API F1api.dev → nomi colonne del DB F1.sql:
//
//   scuderia:  nome, nazionalità_s, punti_totali
//              (indice_potenza NON toccato — solo admin)
//   pilota:    nome, cognome, nazionalità, numero, id_scuderia_FK
//   circuito:  nome, paese, lunghezza_tracciato, tipologia
//              (indice_imprevedibilità NON toccato — solo admin)
//   gara:      nome_gara_premio, data, id_circuito_FK
//   risultato: posizione_arrivo, punti_ottenuti, giro_veloce,
//              tempo_totale, id_pilota_FK, id_gara_FK
//   pitstop:   numero_stop, tempo_pitstop, id_pilota_FK, id_gara_FK
// ============================================================

// ---- cleanTeams ----
export function cleanTeams(rawDrivers) {
  if (!Array.isArray(rawDrivers)) return []
  const teamsMap = new Map()

  for (const driver of rawDrivers) {
    const teamName = driver?.team?.name || driver?.constructor?.name
                  || driver?.constructorName || driver?.team || null
    const teamNat  = driver?.team?.nationality || driver?.constructor?.nationality
                  || driver?.constructorNationality || null

    if (!teamName || typeof teamName !== 'string') continue
    const name = teamName.trim().replace(/\s+/g, ' ')

    if (!teamsMap.has(name)) {
      teamsMap.set(name, {
        nome:        name,
        nazionalita: cleanString(teamNat) || 'N/A',
        punti_totali: 0,
        // indice_potenza NON inserito — gestito dall'admin
      })
    }
  }

  const teams = Array.from(teamsMap.values())
  console.log(`   [cleaner] Scuderie: ${teams.length}`)
  return teams
}

// ---- cleanDrivers ----
export function cleanDrivers(rawDrivers) {
  if (!Array.isArray(rawDrivers)) return []
  const cleaned = []

  for (const driver of rawDrivers) {
    const firstName = driver?.name     || driver?.givenName  || driver?.firstName || null
    const lastName  = driver?.surname  || driver?.familyName || driver?.lastName  || null
    const nat       = driver?.nationality || driver?.driverNationality            || null
    const number    = driver?.number   || driver?.permanentNumber                 || null
    const teamName  = driver?.team?.name || driver?.constructor?.name
                   || driver?.constructorName                                     || null

    if (!firstName || !lastName || !teamName) {
      console.warn(`   [cleaner] Pilota saltato: ${JSON.stringify(driver).slice(0, 60)}`)
      continue
    }

    cleaned.push({
      nome:       cleanString(firstName),
      cognome:    cleanString(lastName),
      nazionalita: cleanString(nat) || 'N/A',
      numero:     parseIntSafe(number) || 99,
      team_nome:  cleanString(teamName),  // per lookup id_scuderia_FK in saveToDb
    })
  }

  console.log(`   [cleaner] Piloti: ${cleaned.length}/${rawDrivers.length}`)
  return cleaned
}

// ---- cleanRaces ----
export function cleanRaces(rawRaces) {
  if (!Array.isArray(rawRaces)) return { circuits: [], races: [] }

  const circuitsMap = new Map()
  const races       = []

  for (const race of rawRaces) {
    const circuitName    = race?.circuit?.name    || race?.circuitName || null
    const circuitCountry = race?.circuit?.country || race?.country     || null
    const circuitLength  = race?.circuit?.length  || null
    const raceName       = race?.raceName || race?.name || race?.grandPrix || null
    const dateRaw        = race?.date     || race?.raceDate              || null
    const round          = race?.round    || race?.roundNumber           || null

    if (!raceName || !circuitName) { console.warn('   [cleaner] Gara saltata'); continue }

    const date      = cleanDate(dateRaw)
    const completed = date ? new Date(date) <= new Date() : false
    const circKey   = cleanString(circuitName)

    if (circKey && !circuitsMap.has(circKey)) {
      circuitsMap.set(circKey, {
        nome:                circKey,
        paese:               cleanString(circuitCountry) || 'N/A',
        lunghezza_tracciato: parseFloatSafe(circuitLength) || 0.00,
        tipologia:           inferTipologia(circKey),
        // indice_imprevedibilita NON inserito — gestito dall'admin
      })
    }

    races.push({
      nome_gara_premio: cleanString(raceName)?.slice(0, 30),
      data:             date,
      circuito_nome:    circKey,
      completed,
      round:            parseIntSafe(round),
    })
  }

  const circuits = Array.from(circuitsMap.values())
  console.log(`   [cleaner] Circuiti: ${circuits.length}, Gare: ${races.length}`)
  return { circuits, races }
}

// ---- cleanRaceResults ----
export function cleanRaceResults({ results, pitStops }, id_gara) {
  const cleanedResults  = []
  const cleanedPitStops = []

  if (Array.isArray(results)) {
    for (const r of results) {
      const firstName = r?.driver?.name    || r?.givenName   || null
      const lastName  = r?.driver?.surname || r?.familyName  || null
      const number    = r?.driver?.number  || r?.permanentNumber || null
      const position  = r?.position        || r?.finishPosition || null
      const points    = r?.points          || r?.racePoints  || 0
      const time      = r?.time?.time      || r?.totalRaceTime  || null
      const fastest   = r?.fastestLap?.rank === 1 || r?.fastestLap === true || false

      if (position === null) continue

      cleanedResults.push({
        pilota_nome:      cleanString(firstName),
        pilota_cognome:   cleanString(lastName),
        pilota_numero:    parseIntSafe(number),
        id_gara,
        posizione_arrivo: parseIntSafe(position),
        punti_ottenuti:   Math.round(parseFloatSafe(points) || 0),
        giro_veloce:      fastest ? 1 : 0,
        tempo_totale:     (cleanString(time) || 'N/A').slice(0, 15),
      })
    }
  }

  if (Array.isArray(pitStops)) {
    for (const ps of pitStops) {
      const firstName = ps?.driver?.name    || ps?.givenName  || null
      const lastName  = ps?.driver?.surname || ps?.familyName || null
      const number    = ps?.driver?.number  || ps?.permanentNumber || null
      const stop      = ps?.stop            || ps?.stopNumber  || 1
      const duration  = ps?.duration        || ps?.pitStopTime || null

      if (!duration) continue
      const sec = parsePitStopTime(duration)
      if (!sec) continue

      cleanedPitStops.push({
        pilota_nome:    cleanString(firstName),
        pilota_cognome: cleanString(lastName),
        pilota_numero:  parseIntSafe(number),
        id_gara,
        numero_stop:    parseIntSafe(stop) || 1,
        tempo_pitstop:  sec,
      })
    }
  }

  return { results: cleanedResults, pitStops: cleanedPitStops }
}

// ---- cleanNextRace ----
export function cleanNextRace(rawNext) {
  if (!rawNext) return null
  return {
    nome_gara_premio: (cleanString(rawNext?.raceName || rawNext?.name) || 'Prossima Gara').slice(0, 30),
    data:             cleanDate(rawNext?.date || rawNext?.raceDate),
    circuito_nome:    cleanString(rawNext?.circuit?.name || rawNext?.circuitName),
    paese:            cleanString(rawNext?.circuit?.country || rawNext?.country),
    round:            parseIntSafe(rawNext?.round || rawNext?.roundNumber),
  }
}

// ---- Utility ----
function cleanString(val) {
  if (val == null) return null
  return String(val).trim().replace(/\s+/g, ' ') || null
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
function parsePitStopTime(val) {
  if (!val) return null
  const str = String(val).trim()
  if (/^\d+\.\d+$/.test(str)) return parseFloatSafe(str)
  const match = str.match(/^(\d+):(\d+)\.(\d+)$/)
  if (match) return parseInt(match[1]) * 60 + parseInt(match[2]) + parseFloat(`0.${match[3]}`)
  return parseFloatSafe(str)
}
function inferTipologia(name) {
  const n = name.toLowerCase()
  if (n.includes('monaco') || n.includes('baku') || n.includes('jeddah')
      || n.includes('singapore') || n.includes('street') || n.includes('vegas')
      || n.includes('miami') || n.includes('city')) return 'cittadino'
  if (n.includes('albert park') || n.includes('zandvoort')) return 'misto'
  return 'permanente'
}