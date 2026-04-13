// rotte/auth.js — Endpoint di autenticazione
// POST /api/auth/login    - login utente
// POST /api/auth/register - registrazione nuovo utente

const express  = require('express')
const router   = express.Router()
const bcrypt   = require('bcrypt')
const jwt      = require('jsonwebtoken')
const db       = require('../models/db')

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body

  // Validazione input
  if (!username || !password) {
    return res.status(400).json({ error: 'Username e password obbligatori' })
  }

  try {
    // Cerca l'utente nel database
    const [rows] = await db.query(
      'SELECT * FROM utenti WHERE username = ?',
      [username]
    )
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenziali non valide' })
    }

    const user = rows[0]

    // Confronta la password con l'hash nel database
    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      return res.status(401).json({ error: 'Credenziali non valide' })
    }

    // Genera token JWT (valido 24 ore)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.ruolo },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      id:       user.id,
      username: user.username,
      email:    user.email,
      role:     user.ruolo,
      token,    // il frontend salva questo token in localStorage
    })

  } catch (err) {
    console.error('[auth/login]', err)
    res.status(500).json({ error: 'Errore del server' })
  }
})

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori' })
  }

  try {
    // Verifica username non già in uso
    const [existing] = await db.query(
      'SELECT id FROM utenti WHERE username = ? OR email = ?',
      [username, email]
    )
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username o email già in uso' })
    }

    // Hash della password
    const hash = await bcrypt.hash(password, 10)

    // Inserisce il nuovo utente (ruolo default: 'user')
    await db.query(
      'INSERT INTO utenti (username, email, password_hash, ruolo) VALUES (?, ?, ?, ?)',
      [username, email, hash, 'user']
    )

    res.status(201).json({ message: 'Account creato con successo' })

  } catch (err) {
    console.error('[auth/register]', err)
    res.status(500).json({ error: 'Errore del server' })
  }
})

module.exports = router