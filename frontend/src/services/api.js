// src/services/api.js

const BASE_URL = '/api'

// --- HELPERS CORE ---

async function get(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`)
  if (!res.ok) throw new Error(`Errore API: ${res.status} ${endpoint}`)
  return res.json()
}

async function post(endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Errore API: ${res.status} ${endpoint}`)
  return res.json()
}

// --- DATI MOCK ---

const MOCK_DRIVERS = [
  { id: 1, code: 'VER', firstname: 'Max', lastname: 'Verstappen', team: 'Red Bull Racing', points: 77, nationality: 'NED', number: 1 },
  { id: 2, code: 'NOR', firstname: 'Lando', lastname: 'Norris', team: 'McLaren', points: 62, nationality: 'GBR', number: 4 },
  { id: 3, code: 'LEC', firstname: 'Charles', lastname: 'Leclerc', team: 'Ferrari', points: 48, nationality: 'MON', number: 16 },
  { id: 4, code: 'PIA', firstname: 'Oscar', lastname: 'Piastri', team: 'McLaren', points: 44, nationality: 'AUS', number: 81 },
  { id: 5, code: 'SAI', firstname: 'Carlos', lastname: 'Sainz', team: 'Williams', points: 38, nationality: 'ESP', number: 55 },
  { id: 6, code: 'RUS', firstname: 'George', lastname: 'Russell', team: 'Mercedes', points: 32, nationality: 'GBR', number: 63 },
  { id: 7, code: 'HAM', firstname: 'Lewis', lastname: 'Hamilton', team: 'Ferrari', points: 28, nationality: 'GBR', number: 44 },
  { id: 8, code: 'ANT', firstname: 'Kimi', lastname: 'Antonelli', team: 'Mercedes', points: 22, nationality: 'ITA', number: 12 },
  { id: 9, code: 'ALO', firstname: 'Fernando', lastname: 'Alonso', team: 'Aston Martin', points: 14, nationality: 'ESP', number: 14 },
  { id: 10, code: 'TSU', firstname: 'Yuki', lastname: 'Tsunoda', team: 'Red Bull Racing', points: 10, nationality: 'JPN', number: 22 },
]

const MOCK_TEAMS = [
  { id: 1, name: 'McLaren', points: 106, color: '#FF8000' },
  { id: 2, name: 'Ferrari', points: 76, color: '#E8002D' },
  { id: 3, name: 'Red Bull Racing', points: 87, color: '#3671C6' },
  { id: 4, name: 'Mercedes', points: 54, color: '#27F4D2' },
  { id: 5, name: 'Williams', points: 38, color: '#64C4FF' },
  { id: 6, name: 'Aston Martin', points: 14, color: '#229971' },
]

const MOCK_RACES = [
  { id: 1, name: 'GP Bahrain', date: '2025-03-02', circuit: 'Bahrain International Circuit', winner: 'Verstappen', winnerTeam: 'Red Bull Racing', fastestLap: '1:32.608', avgPitStop: 2.3 },
  { id: 2, name: 'GP Arabia Saudita', date: '2025-03-09', circuit: 'Jeddah Corniche Circuit', winner: 'Norris', winnerTeam: 'McLaren', fastestLap: '1:28.123', avgPitStop: 2.8 },
  { id: 3, name: 'GP Australia', date: '2025-03-24', circuit: 'Albert Park Circuit', winner: 'Leclerc', winnerTeam: 'Ferrari', fastestLap: '1:19.813', avgPitStop: 2.5 },
  { id: 4, name: 'GP Giappone', date: '2025-04-07', circuit: 'Suzuka International Racing', winner: 'Piastri', winnerTeam: 'McLaren', fastestLap: '1:32.087', avgPitStop: 2.2 },
  { id: 5, name: 'GP Cina', date: '2025-04-21', circuit: 'Shanghai International Circuit', winner: 'Norris', winnerTeam: 'McLaren', fastestLap: '1:33.401', avgPitStop: 3.1 },
]

const MOCK_NEXT_RACE = {
  name: 'Gran Premio di Miami',
  circuit: 'Miami International Autodrome',
  country: 'USA',
  date: '2025-05-04',
  round: 6,
}

const MOCK_RACE_RESULTS = {
  1: [
    { pos: 1, driverCode: 'VER', driverName: 'M. Verstappen', team: 'Red Bull Racing', time: '1:31:44.742', points: 25, fastestLap: true },
    { pos: 2, driverCode: 'NOR', driverName: 'L. Norris', team: 'McLaren', time: '+5.612s', points: 18, fastestLap: false },
    { pos: 3, driverCode: 'LEC', driverName: 'C. Leclerc', team: 'Ferrari', time: '+8.301s', points: 15, fastestLap: false },
  ],
  2: [
    { pos: 1, driverCode: 'NOR', driverName: 'L. Norris', team: 'McLaren', time: '1:20:28.415', points: 25, fastestLap: true },
    { pos: 2, driverCode: 'VER', driverName: 'M. Verstappen', team: 'Red Bull', time: '+2.134s', points: 18, fastestLap: false },
    { pos: 3, driverCode: 'PIA', driverName: 'O. Piastri', team: 'McLaren', time: '+4.890s', points: 15, fastestLap: false },
  ],
}

const MOCK_PIT_STOPS = [
  { team: 'Red Bull Racing', avgTime: 2.1 },
  { team: 'McLaren', avgTime: 2.4 },
  { team: 'Ferrari', avgTime: 2.6 },
  { team: 'Mercedes', avgTime: 2.8 },
  { team: 'Williams', avgTime: 3.0 },
  { team: 'Aston Martin', avgTime: 3.2 },
]

// --- ENDPOINT PUBBLICI ---

export async function getDriverStandings() {
  return Promise.resolve(MOCK_DRIVERS)
}

export async function getTeamStandings() {
  return Promise.resolve(MOCK_TEAMS)
}

export async function getRaces() {
  return Promise.resolve(MOCK_RACES)
}

export async function getRaceResults(raceId) {
  return Promise.resolve(MOCK_RACE_RESULTS[raceId] || [])
}

export async function getNextRace() {
  return Promise.resolve(MOCK_NEXT_RACE)
}

export async function getPitStopStats() {
  return Promise.resolve(MOCK_PIT_STOPS)
}

export async function predictResult(team1, team2, circuit) {
  await new Promise(r => setTimeout(r, 800))
  const r = Math.random()
  const w1 = Math.round(30 + r * 30)
  const w2 = Math.round(20 + (1 - r) * 25)
  const dr = 100 - w1 - w2
  return {
    win_team1: w1,
    draw: dr,
    win_team2: w2,
    analysis: `[MOCK] Previsione per ${team1} vs ${team2} su ${circuit}.`,
    reliability: 'Media (mock)',
    circuit_factor: `Circuito ${circuit}: fattori simulati`,
  }
}

// --- ENDPOINT ADMIN ---

export async function getUsers() {
  return Promise.resolve([
    { id: 1, username: 'mario.rossi', email: 'mario@email.it', role: 'user' },
    { id: 2, username: 'simaus', email: 'simone.austeri@ittterni.org', role: 'admin' },
    { id: 3, username: "Big-'stein", email: 'jeevacations@gmail.com', role: 'user' },
    { id: 4, username: 'admin', email: 'admin@fanalytics.it', role: 'admin' },
  ])
}

export async function deleteUser(userId) {
  console.log('Mock: eliminato utente', userId)
  return Promise.resolve({ success: true })
}

export async function forceRefresh(type) {
  await new Promise(r => setTimeout(r, 1000))
  return Promise.resolve({ success: true, message: `Dati "${type}" aggiornati (mock)` })
}

export async function adminEditData(table, recordId, field, value) {
  console.log('Mock edit:', { table, recordId, field, value })
  return Promise.resolve({ success: true })
}

export { MOCK_TEAMS as TEAMS_LIST }