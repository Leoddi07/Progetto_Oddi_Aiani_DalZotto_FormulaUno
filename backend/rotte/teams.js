// routes/teams.js — Endpoint scuderie / costruttori

// GET /api/teams - classifica costruttori

// Nomi colonne DB (da F1.sql):
//   scuderia: id_scuderia, nome, nazionalità_s, punti_totali, indice_potenza
//   pilota:   id_scuderia_FK
//   risultato: punti_ottenuti, id_pilota_FK
// referenza

const express = require('express')
const router  = express.Router()
const db      = require('../db')

// GET /api/teams
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        s.id_scuderia    AS id,
        s.nome           AS name,
        s.nazionalita    AS nationality,
        s.punti_totali   AS points,
        s.indice_potenza AS powerIndex
      FROM scuderia s
      ORDER BY s.punti_totali DESC
    `)
    res.json(rows)
  } catch (err) {
    console.error('[teams/GET]', err)
    res.status(500).json({ error: 'Errore nel recupero scuderie' })
  }
})

module.exports = router