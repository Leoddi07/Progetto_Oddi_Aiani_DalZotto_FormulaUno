// server.js — Entry point del backend FANalytics

// Avvia il server Express e registra tutte le rotte API.
// Porta default: 3001 (in .env)

// unico che si avvia con "node server.js" o nodemon

require('dotenv').config()
const express = require('express')
const cors    = require('cors')

const app  = express()
const PORT = process.env.PORT || 3001

// Middleware globali
app.use(cors({
  // Permette richieste dal frontend Vite in sviluppo
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))
app.use(express.json()) // parsa il body JSON delle richieste

// Importa le rotte
const authRoutes    = require('./rotte/auth')
const driversRoutes = require('./rotte/drivers')
const teamsRoutes   = require('./rotte/teams')
const racesRoutes   = require('./rotte/races')
const predictRoutes = require('./rotte/predict')
const adminRoutes   = require('./rotte/admin')

// Registra le rotte con prefisso /api
app.use('/api/auth',    authRoutes)
app.use('/api/drivers', driversRoutes)
app.use('/api/teams',   teamsRoutes)
app.use('/api/races',   racesRoutes)
app.use('/api/predict', predictRoutes)
app.use('/api/admin',   adminRoutes)

// Rotta di health check (verifico se il server sta funzionando)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FANalytics backend attivo', timestamp: new Date() })
})

// Gestione errori globale
// Questo middleware cattura qualsiasi errore non gestito nelle rotte
app.use((err, req, res, next) => {
  console.error('[ERRORE]', err.message)
  res.status(err.status || 500).json({
    error: err.message || 'Errore interno del server',
  })
})

// Avvio
app.listen(PORT, () => {
  console.log(`✅ FANalytics backend in ascolto su http://localhost:${PORT}`)
  console.log(`   Health check: http://localhost:${PORT}/api/health`)
})
