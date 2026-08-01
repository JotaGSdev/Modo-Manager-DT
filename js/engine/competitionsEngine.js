// Motor de Competiciones Domésticas y Continentales (Apertura, Clausura, Copas Nacionales y Torneos Internacionales)

import { db } from '../data/db.js';

// Diccionario de Copas Nacionales por País
const NATIONAL_CUPS = {
  'Perú': 'Copa Bicentenario de Perú',
  'Argentina': 'Copa Argentina',
  'Brasil': 'Copa do Brasil',
  'Colombia': 'Copa Colombia',
  'Chile': 'Copa Chile',
  'Ecuador': 'Copa Ecuador',
  'Uruguay': 'Copa AUF Uruguay',
  'Paraguay': 'Copa Paraguay',
  'Bolivia': 'Copa Bolivia',
  'Venezuela': 'Copa Venezuela',
  'España': 'Copa del Rey',
  'Inglaterra': 'Emirates FA Cup',
  'Italia': 'Coppa Italia',
  'Alemania': 'DFB-Pokal',
  'Francia': 'Coupe de France',
  'Portugal': 'Taça de Portugal',
  'Países Bajos': 'KNVB Beker',
  'Turquía': 'Türkiye Kupası',
  'Arabia Saudita': 'Copa del Rey Saudí',
  'Japón': 'Copa del Emperador',
  'Bélgica': 'Copa de Bélgica',
  'Escocia': 'Scottish Cup',
  'Austria': 'ÖFB Cup',
  'Dinamarca': 'Copa Danesa',
  'Croacia': 'Copa de Croacia',
  'Estados Unidos': 'Lamar Hunt U.S. Open Cup',
  'México': 'Copa MX',
  'Canadá': 'Canadian Championship',
  'Costa Rica': 'Copa de Costa Rica',
  'Honduras': 'Copa de Honduras',
  'Guatemala': 'Copa de Guatemala'
};

export class CompetitionsEngine {
  /**
   * Obtiene el nombre de la Copa Nacional según el país del equipo
   */
  static getNationalCupName(country) {
    return NATIONAL_CUPS[country] || `Copa Nacional de ${country || 'Fútbol'}`;
  }

  /**
   * Procesa la fecha de Copa Nacional (Semanas 10, 18, 26, 34)
   */
  static processNationalCupWeek(weekNumber) {
    const cupWeeks = [10, 18, 26, 34];
    if (!cupWeeks.includes(weekNumber)) return null;

    const gameState = db.gameState;
    if (!gameState) return null;

    const userTeam = db.teams[gameState.userTeamId];
    if (!userTeam) return null;

    const cupName = this.getNationalCupName(userTeam.country);
    const roundIndex = cupWeeks.indexOf(weekNumber) + 1;

    let roundLabel = `Octavos de Final`;
    if (roundIndex === 2) roundLabel = 'Cuartos de Final';
    else if (roundIndex === 3) roundLabel = 'Semifinal';
    else if (roundIndex === 4) roundLabel = 'GRAN FINAL NACIONAL';

    const isVictory = Math.random() < 0.62;
    const userGoals = isVictory ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 2);
    const rivalGoals = isVictory ? Math.max(0, userGoals - (Math.floor(Math.random() * 2) + 1)) : userGoals + Math.floor(Math.random() * 2) + 1;

    let prize = 500000 * roundIndex;
    let matchText = '';

    if (userGoals > rivalGoals) {
      gameState.budget += prize;
      matchText = `🏆 ${cupName} (${roundLabel}): ¡VICTORIA! ${userTeam.name} ${userGoals} - ${rivalGoals} Rival (+€${(prize / 1000).toFixed(0)}K)`;
      if (roundIndex === 4) {
        matchText = `🥇 ¡CAMPEÓN NACIONAL! ${userTeam.name} conquistó la ${cupName} (+€${(prize / 1000000).toFixed(1)}M)`;
        gameState.trophies = gameState.trophies || [];
        gameState.trophies.push({
          title: `${cupName} - Campeón`,
          season: `${gameState.season}/${gameState.season + 1}`
        });
      }
    } else {
      matchText = `🏆 ${cupName} (${roundLabel}): Eliminado ${userTeam.name} ${userGoals} - ${rivalGoals} Rival`;
    }

    gameState.eventsLog.unshift({
      date: `Semana ${weekNumber}`,
      text: matchText
    });

    db.saveGame();
    return { cupName, roundLabel, userGoals, rivalGoals, prize };
  }

  /**
   * Procesa la fecha de Copa Continental (Semanas 6, 12, 18, 24, 30, 36)
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
    let secCupName = 'Copa CONMEBOL Sudamericana';
    let prizePerMatch = 2500000;
    let finalPrize = 25000000;

    if (region === 'Europa') {
      cupName = 'UEFA Champions League';
      secCupName = 'UEFA Europa League';
      prizePerMatch = 3500000;
      finalPrize = 35000000;
    } else if (region === 'Norteamérica') {
      cupName = 'Copa de Campeones de la CONCACAF';
      secCupName = 'Leagues Cup';
      prizePerMatch = 1800000;
      finalPrize = 15000000;
    } else if (region === 'Centroamérica') {
      cupName = 'Copa Centroamericana de CONCACAF';
      secCupName = 'Copa de la UNCAF';
      prizePerMatch = 1200000;
      finalPrize = 10000000;
    }

    const roundIndex = cupWeeks.indexOf(weekNumber) + 1;
    let roundLabel = `Fase de Grupos - Fecha ${roundIndex}`;
    if (roundIndex === 4) roundLabel = 'Cuartos de Final';
    else if (roundIndex === 5) roundLabel = 'Semifinal Continental';
    else if (roundIndex === 6) roundLabel = 'GRAN FINAL CONTINENTAL';

    const isVictory = Math.random() < 0.65;
    const userGoals = isVictory ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 2);
    const rivalGoals = isVictory ? Math.max(0, userGoals - (Math.floor(Math.random() * 2) + 1)) : userGoals + Math.floor(Math.random() * 2) + 1;

    let reward = 0;
    let matchText = '';

    if (userGoals > rivalGoals) {
      reward = prizePerMatch;
      if (roundIndex === 6) reward += finalPrize;
      gameState.budget += reward;

      matchText = `🏆 ${cupName} (${roundLabel}): ¡VICTORIA! ${userTeam.name} ${userGoals} - ${rivalGoals} Rival (+€${(reward / 1000000).toFixed(1)}M)`;
      if (roundIndex === 6) {
        matchText = `🥇 ¡CAMPEÓN CONTINENTAL! ${userTeam.name} conquistó la ${cupName} (+€${(reward / 1000000).toFixed(1)}M)`;
        gameState.trophies = gameState.trophies || [];
        gameState.trophies.push({
          title: `${cupName} - Campeón`,
          season: `${gameState.season}/${gameState.season + 1}`
        });
      }
    } else {
      matchText = `🏆 ${cupName} (${roundLabel}): ${userTeam.name} ${userGoals} - ${rivalGoals} Rival`;
    }

    gameState.eventsLog.unshift({
      date: `Semana ${weekNumber}`,
      text: matchText
    });

    db.saveGame();
    return { cupName, roundLabel, userGoals, rivalGoals, reward };
  }
}
