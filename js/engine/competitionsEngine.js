// Motor de Copas Nacionales y Competiciones Continentales (Champions League, Libertadores, CONCACAF)

import { db } from '../data/db.js';
import { ProbabilityEngine } from './probability.js';

export class CompetitionsEngine {
  /**
   * Obtiene la copa continental correspondiente según la región de la liga
   */
  static getRegionalCupName(region) {
    if (region === 'Europa') return 'UEFA Champions League';
    if (region === 'Sudamérica') return 'Copa CONMEBOL Libertadores';
    if (region === 'Norteamérica') return 'CONCACAF Champions Cup';
    return 'Copa Continental';
  }

  /**
   * Procesa una fecha de Copa Continental o Nacional si la semana actual es de copa (Semanas 6, 12, 18, 24, 30, 36)
   */
  static processCupWeek(week) {
    const cupWeeks = [6, 12, 18, 24, 30, 36];
    if (!cupWeeks.includes(week)) return null;

    const gameState = db.gameState;
    const userTeam = db.teams[gameState.userTeamId];
    const userLeague = db.leagues.find(l => l.id === userTeam.leagueId) || { region: 'Europa' };
    const cupName = this.getRegionalCupName(userLeague.region);

    // Determinar rival aleatorio de mayor/menor reputación en la copa
    const otherLeagues = db.leagues.filter(l => l.region === userLeague.region || l.id !== userLeague.id);
    let potentialRivals = [];
    otherLeagues.forEach(l => potentialRivals.push(...l.teams));
    potentialRivals = potentialRivals.filter(t => t.id !== userTeam.id);

    const rival = potentialRivals[Math.floor(Math.random() * potentialRivals.length)] || { name: 'Rival Continental FC', overall: 76 };

    // Simular resultado de copa basado en overalls
    const probs = ProbabilityEngine.calculateMatchProbabilities(userTeam.overall, rival.overall);
    const isWin = Math.random() * 100 < (probs.homeWinProb + probs.drawProb * 0.5);

    let prize = 2500000; // €2.5M por partido de copa
    if (week === 36 && isWin) prize = 25000000; // €25M por ser Campeón de Copa

    gameState.budget += prize;

    const resultMsg = isWin 
      ? `🏆 ${cupName}: ¡VICTORIA! ${userTeam.name} superó a ${rival.name}. Premio acumulado: +€${(prize / 1000000).toFixed(1)}M al presupuesto.`
      : `⚽ ${cupName}: Caída por la mínima ante ${rival.name}. Premio de participación: +€${(prize / 1000000).toFixed(1)}M.`;

    gameState.eventsLog.unshift({
      date: `Semana ${week} (${seasonLabel(gameState.season)})`,
      text: resultMsg
    });

    db.saveGame();

    return {
      cupName,
      rivalName: rival.name,
      isWin,
      prize,
      msg: resultMsg
    };
  }
}

function seasonLabel(year) {
  return `${year}/${year + 1}`;
}
