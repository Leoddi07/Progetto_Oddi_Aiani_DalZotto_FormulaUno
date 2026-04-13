// rotte/auth.js — Endpoint di autentecazione
// POST /api/auth/login    - login utente
// POST /api/auth/register - registrazione nuovo utente

const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcrypt')
const jwt     = require('jsonwebtoken')
const db      = require('../models/db')

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Username e password obbligatori' })
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM utente WHERE username = ?',
      [username]
    )
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenziali non valide' })
    }

    const user  = rows[0]
    // Il campo password nel DB contiene l'hash bcrypt
    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(401).json({ error: 'Credenziali non valide' })
    }

    // Token JWT: include ruolo ('utente' o 'admin')
    const token = jwt.sign(
      { id: user.id_utente, username: user.username, role: user.ruolo },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      id:       user.id_utente,
      username: user.username,
      email:    user.email,
      role:     user.ruolo,   // 'utente' | 'admin'
      token,
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
    const [existing] = await db.query(
      'SELECT id_utente FROM utente WHERE username = ? OR email = ?',
      [username, email]
    )
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username o email già in uso' })
    }

    const hash = await bcrypt.hash(password, 10)
    // ruolo default: 'utente' (come da ENUM nel DB)
    await db.query(
      'INSERT INTO utente (username, email, password, ruolo) VALUES (?, ?, ?, ?)',
      [username, email, hash, 'utente']
    )

    res.status(201).json({ message: 'Account creato con successo' })

  } catch (err) {
    console.error('[auth/register]', err)
    res.status(500).json({ error: 'Errore del server' })
  }
})

module.exports = router