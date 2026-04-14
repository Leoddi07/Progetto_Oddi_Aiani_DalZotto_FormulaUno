// ============================================================
// data-engineering/index.js - Pipeline principale
// ============================================================

import 'dotenv/config'
import {
  fetchCurrentSeason,
  fetchDriversChampionship,
  fetchConstructorsChampionship,
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
  deduplicateDatabase,
  applyDevelopmentIndexes,
  closeDb,
} from './loader/saveToDb.js'

const args = process.argv.slice(2)
const onlyArg = args.find(a => a.startsWith('--only='))
const only = onlyArg ? onlyArg.split('=')[1] : 'all'

async function run() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   FANalytics - Data Engineering Pipeline    ║')
  console.log(`║   Modalita: ${only.padEnd(33)}║`)
  console.log('║   Dev seed indici attivo fuori production   ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  try {
    console.log('🔑 Verifica utente admin...')
    await ensureAdminUser()
    await deduplicateDatabase()
    console.log()

    if (only === 'all' || only === 'drivers') {
      console.log('📡 [1] Fetch classifica costruttori...')
      const constructorStandings = await fetchConstructorsChampionship()
      const teams = cleanTeamsFromStandings(constructorStandings)
      await saveTeams(teams)
      await applyDevelopmentIndexes()

      console.log('\n📡 [2] Fetch classifica piloti...')
      const driverStandings = await fetchDriversChampionship()
      const drivers = cleanDriversFromStandings(driverStandings)
      await saveDrivers(drivers)

      console.log('   ✅ Piloti e scuderie OK\n')
    }

    if (only === 'all' || only === 'races') {
      console.log('📡 [3] Fetch stagione corrente (tutte le gare)...')
      const { season, races: rawRaces } = await fetchCurrentSeason()
      console.log(`   Stagione: ${season}`)

      console.log('🧹 Pulizia gare e circuiti...')
      const { circuits, races } = cleanRacesFromCurrent(rawRaces)

      console.log('💾 Salvataggio circuiti...')
      await saveCircuits(circuits)
      await applyDevelopmentIndexes()

      console.log('💾 Salvataggio gare...')
      const savedRaces = await saveRaces(races)

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
          console.warn(`   ⚠️ Winner non salvato per ${race.nome_gara_premio}: ${e.message}`)
        }
      }
      console.log(`   ✅ Vincitori salvati: ${savedWinners}`)

      console.log('\n💾 Ricalcolo punti_totali scuderie...')
      await updateTeamPoints()
      await applyDevelopmentIndexes()
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

run()
