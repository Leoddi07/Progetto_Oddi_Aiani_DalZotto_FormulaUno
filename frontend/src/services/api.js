// src/services/api.js
// SERVIZIO API — con TUTTI i collegamenti al backend

// URL base del backend (configurato nel proxy di vite.config.js)
const BASE_URL = '/api'

// Helper generico per le chiamate GET
async function get(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`)
  if (!res.ok) throw new Error(`Errore API: ${res.status} ${endpoint}`)
  return res.json()
}

// Helper generico per le chiamate POST
async function post(endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Errore API: ${res.status} ${endpoint}`)
  return res.json()
}

// ENDPOINT: Classifica Piloti
// Backend: GET /api/drivers
export async function getDriverStandings() {
  return get('/drivers')
}

// ENDPOINT: Classifica Costruttori
// Backend: GET /api/teams
export async function getTeamStandings() {
  return get('/teams')
}

// ENDPOINT: Calendario Gare
// Backend: GET /api/races
export async function getRaces() {
  return get('/races')
}

// ENDPOINT: Risultati di una gara specifica
// Backend: GET /api/results/:raceId
export async function getRaceResults(raceId) {
  return get(`/results/${raceId}`)
}

// ENDPOINT: Prossima Gara
// Backend: GET /api/races/next
export async function getNextRace() {
  return get('/races/next')
}

// ENDPOINT: Pit Stop medi per team
// Backend: GET /api/pitstops
export async function getPitStopStats() {
  return get('/pitstops')
}

// ENDPOINT: Algoritmo di previsione risultato gara
// Backend: POST /api/predict
export async function predictResult(team1, team2, circuit) {
  return post('/predict', { team1, team2, circuit })
}

// ENDPOINT ADMIN: Lista Utenti
// Backend: GET /api/admin/users
export async function getUsers() {
  return get('/admin/users')
}

// ENDPOINT ADMIN: Elimina Utente
// Backend: DELETE /api/admin/users/:id
export async function deleteUser(userId) {
  const res = await fetch(`${BASE_URL}/admin/users/${userId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Errore eliminazione utente')
  return res.json()
}

// ENDPOINT ADMIN: Forza refresh dati da API F1
// Backend: POST /api/admin/refresh/:type
export async function forceRefresh(type) {
  return post(`/admin/refresh/${type}`, {})
}

// ENDPOINT ADMIN: Modifica manuale dato
// Backend: PUT /api/admin/data
export async function adminEditData(table, recordId, field, value) {
  return post('/admin/data', { table, recordId, field, value })
}