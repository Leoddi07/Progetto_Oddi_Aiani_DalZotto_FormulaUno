
// rotte/admin.js — Endpoint pannello amministrazione
// Tutti richiedono: login + ruolo admin

// GET    /api/admin/users              - lista utenti
// DELETE /api/admin/users/:id          - elimina utente
// PUT    /api/admin/users/:id/reset    - reset password
// POST   /api/admin/refresh/:type      - aggiorna dati da API F1
// PUT    /api/admin/data               - modifica manuale dato DB
// PUT    /api/admin/team-power         - aggiorna indice_potenza scuderia
// PUT    /api/admin/circuit-index      - aggiorna indice_imprevedibilità circuito
//
// indice_potenza e indice_imprevedibilità sono gestiti
// SOLO da questi endpoint admin dedicati, e non vengono quindi inseriti dal data-engineering

const express  = require('express')
const router   = express.Router()
const bcrypt   = require('bcrypt')
const db       = require('../models/db')
const { requireAuth, requireAdmin } = require('../middleware/auth')

router.use(requireAuth, requireAdmin)

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, email, ruolo AS role FROM utenti ORDER BY id'
    )
    res.json(rows)
  } catch (err) {
    console.error('[admin/users GET]', err)
    res.status(500).json({ error: 'Errore nel recupero utenti' })
  }
})

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Non puoi eliminare il tuo stesso account' })
  }
  try {
    await db.query('DELETE FROM utenti WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error('[admin/users DELETE]', err)
    res.status(500).json({ error: 'Errore eliminazione utente' })
  }
})

// PUT /api/admin/users/:id/reset
router.put('/users/:id/reset', async (req, res) => {
  const tempPassword = 'FANalytics'
  try {
    const hash = await bcrypt.hash(tempPassword, 10)
    await db.query('UPDATE utenti SET password_hash = ? WHERE id = ?', [hash, req.params.id])
    res.json({ success: true, tempPassword })
  } catch (err) {
    console.error('[admin/users reset]', err)
    res.status(500).json({ error: 'Errore reset password' })
  }
})

// POST /api/admin/refresh/:type
router.post('/refresh/:type', async (req, res) => {
  const validTypes = ['drivers', 'races', 'next']
  if (!validTypes.includes(req.params.type)) {
    return res.status(400).json({ error: 'Tipo non valido. Usare: drivers, races, next' })
  }
  try {
    console.log(`[admin/refresh] tipo: ${req.params.type}`)
    res.json({ success: true, message: `Aggiornamento "${req.params.type}" avviato` })
  } catch (err) {
    console.error('[admin/refresh]', err)
    res.status(500).json({ error: 'Errore durante il refresh' })
  }
})

// PUT /api/admin/data
// Modifica generica di un campo in una tabella (whitelist sicura)
router.put('/data', async (req, res) => {
  const { table, recordId, field, value } = req.body
  if (!table || !recordId || !field || value === undefined) {
    return res.status(400).json({ error: 'table, recordId, field, value obbligatori' })
  }

  // Whitelist tabelle + campi ammessi per ogni tabella
  // (NON include indice_potenza e indice_imprevedibilità — hanno endpoint dedicati)
  const ALLOWED = {
    pilota:    ['nome', 'cognome', 'nazionalità', 'numero'],
    scuderia:  ['nome', 'nazionalità_s', 'punti_totali'],
    circuito:  ['nome', 'paese', 'lunghezza_tracciato', 'tipologia'],
    gara:      ['nome_gara_premio', 'data'],
    risultato: ['posizione_arrivo', 'punti_ottenuti', 'giro_veloce', 'tempo_totale'],
    pitstop:   ['numero_stop', 'tempo_pitstop'],
  }

  const tableLow = table.toLowerCase()
  if (!ALLOWED[tableLow]) {
    return res.status(400).json({ error: `Tabella non consentita: ${table}` })
  }
  if (!ALLOWED[tableLow].includes(field)) {
    return res.status(400).json({ error: `Campo non consentito: ${field}` })
  }

  // PK name per ogni tabella
  const PK = {
    pilota: 'id_pilota', scuderia: 'id_scuderia', circuito: 'id_circuito',
    gara: 'id_gara', risultato: 'id_risultato', pitstop: 'id_pitstop',
  }

  try {
    await db.query(
      `UPDATE \`${tableLow}\` SET \`${field}\` = ? WHERE \`${PK[tableLow]}\` = ?`,
      [value, recordId]
    )
    res.json({ success: true, message: `${table}[${recordId}].${field} = ${value}` })
  } catch (err) {
    console.error('[admin/data PUT]', err)
    res.status(500).json({ error: 'Errore modifica: ' + err.message })
  }
})

// PUT /api/admin/team-power
// Aggiorna indice_potenza di una scuderia (solo admin)
// Body: { teamId: 1, value: 92.50 }
router.put('/team-power', async (req, res) => {
  const { teamId, value } = req.body
  if (!teamId || value === undefined) {
    return res.status(400).json({ error: 'teamId e value obbligatori' })
  }
  const val = parseFloat(value)
  if (isNaN(val) || val < 0 || val > 100) {
    return res.status(400).json({ error: 'value deve essere un numero tra 0 e 100' })
  }
  try {
    await db.query(
      'UPDATE scuderia SET indice_potenza = ? WHERE id_scuderia = ?',
      [val, teamId]
    )
    res.json({ success: true, message: `indice_potenza scuderia ${teamId} = ${val}` })
  } catch (err) {
    console.error('[admin/team-power]', err)
    res.status(500).json({ error: 'Errore aggiornamento indice potenza' })
  }
})


// PUT /api/admin/circuit-index
// Aggiorna indice_imprevedibilità di un circuito (solo admin)
// Body: { circuitId: 7, value: 0.80 }
router.put('/circuit-index', async (req, res) => {
  const { circuitId, value } = req.body
  if (!circuitId || value === undefined) {
    return res.status(400).json({ error: 'circuitId e value obbligatori' })
  }
  const val = parseFloat(value)
  if (isNaN(val) || val < 0 || val > 1) {
    return res.status(400).json({ error: 'value deve essere un numero tra 0.00 e 1.00' })
  }
  try {
    await db.query(
      'UPDATE circuito SET `indice_imprevedibilità` = ? WHERE id_circuito = ?',
      [val, circuitId]
    )
    res.json({ success: true, message: `indice_imprevedibilità circuito ${circuitId} = ${val}` })
  } catch (err) {
    console.error('[admin/circuit-index]', err)
    res.status(500).json({ error: 'Errore aggiornamento indice imprevedibilità' })
  }
})

module.exports = router