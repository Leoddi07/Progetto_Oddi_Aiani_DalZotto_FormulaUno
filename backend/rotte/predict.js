// routes/predict.js — Endpoint previsione risultato gara

// POST /api/predict
// Body:   { team1: "Ferrari", team2: "McLaren", circuit: "Monaco" }
// Output: { win_team1, draw, win_team2, analysis, reliability }

const express = require('express')
const router  = express.Router()
const db      = require('../db')
const { calculatePrediction } = require('../prediction/predictionAlgorithm')

// POST /api/predict
router.post('/', async (req, res) => {
  const { team1, team2, circuit } = req.body

  if (!team1 || !team2 || !circuit) {
    return res.status(400).json({ error: 'team1, team2 e circuit sono obbligatori' })
  }
  if (team1 === team2) {
    return res.status(400).json({ error: 'Le due scuderie devono essere diverse' })
  }

  try {
    const [teamStats] = await db.query(`
      SELECT
        s.nome                                                    AS teamName,
        s.indice_potenza                                          AS powerIndex,
        s.punti_totali                                            AS totalPoints,
        COUNT(DISTINCT CASE WHEN r.posizione_arrivo = 1
              THEN r.id_gara_FK END)                             AS wins,
        ROUND(AVG(r.posizione_arrivo), 2)                         AS avgPosition,
        ROUND(AVG(ps.tempo_pitstop), 2)                           AS avgPitStop,
        COUNT(DISTINCT r.id_gara_FK)                              AS racesPlayed
      FROM scuderia s
      LEFT JOIN pilota p    ON p.id_scuderia_FK  = s.id_scuderia
      LEFT JOIN risultato r ON r.id_pilota_FK    = p.id_pilota
      LEFT JOIN pitstop ps  ON ps.id_pilota_FK   = p.id_pilota
      WHERE s.nome IN (?, ?)
      GROUP BY s.id_scuderia, s.nome, s.indice_potenza, s.punti_totali
    `, [team1, team2])

    const [circuitData] = await db.query(`
      SELECT
        nome,
        tipologia,
        lunghezza_tracciato   AS length,
        \`indice_imprevedibilità\` AS unpredictability
      FROM circuito
      WHERE nome = ?
      LIMIT 1
    `, [circuit])

    const circuitInfo = circuitData[0] || null

    const prediction = calculatePrediction(team1, team2, circuit, teamStats, circuitInfo)

    res.json(prediction)

  } catch (err) {
    console.error('[predict/POST]', err)
    res.status(500).json({ error: 'Errore nel calcolo della previsione' })
  }
})

module.exports = router