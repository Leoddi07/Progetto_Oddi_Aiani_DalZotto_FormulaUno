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

export async function deduplicateDatabase() {
  const db = getDb()

  const teamsMerged = await mergeDuplicateGroups({
    db,
    table: 'scuderia',
    idColumn: 'id_scuderia',
    keyColumns: ['nome'],
    childUpdates: [
      { table: 'pilota', fk: 'id_scuderia_FK' },
    ],
  })

  const circuitsMerged = await mergeDuplicateGroups({
    db,
    table: 'circuito',
    idColumn: 'id_circuito',
    keyColumns: ['nome'],
    childUpdates: [
      { table: 'gara', fk: 'id_circuito_FK' },
    ],
  })

  const racesMerged = await mergeDuplicateGroups({
    db,
    table: 'gara',
    idColumn: 'id_gara',
    keyColumns: ['nome_gara_premio', 'data'],
    childUpdates: [
      { table: 'risultato', fk: 'id_gara_FK' },
      { table: 'pitstop', fk: 'id_gara_FK' },
    ],
  })

  const driversMerged = await mergeDuplicateGroups({
    db,
    table: 'pilota',
    idColumn: 'id_pilota',
    keyColumns: ['numero'],
    childUpdates: [
      { table: 'risultato', fk: 'id_pilota_FK' },
      { table: 'pitstop', fk: 'id_pilota_FK' },
    ],
  })

  const resultsMerged = await removeDuplicateChildRows({
    db,
    table: 'risultato',
    idColumn: 'id_risultato',
    keyColumns: ['id_pilota_FK', 'id_gara_FK', 'posizione_arrivo'],
  })

  const pitstopsMerged = await removeDuplicateChildRows({
    db,
    table: 'pitstop',
    idColumn: 'id_pitstop',
    keyColumns: ['id_pilota_FK', 'id_gara_FK', 'numero_stop'],
  })

  const totalMerged = teamsMerged + circuitsMerged + racesMerged + driversMerged + resultsMerged + pitstopsMerged
  if (totalMerged > 0) {
    console.log(`   [db] Deduplica completata: ${totalMerged} record duplicati consolidati`)
  }
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
    const [existing] = await db.query(
      'SELECT id_scuderia FROM scuderia WHERE nome = ? LIMIT 1',
      [team.nome]
    )

    if (existing.length) {
      await db.query(`
        UPDATE scuderia
        SET nazionalita = ?, punti_totali = ?
        WHERE id_scuderia = ?
      `, [team.nazionalita, team.punti_totali || 0, existing[0].id_scuderia])
    } else {
      await db.query(`
        INSERT INTO scuderia (nome, nazionalita, punti_totali)
        VALUES (?, ?, ?)
      `, [team.nome, team.nazionalita, team.punti_totali || 0])
    }
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

    const [existing] = await db.query(`
      SELECT id_pilota
      FROM pilota
      WHERE numero = ? OR (nome = ? AND cognome = ?)
      ORDER BY id_pilota ASC
      LIMIT 1
    `, [driver.numero, driver.nome, driver.cognome])

    if (existing.length) {
      await db.query(`
        UPDATE pilota
        SET nome = ?, cognome = ?, nazionalita = ?, numero = ?, id_scuderia_FK = ?
        WHERE id_pilota = ?
      `, [driver.nome, driver.cognome, driver.nazionalita, driver.numero, teams[0].id_scuderia, existing[0].id_pilota])
    } else {
      await db.query(`
        INSERT INTO pilota (nome, cognome, nazionalita, numero, id_scuderia_FK)
        VALUES (?, ?, ?, ?, ?)
      `, [driver.nome, driver.cognome, driver.nazionalita, driver.numero, teams[0].id_scuderia])
    }
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
    const [existing] = await db.query(
      'SELECT id_circuito FROM circuito WHERE nome = ? LIMIT 1',
      [c.nome]
    )

    if (existing.length) {
      await db.query(`
        UPDATE circuito
        SET paese = ?, lunghezza_tracciato = ?, tipologia = ?
        WHERE id_circuito = ?
      `, [c.paese, c.lunghezza_tracciato || 0.00, c.tipologia, existing[0].id_circuito])
    } else {
      await db.query(`
        INSERT INTO circuito (nome, paese, lunghezza_tracciato, tipologia)
        VALUES (?, ?, ?, ?)
      `, [c.nome, c.paese, c.lunghezza_tracciato || 0.00, c.tipologia])
    }
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

    const [existing] = await db.query(
      'SELECT id_gara FROM gara WHERE nome_gara_premio = ? AND data = ? ORDER BY id_gara ASC LIMIT 1',
      [race.nome_gara_premio, race.data]
    )

    if (existing.length) {
      await db.query(`
        UPDATE gara
        SET nome_gara_premio = ?, data = ?, id_circuito_FK = ?
        WHERE id_gara = ?
      `, [race.nome_gara_premio, race.data, circuits[0].id_circuito, existing[0].id_gara])
    } else {
      await db.query(`
        INSERT INTO gara (nome_gara_premio, data, id_circuito_FK)
        VALUES (?, ?, ?)
      `, [race.nome_gara_premio, race.data, circuits[0].id_circuito])
    }

    // Recupera id_gara per poterlo usare nei risultati
    const [inserted] = await db.query(
      'SELECT id_gara FROM gara WHERE nome_gara_premio = ? AND data = ? ORDER BY id_gara ASC LIMIT 1',
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
    const [existing] = await db.query(`
      SELECT id_risultato
      FROM risultato
      WHERE id_pilota_FK = ? AND id_gara_FK = ? AND posizione_arrivo = ?
      ORDER BY id_risultato ASC
      LIMIT 1
    `, [id_pilota, r.id_gara, r.posizione_arrivo])

    if (existing.length) {
      await db.query(`
        UPDATE risultato
        SET punti_ottenuti = ?, giro_veloce = ?, tempo_totale = ?
        WHERE id_risultato = ?
      `, [r.punti_ottenuti, r.giro_veloce, r.tempo_totale, existing[0].id_risultato])
    } else {
      await db.query(`
        INSERT INTO risultato
          (posizione_arrivo, punti_ottenuti, giro_veloce, tempo_totale,
           id_pilota_FK, id_gara_FK)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [r.posizione_arrivo, r.punti_ottenuti, r.giro_veloce,
          r.tempo_totale, id_pilota, r.id_gara])
    }
    savedRes++
  }

  for (const ps of pitStops) {
    const id_pilota = await findPilota(ps)
    if (!id_pilota) continue
    const [existing] = await db.query(`
      SELECT id_pitstop
      FROM pitstop
      WHERE numero_stop = ? AND id_pilota_FK = ? AND id_gara_FK = ?
      ORDER BY id_pitstop ASC
      LIMIT 1
    `, [ps.numero_stop, id_pilota, ps.id_gara])

    if (existing.length) {
      await db.query(
        'UPDATE pitstop SET tempo_pitstop = ? WHERE id_pitstop = ?',
        [ps.tempo_pitstop, existing[0].id_pitstop]
      )
    } else {
      await db.query(`
        INSERT INTO pitstop (numero_stop, tempo_pitstop, id_pilota_FK, id_gara_FK)
        VALUES (?, ?, ?, ?)
      `, [ps.numero_stop, ps.tempo_pitstop, id_pilota, ps.id_gara])
    }
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

async function mergeDuplicateGroups({ db, table, idColumn, keyColumns, childUpdates = [] }) {
  const keySelect = keyColumns.map(c => `\`${c}\``).join(', ')
  const [groups] = await db.query(`
    SELECT ${keySelect}, MIN(\`${idColumn}\`) AS keep_id, COUNT(*) AS duplicate_count
    FROM \`${table}\`
    GROUP BY ${keySelect}
    HAVING COUNT(*) > 1
  `)

  let merged = 0

  for (const group of groups) {
    const whereClause = keyColumns.map(c => `\`${c}\` <=> ?`).join(' AND ')
    const whereValues = keyColumns.map(c => group[c])
    const [rows] = await db.query(`
      SELECT \`${idColumn}\`
      FROM \`${table}\`
      WHERE ${whereClause}
      ORDER BY \`${idColumn}\` ASC
    `, whereValues)

    const duplicateIds = rows.map(r => r[idColumn]).filter(id => id !== group.keep_id)
    if (!duplicateIds.length) continue

    for (const child of childUpdates) {
      await db.query(`
        UPDATE \`${child.table}\`
        SET \`${child.fk}\` = ?
        WHERE \`${child.fk}\` IN (${duplicateIds.map(() => '?').join(', ')})
      `, [group.keep_id, ...duplicateIds])
    }

    await db.query(`
      DELETE FROM \`${table}\`
      WHERE \`${idColumn}\` IN (${duplicateIds.map(() => '?').join(', ')})
    `, duplicateIds)

    merged += duplicateIds.length
  }

  return merged
}

async function removeDuplicateChildRows({ db, table, idColumn, keyColumns }) {
  const keySelect = keyColumns.map(c => `\`${c}\``).join(', ')
  const [groups] = await db.query(`
    SELECT ${keySelect}, MIN(\`${idColumn}\`) AS keep_id, COUNT(*) AS duplicate_count
    FROM \`${table}\`
    GROUP BY ${keySelect}
    HAVING COUNT(*) > 1
  `)

  let removed = 0

  for (const group of groups) {
    const whereClause = keyColumns.map(c => `\`${c}\` <=> ?`).join(' AND ')
    const whereValues = keyColumns.map(c => group[c])
    const [rows] = await db.query(`
      SELECT \`${idColumn}\`
      FROM \`${table}\`
      WHERE ${whereClause}
      ORDER BY \`${idColumn}\` ASC
    `, whereValues)

    const duplicateIds = rows.map(r => r[idColumn]).filter(id => id !== group.keep_id)
    if (!duplicateIds.length) continue

    await db.query(`
      DELETE FROM \`${table}\`
      WHERE \`${idColumn}\` IN (${duplicateIds.map(() => '?').join(', ')})
    `, duplicateIds)

    removed += duplicateIds.length
  }

  return removed
}
