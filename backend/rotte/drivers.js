// rotte/drivers.js — Endpoint piloti
//
// GET /api/drivers      - classifica piloti ordinata per punti
// GET /api/drivers/:id  - dettaglio singolo pilota

// Nomi colonne DB (da F1.sql): elimina pls che serve solo per roferimento
//   pilota:   id_pilota, nome, cognome, nazionalità, numero, id_scuderia_FK
//   scuderia: id_scuderia, nome, nazionalità_s, punti_totali, indice_potenza
//   risultato: punti_ottenuti, id_pilota_FK, id_gara_FK

const express = require('express')
const router  = express.Router()
const db      = require('../db')

// GET /api/drivers
router.get('/', async (req, res) => {
  try {
    // ehi chat puoi migliroarmi la query? 🥰❤️❤️
    const [rows] = await db.query(`
      SELECT
        p.id_pilota          AS id,
        p.nome               AS firstname,
        p.cognome            AS lastname,
        p.nazionalità        AS nationality,
        p.numero             AS number,
        s.nome               AS team,
        s.indice_potenza     AS teamPower,
        COALESCE(SUM(r.punti_ottenuti), 0) AS points
      FROM pilota p
      JOIN scuderia s  ON p.id_scuderia_FK = s.id_scuderia
      LEFT JOIN risultato r ON r.id_pilota_FK = p.id_pilota
      GROUP BY p.id_pilota, p.nome, p.cognome, p.nazionalità,
               p.numero, s.nome, s.indice_potenza
      ORDER BY points DESC
    `)
    res.json(rows)
  } catch (err) {
    console.error('[drivers/GET]', err)
    res.status(500).json({ error: 'Errore nel recupero dei piloti' })
  }
})

// GET /api/drivers/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        p.id_pilota,
        p.nome,
        p.cognome,
        p.nazionalità,
        p.numero,
        s.nome          AS team,
        s.indice_potenza AS teamPower,
        COALESCE(SUM(r.punti_ottenuti), 0) AS points
      FROM pilota p
      JOIN scuderia s  ON p.id_scuderia_FK = s.id_scuderia
      LEFT JOIN risultato r ON r.id_pilota_FK = p.id_pilota
      WHERE p.id_pilota = ?
      GROUP BY p.id_pilota, s.nome, s.indice_potenza
    `, [req.params.id])

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Pilota non trovato' })
    }
    res.json(rows[0])
  } catch (err) {
    console.error('[drivers/:id GET]', err)
    res.status(500).json({ error: 'Errore nel recupero pilota' })
  }
})

module.exports = router