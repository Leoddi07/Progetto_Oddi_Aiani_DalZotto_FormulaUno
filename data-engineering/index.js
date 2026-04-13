// ============================================================
// data-engineering/index.js
//
// Entry point principale del modulo di data engineering.
// Coordina: fetch → cleaning → inserimento nel DB
//
// Uso:
//   node index.js              → importa tutto
//   node index.js --only=drivers  → solo piloti e scuderie
//   node index.js --only=races    → solo gare e risultati
//
// Flusso:
//   1. scraper/  → chiama F1api.dev e restituisce dati grezzi
//   2. cleaner/  → pulisce e normalizza i dati
//   3. loader/   → inserisce i dati nel database MySQL
// ============================================================

import 'dotenv/config'
import { fetchDriversAndTeams, fetchRaces, fetchRaceResults, fetchNextRace } from './scraper/f1ApiScraper.js'
import { cleanDrivers, cleanTeams, cleanRaces, cleanRaceResults, cleanNextRace } from './cleaner/dataCleaner.js'
import { saveTeams, saveDrivers, saveCircuits, saveRaces, saveRaceResults, closeDb } from './loader/saveToDb.js'

// Argomento opzionale --only=drivers|races
const args   = process.argv.slice(2)
const onlyArg = args.find(a => a.startsWith('--only='))
const only   = onlyArg ? onlyArg.split('=')[1] : 'all'

const SEASON = process.env.F1_SEASON || '2025'

// ============================================================
// Pipeline principale
// ============================================================
async function run() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   FANalytics — Data Engineering Pipeline  ║')
  console.log(`║   Stagione: ${SEASON}   Modalità: ${only.padEnd(10)}  ║`)
  console.log('╚══════════════════════════════════════════╝\n')

  try {

    // ── FASE 1: Piloti e Scuderie ───────────────────────────
    if (only === 'all' || only === 'drivers') {
      console.log('📡 [1/4] Fetch piloti e scuderie da F1api.dev...')
      const rawDrivers = await fetchDriversAndTeams(SEASON)

      console.log('🧹 [2/4] Pulizia dati piloti e scuderie...')
      const cleanedTeams   = cleanTeams(rawDrivers)
      const cleanedDrivers = cleanDrivers(rawDrivers)

      console.log(`💾 [3/4] Salvataggio ${cleanedTeams.length} scuderie e ${cleanedDrivers.length} piloti nel DB...`)
      await saveTeams(cleanedTeams)
      await saveDrivers(cleanedDrivers)
      console.log('   ✅ Piloti e scuderie salvati\n')
    }

    // ── FASE 2: Circuiti e Gare ─────────────────────────────
    if (only === 'all' || only === 'races') {
      console.log('📡 [1/3] Fetch calendario gare...')
      const rawRaces = await fetchRaces(SEASON)

      console.log('🧹 [2/3] Pulizia dati gare e circuiti...')
      const { circuits, races } = cleanRaces(rawRaces)

      console.log(`💾 [3/3] Salvataggio ${circuits.length} circuiti e ${races.length} gare...`)
      await saveCircuits(circuits)
      await saveRaces(races)
      console.log('   ✅ Gare e circuiti salvati\n')

      // ── FASE 3: Risultati gare già disputate ──────────────
      console.log('📡 Fetch risultati e pit stop per ogni gara disputata...')
      for (const race of races) {
        if (!race.completed) continue  // salta gare future
        try {
          process.stdout.write(`   → ${race.name} (round ${race.round})... `)
          const rawResults  = await fetchRaceResults(SEASON, race.round)
          const cleanResults = cleanRaceResults(rawResults, race.id_gara)
          await saveRaceResults(cleanResults)
          console.log('✅')
          // Pausa tra le richieste per non sovraccaricare l'API
          await sleep(300)
        } catch (e) {
          console.log(`⚠️  Skipped (${e.message})`)
        }
      }
      console.log()
    }

    // ── FASE 4: Prossima gara ──────────────────────────────
    if (only === 'all' || only === 'next') {
      console.log('📡 Fetch prossima gara...')
      const rawNext   = await fetchNextRace(SEASON)
      if (rawNext) {
        const cleaned = cleanNextRace(rawNext)
        console.log(`   Prossima gara: ${cleaned.name} (${cleaned.date})`)
      }
      console.log()
    }

    console.log('════════════════════════════════════════════')
    console.log('✅ Pipeline completata con successo!')
    console.log('════════════════════════════════════════════')

  } catch (err) {
    console.error('\n❌ ERRORE PIPELINE:', err.message)
    console.error(err.stack)
    process.exit(1)
  } finally {
    await closeDb()
  }
}

// Helper: aspetta N millisecondi (per rate limiting)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

run()
