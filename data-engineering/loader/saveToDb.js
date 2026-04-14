// ============================================================
// loaders/saveToDb.js — Inserimento dati nel DB
//
// Nomi colonne DB (F1.sql definitivo):
//   scuderia: nome, nazionalita, punti_totali
//   pilota:   nome, cognome, nazionalita, numero, id_scuderia_FK
//   circuito: nome, paese, lunghezza_tracciato, tipologia
//   gara:     nome_gara_premio, data, id_circuito_FK
//   risultato: posizione_arrivo, punti_ottenuti, giro_veloce,
//              tempo_totale, id_pilota_FK, id_gara_FK
//   pitstop:  numero_stop, tempo_pitstop, id_pilota_FK, id_gara_FK
//   utente:   id_utente, username, email, password, ruolo
// ============================================================

import mysql  from 'mysql2/promise'
import bcrypt from 'bcrypt'
import 'dotenv/config'

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
      connectionLimit: 5,
    })
  }
  return pool
}

export async function closeDb() {
  if (pool) { await pool.end(); console.log('   [db] Connessione chiusa') }
}

// ============================================================
// ensureAdminUser
// Garantisce che esista sempre un utente admin/admin nel DB.
// Viene chiamato ad ogni run della pipeline.
// ============================================================
export async function ensureAdminUser() {
  const db = getDb()
  const ADMIN_USER = 'admin'
  const ADMIN_PASS = 'admin'

  const [rows] = await db.query(
    'SELECT id_utente FROM utente WHERE username = ?',
    [ADMIN_USER]
  )

  if (rows.length === 0) {
    // Crea l'utente admin se non esiste
    const hash = await bcrypt.hash(ADMIN_PASS, 10)
    await db.query(
      'INSERT INTO utente (username, email, password, ruolo) VALUES (?, ?, ?, ?)',
      [ADMIN_USER, 'admin@fanalytics.it', hash, 'admin']
    )
    console.log('   [db] ✅ Utente admin creato (admin/admin)')
  } else {
    // Aggiorna la password ogni volta per garantire che sia sempre "admin"
    // (utile se qualcuno la cambia accidentalmente)
    const hash = await bcrypt.hash(ADMIN_PASS, 10)
    await db.query(
      'UPDATE utente SET password = ?, ruolo = ? WHERE username = ?',
      [hash, 'admin', ADMIN_USER]
    )
    console.log('   [db] ✅ Utente admin verificato (admin/admin)')
  }
}

// ============================================================
// saveTeams — NON tocca indice_potenza (solo admin)
// ============================================================
export async function saveTeams(teams) {
  if (!teams.length) return
  const db = getDb()
  let saved = 0

  for (const team of teams) {
    await db.query(`
      INSERT INTO scuderia (nome, nazionalita, punti_totali)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nazionalita   = VALUES(nazionalita),
        punti_totali  = VALUES(punti_totali)
    `, [team.nome, team.nazionalita, team.punti_totali || 0])
    saved++
  }
  console.log(`   [db] Scuderie: ${saved}`)
}

// ============================================================
// saveDrivers
// ============================================================
export async function saveDrivers(drivers) {
  if (!drivers.length) return
  const db = getDb()
  let saved = 0, skipped = 0

  for (const driver of drivers) {
    const [teams] = await db.query(
      'SELECT id_scuderia FROM scuderia WHERE nome = ?',
      [driver.team_nome]
    )
    if (!teams.length) {
      console.warn(`   [db] Scuderia non trovata: "${driver.team_nome}"`)
      skipped++
      continue
    }

    await db.query(`
      INSERT INTO pilota (nome, cognome, nazionalita, numero, id_scuderia_FK)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nome           = VALUES(nome),
        cognome        = VALUES(cognome),
        nazionalita    = VALUES(nazionalita),
        numero         = VALUES(numero),
        id_scuderia_FK = VALUES(id_scuderia_FK)
    `, [driver.nome, driver.cognome, driver.nazionalita, driver.numero, teams[0].id_scuderia])
    saved++
  }
  console.log(`   [db] Piloti: ${saved} OK, ${skipped} saltati`)
}

// ============================================================
// saveCircuits — NON tocca indice_imprevedibilita (solo admin)
// ============================================================
export async function saveCircuits(circuits) {
  if (!circuits.length) return
  const db = getDb()
  let saved = 0

  for (const c of circuits) {
    await db.query(`
      INSERT INTO circuito (nome, paese, lunghezza_tracciato, tipologia)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        paese               = VALUES(paese),
        lunghezza_tracciato = VALUES(lunghezza_tracciato),
        tipologia           = VALUES(tipologia)
    `, [c.nome, c.paese, c.lunghezza_tracciato || 0.00, c.tipologia])
    saved++
  }
  console.log(`   [db] Circuiti: ${saved}`)
}

// ============================================================
// saveRaces — Inserisce gare e restituisce array con id_gara
// ============================================================
export async function saveRaces(races) {
  if (!races.length) return []
  const db = getDb()
  let saved = 0, skipped = 0

  for (const race of races) {
    if (!race.data) {
      console.warn(`   [db] Gara senza data saltata: "${race.nome_gara_premio}"`)
      skipped++
      continue
    }

    const [circuits] = await db.query(
      'SELECT id_circuito FROM circuito WHERE nome = ?',
      [race.circuito_nome]
    )
    if (!circuits.length) {
      console.warn(`   [db] Circuito non trovato: "${race.circuito_nome}"`)
      skipped++
      continue
    }

    await db.query(`
      INSERT INTO gara (nome_gara_premio, data, id_circuito_FK)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nome_gara_premio = VALUES(nome_gara_premio),
        data             = VALUES(data)
    `, [race.nome_gara_premio, race.data, circuits[0].id_circuito])

    // Recupera id_gara per poterlo usare nei risultati
    const [inserted] = await db.query(
      'SELECT id_gara FROM gara WHERE nome_gara_premio = ? AND data = ?',
      [race.nome_gara_premio, race.data]
    )
    if (inserted.length) race.id_gara = inserted[0].id_gara
    saved++
  }
  console.log(`   [db] Gare: ${saved} OK, ${skipped} saltate`)
  return races
}

// ============================================================
// saveRaceResults — Risultati e pit stop
// Cerca id_pilota per numero di gara o nome+cognome
// ============================================================
export async function saveRaceResults({ results, pitStops }) {
  const db = getDb()
  let savedRes = 0, savedPit = 0

  async function findPilota(entry) {
    if (entry.pilota_numero) {
      const [r] = await db.query(
        'SELECT id_pilota FROM pilota WHERE numero = ? LIMIT 1',
        [entry.pilota_numero]
      )
      if (r.length) return r[0].id_pilota
    }
    if (entry.pilota_nome && entry.pilota_cognome) {
      const [r] = await db.query(
        'SELECT id_pilota FROM pilota WHERE nome = ? AND cognome = ? LIMIT 1',
        [entry.pilota_nome, entry.pilota_cognome]
      )
      if (r.length) return r[0].id_pilota
    }
    return null
  }

  for (const r of results) {
    const id_pilota = await findPilota(r)
    if (!id_pilota) {
      console.warn(`   [db] Pilota non trovato: ${r.pilota_nome} ${r.pilota_cognome} #${r.pilota_numero}`)
      continue
    }
    await db.query(`
      INSERT INTO risultato
        (posizione_arrivo, punti_ottenuti, giro_veloce, tempo_totale,
         id_pilota_FK, id_gara_FK)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        posizione_arrivo = VALUES(posizione_arrivo),
        punti_ottenuti   = VALUES(punti_ottenuti),
        giro_veloce      = VALUES(giro_veloce),
        tempo_totale     = VALUES(tempo_totale)
    `, [r.posizione_arrivo, r.punti_ottenuti, r.giro_veloce,
        r.tempo_totale, id_pilota, r.id_gara])
    savedRes++
  }

  for (const ps of pitStops) {
    const id_pilota = await findPilota(ps)
    if (!id_pilota) continue
    await db.query(`
      INSERT INTO pitstop (numero_stop, tempo_pitstop, id_pilota_FK, id_gara_FK)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE tempo_pitstop = VALUES(tempo_pitstop)
    `, [ps.numero_stop, ps.tempo_pitstop, id_pilota, ps.id_gara])
    savedPit++
  }

  if (savedRes > 0 || savedPit > 0) {
    console.log(`     [db] Risultati: ${savedRes}, Pit stop: ${savedPit}`)
  }
}

// ============================================================
// updateTeamPoints — Ricalcola punti_totali da risultati
// ============================================================
export async function updateTeamPoints() {
  const db = getDb()
  await db.query(`
    UPDATE scuderia s
    SET punti_totali = (
      SELECT COALESCE(SUM(r.punti_ottenuti), 0)
      FROM risultato r
      JOIN pilota p ON r.id_pilota_FK = p.id_pilota
      WHERE p.id_scuderia_FK = s.id_scuderia
    )
  `)
  console.log('   [db] punti_totali aggiornati')
}