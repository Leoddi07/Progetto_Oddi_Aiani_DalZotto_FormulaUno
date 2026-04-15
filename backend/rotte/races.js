// routes/races.js — Endpoint gare

// GET /api/races           - elenco gare disputate
// GET /api/races/next      - prossima gara
// GET /api/races/results/:id - risultati di una gara
// GET /api/races/pitstops  - tempi medi pit stop per scuderia

// Nomi colonne DB (da F1.sql):
//   gara:     id_gara, nome_gara_premio, data, id_circuito_FK
//   circuito: id_circuito, nome, paese, lunghezza_tracciato,
//             tipologia, indice_imprevedibilità
//   risultato: id_risultato, posizione_arrivo, punti_ottenuti,
//              giro_veloce, tempo_totale, id_pilota_FK, id_gara_FK
//   pitstop:  id_pitstop, numero_stop, tempo_pitstop,
//             id_pilota_FK, id_gara_FK
// sempre per referenza

const express = require('express')
const router  = express.Router()
const db      = require('../db')

// GET /api/races
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        g.id_gara                              AS id,
        g.nome_gara_premio                     AS name,
        g.data                                 AS date,
        g.numero_giri                          AS totalLaps,
        ROUND(g.numero_giri * c.lunghezza_tracciato, 2) AS distanceKm,
        g.giro_veloce                          AS fastestLap,
        c.nome                                 AS circuit,
        c.paese                                AS country,
        c.indice_imprevedibilita               AS unpredictability,
        CONCAT(p.nome, ' ', p.cognome)         AS winner,
        s.nome                                 AS winnerTeam,
        (
          SELECT ROUND(AVG(ps.tempo_pitstop), 2)
          FROM pitstop ps
          WHERE ps.id_gara_FK = g.id_gara
        )                                      AS avgPitStop
      FROM gara g
      JOIN circuito c  ON g.id_circuito_FK   = c.id_circuito
      JOIN risultato r ON r.id_gara_FK        = g.id_gara
                      AND r.posizione_arrivo  = 1
      JOIN pilota p    ON r.id_pilota_FK      = p.id_pilota
      JOIN scuderia s  ON p.id_scuderia_FK    = s.id_scuderia
      WHERE g.data <= CURDATE()
      ORDER BY g.data ASC
    `)
    res.json(rows)
  } catch (err) {
    console.error('[races/GET]', err)
    res.status(500).json({ error: 'Errore nel recupero gare' })
  }
})

// GET /api/races/next
router.get('/next', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        g.id_gara                  AS id,
        g.nome_gara_premio         AS name,
        g.data                     AS date,
        g.numero_giri              AS totalLaps,
        ROUND(g.numero_giri * c.lunghezza_tracciato, 2) AS distanceKm,
        g.giro_veloce              AS fastestLap,
        c.nome                     AS circuit,
        c.paese                    AS country,
        c.indice_imprevedibilita   AS unpredictability
      FROM gara g
      JOIN circuito c ON g.id_circuito_FK = c.id_circuito
      WHERE g.data > CURDATE()
      ORDER BY g.data ASC
      LIMIT 1
    `)
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Nessuna gara futura trovata' })
    }
    res.json(rows[0])
  } catch (err) {
    console.error('[races/next GET]', err)
    res.status(500).json({ error: 'Errore nel recupero prossima gara' })
  }
})

// GET /api/races/results/:raceId
router.get('/results/:raceId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        r.posizione_arrivo                       AS pos,
        CONCAT(LEFT(p.nome,1), '. ', p.cognome) AS driverName,
        s.nome                                   AS team,
        r.tempo_totale                           AS time,
        r.punti_ottenuti                         AS points,
        r.giro_veloce                            AS fastestLap
      FROM risultato r
      JOIN pilota p   ON r.id_pilota_FK   = p.id_pilota
      JOIN scuderia s ON p.id_scuderia_FK = s.id_scuderia
      WHERE r.id_gara_FK = ?
      ORDER BY r.posizione_arrivo ASC
    `, [req.params.raceId])
    res.json(rows)
  } catch (err) {
    console.error('[races/results GET]', err)
    res.status(500).json({ error: 'Errore nel recupero risultati' })
  }
})

// GET /api/races/pitstops
router.get('/pitstops', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        s.nome                          AS team,
        ROUND(AVG(ps.tempo_pitstop), 2) AS avgTime
      FROM pitstop ps
      JOIN pilota p   ON ps.id_pilota_FK  = p.id_pilota
      JOIN scuderia s ON p.id_scuderia_FK = s.id_scuderia
      GROUP BY s.id_scuderia, s.nome
      HAVING avgTime IS NOT NULL
      ORDER BY avgTime ASC
    `)
    res.json(rows)
  } catch (err) {
    console.error('[pitstops/GET]', err)
    res.status(500).json({ error: 'Errore nel recupero pit stop' })
  }
})

module.exports = router
