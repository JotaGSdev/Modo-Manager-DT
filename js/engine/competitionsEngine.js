// Motor de Competiciones Continentales (UEFA Champions League, CONMEBOL Libertadores y CONCACAF Champions Cup)

import { db } from '../data/db.js';
import { sfx } from '../../assets/audio/sfx.js';

export class CompetitionsEngine {
  /**
   * Procesa la fecha de Copa Continental según la región del club usuario (Semanas 6, 12, 18, 24, 30, 36)
   */
  static processCupWeek(weekNumber) {
    const cupWeeks = [6, 12, 18, 24, 30, 36];
    if (!cupWeeks.includes(weekNumber)) return null;

    const gameState = db.gameState;
    if (!gameState) return null;

    const userTeam = db.teams[gameState.userTeamId];
    if (!userTeam) return null;

    const region = userTeam.region || 'Sudamérica';
    let cupName = 'Copa CONMEBOL Libertadores';
    let prizePerMatch = 2500000; // €2.5M por victoria en Copa
    let finalPrize = 25000000;   // €25M por ser Campeón Continental

    if (region === 'Europa') {
      cupName = 'UEFA Champions League';
      prizePerMatch = 3500000;
      finalPrize = 35000000;
    } else if (region === 'Norteamérica') {
      cupName = 'Copa de Campeones de la CONCACAF';
      prizePerMatch = 1800000;
      finalPrize = 15000000;
    } else if (region === 'Centroamérica') {
      cupName = 'Copa Centroamericana de CONCACAF';
      prizePerMatch = 1200000;
      finalPrize = 10000000;
    }

    const roundIndex = cupWeeks.indexOf(weekNumber) + 1;
    let roundLabel = `Fase de Grupos - Fecha ${roundIndex}`;
    if (roundIndex === 4) roundLabel = 'Cuartos de Final';
    else if (roundIndex === 5) roundLabel = 'Semifinal Continental';
    else if (roundIndex === 6) roundLabel = 'GRAN FINAL CONTINENTAL';

    // Simulación de resultado de Copa Continental
    const isVictory = Math.random() < 0.65;
    const userGoals = isVictory ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 2);
    const rivalGoals = isVictory ? Math.max(0, userGoals - (Math.floor(Math.random() * 2) + 1)) : userGoals + Math.floor(Math.random() * 2) + 1;

    let reward = 0;
    let matchText = '';

    if (userGoals > rivalGoals) {
      reward = prizePerMatch;
      if (roundIndex === 6) reward += finalPrize;
      gameState.budget += reward;

      matchText = `🏆 ${cupName} (${roundLabel}): ¡VICTORIA! ${userTeam.name} ${userGoals} - ${rivalGoals} Rival Continental (+€${(reward / 1000000).toFixed(1)}M)`;
      if (roundIndex === 6) {
        matchText = `🥇 ¡CAMPEÓN CONTINENTAL! ${userTeam.name} conquistó la ${cupName} (+€${(reward / 1000000).toFixed(1)}M)`;
        gameState.trophies = gameState.trophies || [];
        gameState.trophies.push({
          title: `${cupName} - Campeón`,
          season: `${gameState.season}/${gameState.season + 1}`
        });
      }
    } else {
      matchText = `🏆 ${cupName} (${roundLabel}): Empate / Derrota ${userTeam.name} ${userGoals} - ${rivalGoals} Rival Continental`;
    }

    gameState.eventsLog.unshift({
      date: `Semana ${weekNumber}`,
      text: matchText
    });

    db.saveGame();
    return {
      cupName,
      roundLabel,
      userGoals,
      rivalGoals,
      reward
    };
  }
}
