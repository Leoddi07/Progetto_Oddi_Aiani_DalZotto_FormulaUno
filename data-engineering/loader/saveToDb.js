// ============================================================
// loaders/saveToDb.js
//
// LOADER — Inserimento dati puliti nel database MySQL
//
// Ogni funzione riceve dati già puliti dal cleaner e li
// inserisce nel DB usando INSERT ... ON DUPLICATE KEY UPDATE
// (upsert: inserisce se non esiste, aggiorna se esiste già)
//
// Questo rende lo script idempotente: si può eseguire più volte
// senza duplicare i dati.
// ============================================================

import mysql from 'mysql2/promise'
import 'dotenv/config'

// Connessione al database (pool condiviso tra tutte le funzioni)
let pool

function getDb() {
  if (!pool) {
    pool = mysql.createPool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     process.env.DB_PORT     || 3306,
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME     || 'fanalytics',
      waitForConnections: true,
      connectionLimit:    5,
    })
  }
  return pool
}

// Chiudi la connessione al termine (chiamato da index.js)
export async function closeDb() {
  if (pool) {
    await pool.end()
    console.log('   [db] Connessione chiusa')
  }
}

// ============================================================
// saveTeams — Inserisce/aggiorna le scuderie
// ============================================================
export async function saveTeams(teams) {
  if (!teams.length) return
  const db = getDb()

  let saved = 0
  for (const team of teams) {
    await db.query(`
      INSERT INTO scuderia (nome, nazionalita, colore)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nazionalita = VALUES(nazionalita)
    `, [team.nome, team.nazionalita, team.colore || '#FFFFFF'])
    saved++
  }
  console.log(`   [db] Scuderie salvate: ${saved}`)
}

// ============================================================
// saveDrivers — Inserisce/aggiorna i piloti
// Nota: usa team_nome per trovare id_scuderia nel DB
// ============================================================
export async function saveDrivers(drivers) {
  if (!drivers.length) return
  const db = getDb()

  let saved = 0, skipped = 0
  for (const driver of drivers) {
    // Trova l'id della scuderia tramite il nome
    const [teams] = await db.query(
      'SELECT id_scuderia FROM scuderia WHERE nome = ?',
      [driver.team_nome]
    )
    if (teams.length === 0) {
      console.warn(`   [db] Scuderia non trovata: "${driver.team_nome}" per ${driver.codice}`)
      skipped++
      continue
    }

    await db.query(`
      INSERT INTO pilota (codice, nome, cognome, nazionalita, numero, id_scuderia)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nome        = VALUES(nome),
        cognome     = VALUES(cognome),
        nazionalita = VALUES(nazionalita),
        numero      = VALUES(numero),
        id_scuderia = VALUES(id_scuderia)
    `, [
      driver.codice, driver.nome, driver.cognome,
      driver.nazionalita, driver.numero, teams[0].id_scuderia
    ])
    saved++
  }
  console.log(`   [db] Piloti salvati: ${saved}, saltati: ${skipped}`)
}

// ============================================================
// saveCircuits — Inserisce/aggiorna i circuiti
// ============================================================
export async function saveCircuits(circuits) {
  if (!circuits.length) return
  const db = getDb()

  let saved = 0
  for (const c of circuits) {
    await db.query(`
      INSERT INTO circuito (nome, paese, citta, lunghezza_km, numero_curve, tipologia)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        paese      = VALUES(paese),
        citta      = VALUES(citta),
        lunghezza_km = VALUES(lunghezza_km),
        tipologia  = VALUES(tipologia)
    `, [c.nome, c.paese, c.citta, c.lunghezza_km, c.numero_curve, c.tipologia])
    saved++
  }
  console.log(`   [db] Circuiti salvati: ${saved}`)
}

// ============================================================
// saveRaces — Inserisce/aggiorna le gare
// Restituisce le gare con id_gara aggiunto (serve per i risultati)
// ============================================================
export async function saveRaces(races) {
  if (!races.length) return []
  const db = getDb()

  let saved = 0, skipped = 0
  for (const race of races) {
    // Trova id_circuito dal nome
    const [circuits] = await db.query(
      'SELECT id_circuito FROM circuito WHERE nome = ?',
      [race.circuito_nome]
    )
    if (circuits.length === 0) {
      console.warn(`   [db] Circuito non trovato: "${race.circuito_nome}"`)
      skipped++
      continue
    }

    await db.query(`
      INSERT INTO gara (nome_gran_premio, numero_gara, stagione, data, id_circuito)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nome_gran_premio = VALUES(nome_gran_premio),
        data             = VALUES(data)
    `, [
      race.nome_gran_premio, race.numero_gara,
      race.stagione, race.data, circuits[0].id_circuito
    ])

    // Aggiungi id_gara all'oggetto (per usarlo nei risultati)
    const [inserted] = await db.query(
      'SELECT id_gara FROM gara WHERE numero_gara = ? AND stagione = ?',
      [race.numero_gara, race.stagione]
    )
    if (inserted.length) race.id_gara = inserted[0].id_gara
    saved++
  }
  console.log(`   [db] Gare salvate: ${saved}, saltate: ${skipped}`)
  return races
}

// ============================================================
// saveRaceResults — Inserisce risultati e pit stop di una gara
// ============================================================
export async function saveRaceResults({ results, pitStops }) {
  const db = getDb()
  let savedRes = 0, savedPit = 0

  // --- Risultati ---
  for (const r of results) {
    // Trova id_pilota dal codice
    const [pilots] = await db.query(
      'SELECT id_pilota FROM pilota WHERE codice = ?',
      [r.driver_code]
    )
    if (pilots.length === 0) continue

    await db.query(`
      INSERT INTO risultato
        (id_pilota, id_gara, posizione_arrivo, posizione_griglia,
         punti_ottenuti, giro_veloce, tempo_totale, stato)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        posizione_arrivo  = VALUES(posizione_arrivo),
        punti_ottenuti    = VALUES(punti_ottenuti),
        giro_veloce       = VALUES(giro_veloce),
        tempo_totale      = VALUES(tempo_totale),
        stato             = VALUES(stato)
    `, [
      pilots[0].id_pilota, r.id_gara, r.posizione_arrivo, r.posizione_griglia,
      r.punti_ottenuti, r.giro_veloce, r.tempo_totale, r.stato
    ])
    savedRes++
  }

  // --- Pit Stop ---
  for (const ps of pitStops) {
    const [pilots] = await db.query(
      'SELECT id_pilota FROM pilota WHERE codice = ?',
      [ps.driver_code]
    )
    if (pilots.length === 0) continue

    await db.query(`
      INSERT INTO pitstop (id_pilota, id_gara, numero_stop, giro, tempo_pitstop)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        tempo_pitstop = VALUES(tempo_pitstop)
    `, [
      pilots[0].id_pilota, ps.id_gara, ps.numero_stop, ps.giro, ps.tempo_pitstop
    ])
    savedPit++
  }

  if (savedRes > 0 || savedPit > 0) {
    console.log(`     [db] Risultati: ${savedRes}, Pit stop: ${savedPit}`)
  }
}
