// ============================================================
// data-engineering/index.js — Pipeline principale
//
// Flusso corretto per f1api.dev:
//
//   STANDINGS:
//     /current/drivers-championship  → classifica + piloti + team
//     /current/constructors-championship → classifica costruttori
//
//   GARE (NON esiste /api/{year}/races!):
//     /current                       → tutte le gare + winner già incluso
//     /current/next                  → prossima gara
//
//   RISULTATI:
//     Il vincitore è già in /current (campo winner + teamWinner)
//     Non esistono endpoint separati per risultati completi
//
// Uso:
//   node index.js                → importa tutto
//   node index.js --only=drivers → solo piloti/scuderie da standings
//   node index.js --only=races   → solo gare/circuiti + risultato vincitore
// ============================================================

import 'dotenv/config'
import {
  fetchCurrentSeason,
  fetchDriversChampionship,
  fetchConstructorsChampionship,
  fetchNextRace,
} from './scraper/f1ApiScraper.js'
import {
  cleanTeamsFromStandings,
  cleanDriversFromStandings,
  cleanRacesFromCurrent,
  buildWinnerResult,
} from './cleaner/dataCleaner.js'
import {
  saveTeams,
  saveDrivers,
  saveCircuits,
  saveRaces,
  saveRaceResults,
  updateTeamPoints,
  ensureAdminUser,
  closeDb,
} from './loader/saveToDb.js'

const args    = process.argv.slice(2)
const onlyArg = args.find(a => a.startsWith('--only='))
const only    = onlyArg ? onlyArg.split('=')[1] : 'all'

async function run() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   FANalytics — Data Engineering Pipeline      ║')
  console.log(`║   Modalità: ${only.padEnd(35)}║`)
  console.log('║   ⚠️  indice_potenza / indice_imprevedibilita  ║')
  console.log('║      NON vengono modificati (solo admin)       ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  try {
    // ── Assicura sempre utente admin hardcoded ──────────────
    console.log('🔑 Verifica utente admin...')
    await ensureAdminUser()
    console.log()

    // ── FASE 1: Piloti e Scuderie da standings ──────────────
    if (only === 'all' || only === 'drivers') {
      console.log('📡 [1] Fetch classifica costruttori...')
      const constructorStandings = await fetchConstructorsChampionship()
      const teams = cleanTeamsFromStandings(constructorStandings)
      await saveTeams(teams)

      console.log('\n📡 [2] Fetch classifica piloti...')
      const driverStandings = await fetchDriversChampionship()
      const drivers = cleanDriversFromStandings(driverStandings)
      await saveDrivers(drivers)

      console.log('   ✅ Piloti e scuderie OK\n')
    }

    // ── FASE 2: Gare e circuiti da /current ─────────────────
    if (only === 'all' || only === 'races') {
      console.log('📡 [3] Fetch stagione corrente (tutte le gare)...')
      const { season, races: rawRaces } = await fetchCurrentSeason()
      console.log(`   Stagione: ${season}`)

      console.log('🧹 Pulizia gare e circuiti...')
      const { circuits, races } = cleanRacesFromCurrent(rawRaces)

      console.log('💾 Salvataggio circuiti...')
      await saveCircuits(circuits)

      console.log('💾 Salvataggio gare...')
      const savedRaces = await saveRaces(races)

      // ── FASE 3: Risultato vincitore (da /current) ──────────
      // I dati winner/teamWinner sono già nella risposta /current
      // Non servono endpoint aggiuntivi
      console.log('\n💾 Salvataggio risultati vincitori...')
      let savedWinners = 0
      for (const race of savedRaces) {
        if (!race.completed || !race.winner || !race.id_gara) continue
        const result = buildWinnerResult(race)
        if (!result) continue
        try {
          await saveRaceResults({ results: [result], pitStops: [] })
          savedWinners++
        } catch (e) {
          console.warn(`   ⚠️  Winner non salvato per ${race.nome_gara_premio}: ${e.message}`)
        }
      }
      console.log(`   ✅ Vincitori salvati: ${savedWinners}`)

      // Ricalcola punti_totali scuderie
      console.log('\n💾 Ricalcolo punti_totali scuderie...')
      await updateTeamPoints()
      console.log('   ✅ Punti aggiornati\n')
    }

    console.log('════════════════════════════════════════════════')
    console.log('✅ Pipeline completata!')
    console.log('════════════════════════════════════════════════')

  } catch (err) {
    console.error('\n❌ ERRORE:', err.message)
    console.error(err.stack)
    process.exit(1)
  } finally {
    await closeDb()
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

run()