
// algorithms/predictionAlgorithm.js

// ALGORITMO DI PREVISIONE RISULTATO GARA
//    USA:
//   - indice_potenza (scuderia)
//   - indice_imprevedibilità (circuito)
//   - punti_totali, vittorie, avgPitStop
//
// Formula:
//   score = indice_potenza * 0.4
//         + wins * 30
//         + totalPoints * 0.3
//         + pit_bonus
//         - avgPosition * 5
//
//   unpredictability_pool = indice_imprevedibilità * 100
//
//   probabilità = score / (score_A + score_B + pool) * (1 - pool/100)
// ============================================================

/**
 * @param {string} team1
 * @param {string} team2
 * @param {string} circuit
 * @param {Array}  teamStats    - dal DB: { teamName, powerIndex, totalPoints,
 *                                          wins, avgPosition, avgPitStop, racesPlayed }
 * @param {Object} circuitInfo
 */
function calculatePrediction(team1, team2, circuit, teamStats, circuitInfo) {
  const stats1 = teamStats.find(t => t.teamName === team1) || {}
  const stats2 = teamStats.find(t => t.teamName === team2) || {}

  // PASSO 1: Punteggio base per ogni scuderia
  // indice_potenza è il valore inserito dall'admin (0-100)
  // rappresenta la forza tecnica del team in questa stagione
  function baseScore(stats) {
    const powerBonus  = (parseFloat(stats.powerIndex) || 50) * 0.4   // peso 40%
    const winsBonus   = (parseInt(stats.wins)         || 0)  * 30    // ogni vittoria +30
    const pointsBonus = (parseFloat(stats.totalPoints)|| 0)  * 0.3   // punti stagione
    const posBonus    = 50 - (parseFloat(stats.avgPosition) || 10) * 4
    const pitBonus    = stats.avgPitStop
      ? Math.max(0, (3.5 - parseFloat(stats.avgPitStop)) * 15)
      : 0

    return powerBonus + winsBonus + pointsBonus + posBonus + pitBonus
  }

  let score1 = baseScore(stats1)
  let score2 = baseScore(stats2)

  // PASSO 2: Fattore imprevedibilità
  // indice_imprevedibilità è un valore da 0.00 a 1.00 inserito dall'admin
  // 0.00 = circuito prevedibile, 1.00 = massima imprevedibilità
  const unpredictability = parseFloat(circuitInfo?.unpredictability) || 0.30
  // Convertiamo in "pool di punti" che nessuno dei due team vince
  const unpredictabilityPool = unpredictability * 100

  // Analisi testuale circuito
  const tipologia = circuitInfo?.tipologia || 'permanente'
  let circuitAnalysis = ''
  if (tipologia === 'cittadino') {
    circuitAnalysis = `${circuit} è un circuito cittadino con alta imprevedibilità (${(unpredictability*100).toFixed(0)}%). Favorisce team con ottima gestione gomme.`
  } else if (tipologia === 'misto') {
    circuitAnalysis = `${circuit} è un circuito misto. Imprevedibilità media (${(unpredictability*100).toFixed(0)}%).`
  } else {
    circuitAnalysis = `${circuit} è un circuito permanente. Imprevedibilità contenuta (${(unpredictability*100).toFixed(0)}%).`
  }

  // Aggiungi info sull'indice potenza se disponibile
  if (stats1.powerIndex || stats2.powerIndex) {
    circuitAnalysis += ` Indici potenza: ${team1} ${stats1.powerIndex || '?'} — ${team2} ${stats2.powerIndex || '?'}.`
  }

  // PASSO 3: Conversione in probabilità
  const total = score1 + score2 + unpredictabilityPool

  // Quota "evento neutro" proporzionale all'imprevedibilità
  let draw = Math.round((unpredictabilityPool / total) * 100)
  draw = Math.max(5, Math.min(40, draw))  // clamp 5-40%

  const remainder = 100 - draw
  let win1 = Math.round((score1 / (score1 + score2)) * remainder)
  let win2  = remainder - win1

  //PASSO 4: Affidabilità
  const racesData = (parseInt(stats1.racesPlayed) || 0) + (parseInt(stats2.racesPlayed) || 0)
  let reliability = 'Bassa (dati insufficienti)'
  if (racesData >= 20) reliability = `Alta (${78 - Math.round(unpredictability*10)}%) — Dati stagione 2025 completi`
  else if (racesData >= 10) reliability = 'Media (62%) — Dati parziali'

  return {
    win_team1:      win1,
    draw:           draw,
    win_team2:      win2,
    analysis:       circuitAnalysis,
    circuit_factor: `Indice imprevedibilità ${circuit}: ${(unpredictability*100).toFixed(0)}%`,
    reliability,
    debug: {
      score1: Math.round(score1),
      score2: Math.round(score2),
      unpredictabilityPool: Math.round(unpredictabilityPool),
      powerIndex1: stats1.powerIndex,
      powerIndex2: stats2.powerIndex,
    }
  }
}

module.exports = { calculatePrediction }