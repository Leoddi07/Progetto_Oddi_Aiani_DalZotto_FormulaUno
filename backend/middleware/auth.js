// middleware/auth.js — Middleware di autenticazione JWT
//
// Questi middleware vengono usati nelle rotte per proteggere
// gli endpoint che richiedono login o ruolo admin.
//
// Uso nelle rotte:
//   router.get('/rotta', requireAuth, controller)
//   router.get('/admin', requireAuth, requireAdmin, controller)

const jwt = require('jsonwebtoken')

// ---- requireAuth ----
// Verifica che la richiesta abbia un token JWT valido nell'header
// Header atteso: Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante. Effettua il login.' })
  }
  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded  // { id, username, role }
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token non valido o scaduto.' })
  }
}

// ---- requireAdmin ----
// Verifica che l'utente autenticato abbia ruolo "admin"
// Da usare DOPO requireAuth
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Accesso negato. Richiesto ruolo admin.' })
  }
  next()
}

module.exports = { requireAuth, requireAdmin }
