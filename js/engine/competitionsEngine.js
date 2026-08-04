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
   * Inicializa las fases por defecto para el carrusel de copas si no existen en la partida
   */
  static initCupProgressIfMissing() {
    const gameState = db.gameState;
    if (!gameState) return;

    const userTeam = db.teams[gameState.userTeamId];
    const country = userTeam ? userTeam.country : 'Argentina';
    const region = userTeam ? userTeam.region : 'Sudamérica';

    const cupName = this.getNationalCupName(country);

    let contCupName = 'Copa CONMEBOL Libertadores';
    if (region === 'Europa') contCupName = 'UEFA Champions League';
    else if (region === 'Norteamérica') contCupName = 'Concacaf Champions Cup';

    if (!gameState.nationalCupProgress || gameState.nationalCupProgress.length === 0) {
      gameState.nationalCupProgress = [
        { phaseIndex: 1, week: 10, phaseName: 'Octavos de Final', cupName: cupName, status: 'PENDIENTE', score: '- -', rivalName: 'Rival por definir' },
        { phaseIndex: 2, week: 18, phaseName: 'Cuartos de Final', cupName: cupName, status: 'PENDIENTE', score: '- -', rivalName: 'Rival por definir' },
        { phaseIndex: 3, week: 26, phaseName: 'Semifinal', cupName: cupName, status: 'PENDIENTE', score: '- -', rivalName: 'Rival por definir' },
        { phaseIndex: 4, week: 34, phaseName: 'GRAN FINAL', cupName: cupName, status: 'PENDIENTE', score: '- -', rivalName: 'Rival por definir' }
      ];
    }

    if (!gameState.continentalCupProgress || gameState.continentalCupProgress.length === 0) {
      gameState.continentalCupProgress = [
        { phaseIndex: 1, week: 6, phaseName: 'Fase de Grupos - J1', cupName: contCupName, status: 'PENDIENTE', score: '- -', rivalName: 'Rival Continental' },
        { phaseIndex: 2, week: 12, phaseName: 'Fase de Grupos - J2', cupName: contCupName, status: 'PENDIENTE', score: '- -', rivalName: 'Rival Continental' },
        { phaseIndex: 3, week: 18, phaseName: 'Fase de Grupos - J3', cupName: contCupName, status: 'PENDIENTE', score: '- -', rivalName: 'Rival Continental' },
        { phaseIndex: 4, week: 24, phaseName: 'Cuartos de Final', cupName: contCupName, status: 'PENDIENTE', score: '- -', rivalName: 'Rival Continental' },
        { phaseIndex: 5, week: 30, phaseName: 'Semifinal', cupName: contCupName, status: 'PENDIENTE', score: '- -', rivalName: 'Rival Continental' },
        { phaseIndex: 6, week: 36, phaseName: 'GRAN FINAL', cupName: contCupName, status: 'PENDIENTE', score: '- -', rivalName: 'Rival Continental' }
      ];
    }
  }

  /**
   * Procesa la fecha de Copa Nacional (Semanas 10, 18, 26, 34)
   */
  static processNationalCupWeek(weekNumber) {
    const cupWeeks = [10, 18, 26, 34];
    if (!cupWeeks.includes(weekNumber)) return null;

    const gameState = db.gameState;
    if (!gameState) return null;

    this.initCupProgressIfMissing();

    const userTeam = db.teams[gameState.userTeamId];
    if (!userTeam) return null;

    const cupName = this.getNationalCupName(userTeam.country);
    const roundIndex = cupWeeks.indexOf(weekNumber) + 1;

    let roundLabel = `Octavos de Final`;
    if (roundIndex === 2) roundLabel = 'Cuartos de Final';
    else if (roundIndex === 3) roundLabel = 'Semifinal';
    else if (roundIndex === 4) roundLabel = 'GRAN FINAL NACIONAL';

    // Verificar si ya fue eliminado en una fase anterior
    const prevPhase = gameState.nationalCupProgress.find(p => p.phaseIndex === roundIndex - 1);
    if (prevPhase && prevPhase.status === 'ELIMINADO') {
      const currentSlot = gameState.nationalCupProgress.find(p => p.phaseIndex === roundIndex);
      if (currentSlot) {
        currentSlot.status = 'ELIMINADO';
        currentSlot.score = 'N/A';
        currentSlot.rivalName = 'Sin participación';
      }
      return null;
    }

    const isVictory = Math.random() < 0.62;
    const userGoals = isVictory ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 2);
    const rivalGoals = isVictory ? Math.max(0, userGoals - (Math.floor(Math.random() * 2) + 1)) : userGoals + Math.floor(Math.random() * 2) + 1;

    const rivalName = `Rival Nacional (OVR ${userTeam.overall + (Math.floor(Math.random() * 7) - 3)})`;

    let prize = 500000 * roundIndex;
    let matchText = '';

    const currentSlot = gameState.nationalCupProgress.find(p => p.phaseIndex === roundIndex) || {};
    currentSlot.cupName = cupName;
    currentSlot.phaseName = roundLabel;
    currentSlot.rivalName = rivalName;
    currentSlot.score = `${userGoals} - ${rivalGoals}`;

    if (userGoals > rivalGoals) {
      gameState.budget += prize;
      currentSlot.status = (roundIndex === 4) ? 'CAMPEÓN' : 'CLASIFICADO';
      matchText = `🏆 ${cupName} (${roundLabel}): ¡VICTORIA! ${userTeam.name} ${userGoals} - ${rivalGoals} ${rivalName} (+€${(prize / 1000).toFixed(0)}K)`;
      if (roundIndex === 4) {
        matchText = `🥇 ¡CAMPEÓN NACIONAL! ${userTeam.name} conquistó la ${cupName} (+€${(prize / 1000000).toFixed(1)}M)`;
        gameState.trophies = gameState.trophies || [];
        gameState.trophies.push({
          title: `${cupName} - Campeón`,
          season: `${gameState.season}/${gameState.season + 1}`
        });
      }
    } else {
      currentSlot.status = 'ELIMINADO';
      matchText = `🏆 ${cupName} (${roundLabel}): Eliminado ${userTeam.name} ${userGoals} - ${rivalGoals} ${rivalName}`;
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

    this.initCupProgressIfMissing();

    const userTeam = db.teams[gameState.userTeamId];
    if (!userTeam) return null;

    const region = userTeam.region || 'Sudamérica';
    let cupName = 'Copa CONMEBOL Libertadores';
    let prizePerMatch = 2500000;
    let finalPrize = 25000000;

    if (region === 'Europa') {
      cupName = 'UEFA Champions League';
      prizePerMatch = 3500000;
      finalPrize = 35000000;
    } else if (region === 'Norteamérica') {
      cupName = 'Copa de Campeones de la CONCACAF';
      prizePerMatch = 1800000;
      finalPrize = 15000000;
    }

    const roundIndex = cupWeeks.indexOf(weekNumber) + 1;
    let roundLabel = `Fase de Grupos - J${roundIndex}`;
    if (roundIndex === 4) roundLabel = 'Cuartos de Final';
    else if (roundIndex === 5) roundLabel = 'Semifinal';
    else if (roundIndex === 6) roundLabel = 'GRAN FINAL CONTINENTAL';

    // Verificar si fue eliminado en fase eliminatoria (Cuartos o Semis)
    if (roundIndex > 3) {
      const prevPhase = gameState.continentalCupProgress.find(p => p.phaseIndex === roundIndex - 1);
      if (prevPhase && prevPhase.status === 'ELIMINADO') {
        const currentSlot = gameState.continentalCupProgress.find(p => p.phaseIndex === roundIndex);
        if (currentSlot) {
          currentSlot.status = 'ELIMINADO';
          currentSlot.score = 'N/A';
          currentSlot.rivalName = 'Sin participación';
        }
        return null;
      }
    }

    const isVictory = Math.random() < 0.65;
    const userGoals = isVictory ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 2);
    const rivalGoals = isVictory ? Math.max(0, userGoals - (Math.floor(Math.random() * 2) + 1)) : userGoals + Math.floor(Math.random() * 2) + 1;

    const rivalName = `Rival Continental (OVR ${userTeam.overall + (Math.floor(Math.random() * 9) - 4)})`;

    let reward = 0;
    let matchText = '';

    const currentSlot = gameState.continentalCupProgress.find(p => p.phaseIndex === roundIndex) || {};
    currentSlot.cupName = cupName;
    currentSlot.phaseName = roundLabel;
    currentSlot.rivalName = rivalName;
    currentSlot.score = `${userGoals} - ${rivalGoals}`;

    if (userGoals > rivalGoals) {
      reward = prizePerMatch;
      if (roundIndex === 6) reward += finalPrize;
      gameState.budget += reward;

      currentSlot.status = (roundIndex === 6) ? 'CAMPEÓN' : 'CLASIFICADO';

      matchText = `🏆 ${cupName} (${roundLabel}): ¡VICTORIA! ${userTeam.name} ${userGoals} - ${rivalGoals} ${rivalName} (+€${(reward / 1000000).toFixed(1)}M)`;
      if (roundIndex === 6) {
        matchText = `🥇 ¡CAMPEÓN CONTINENTAL! ${userTeam.name} conquistó la ${cupName} (+€${(reward / 1000000).toFixed(1)}M)`;
        gameState.trophies = gameState.trophies || [];
        gameState.trophies.push({
          title: `${cupName} - Campeón`,
          season: `${gameState.season}/${gameState.season + 1}`
        });
      }
    } else {
      currentSlot.status = (roundIndex <= 3) ? 'DERROTA' : 'ELIMINADO';
      matchText = `🏆 ${cupName} (${roundLabel}): ${userTeam.name} ${userGoals} - ${rivalGoals} ${rivalName}`;
    }

    gameState.eventsLog.unshift({
      date: `Semana ${weekNumber}`,
      text: matchText
    });

    db.saveGame();
    return { cupName, roundLabel, userGoals, rivalGoals, reward };
  }
}
