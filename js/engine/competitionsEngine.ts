// Motor de Competiciones Domésticas y Continentales (Apertura, Clausura, Copas Nacionales y Torneos Internacionales)
// Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.

import { db } from '../data/db.js';
import { getNationalCupRoundPrize, getContinentalCupInfo } from '../data/leaguePrizes.js';

import type { ContinentalCupResult, CupPhase, NationalCupResult } from '../types.js';

// Diccionario de Copas Nacionales por País
const NATIONAL_CUPS: Record<string, string> = {
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
  static getNationalCupName(country: string): string {
    return NATIONAL_CUPS[country] || `Copa Nacional de ${country || 'Fútbol'}`;
  }

  /**
   * Inicializa las fases por defecto para el carrusel de copas si no existen en la partida
   */
  static initCupProgressIfMissing(): void {
    const gameState = db.gameState;
    if (!gameState) return;

    const userTeam = db.teams[gameState.userTeamId];
    const country = userTeam ? userTeam.country : 'Argentina';
    const region = userTeam ? userTeam.region : 'Sudamérica';

    const cupName = this.getNationalCupName(country || '');

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
  static processNationalCupWeek(weekNumber: number): NationalCupResult | null {
    const cupWeeks = [10, 18, 26, 34];
    if (!cupWeeks.includes(weekNumber)) return null;

    const gameState = db.gameState;
    if (!gameState) return null;

    this.initCupProgressIfMissing();

    const userTeam = db.teams[gameState.userTeamId];
    if (!userTeam) return null;

    const cupName = this.getNationalCupName(userTeam.country || '');
    const roundIndex = cupWeeks.indexOf(weekNumber) + 1;

    let roundLabel = `Octavos de Final`;
    if (roundIndex === 2) roundLabel = 'Cuartos de Final';
    else if (roundIndex === 3) roundLabel = 'Semifinal';
    else if (roundIndex === 4) roundLabel = 'GRAN FINAL NACIONAL';

    // Verificar si ya fue eliminado en una fase anterior
    const prevPhase = gameState.nationalCupProgress!.find(p => p.phaseIndex === roundIndex - 1);
    if (prevPhase && prevPhase.status === 'ELIMINADO') {
      const currentSlot = gameState.nationalCupProgress!.find(p => p.phaseIndex === roundIndex);
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

    // v3.9: la copa nacional escala con la riqueza de la liga (en Brasil la
    // Copa do Brasil paga más que la liga; en ligas pequeñas reparte poco).
    let prize = getNationalCupRoundPrize(userTeam.leagueId, roundIndex);
    let matchText = '';

    const currentSlot: CupPhase = gameState.nationalCupProgress!.find(p => p.phaseIndex === roundIndex) || {
      phaseIndex: roundIndex,
      week: weekNumber,
      phaseName: roundLabel,
      cupName: cupName,
      status: 'PENDIENTE',
      score: '- -',
      rivalName: 'Rival por definir'
    };
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
  static processCupWeek(weekNumber: number): ContinentalCupResult | null {
    const cupWeeks = [6, 12, 18, 24, 30, 36];
    if (!cupWeeks.includes(weekNumber)) return null;

    const gameState = db.gameState;
    if (!gameState) return null;

    this.initCupProgressIfMissing();

    const userTeam = db.teams[gameState.userTeamId];
    if (!userTeam) return null;

    const region = userTeam.region || 'Sudamérica';
    const cont = getContinentalCupInfo(region);
    const cupName = cont.name;

    const roundIndex = cupWeeks.indexOf(weekNumber) + 1;
    let roundLabel = `Fase de Grupos - J${roundIndex}`;
    if (roundIndex === 4) roundLabel = 'Cuartos de Final';
    else if (roundIndex === 5) roundLabel = 'Semifinal';
    else if (roundIndex === 6) roundLabel = 'GRAN FINAL CONTINENTAL';

    // Verificar si fue eliminado en fase eliminatoria (Cuartos o Semis)
    if (roundIndex > 3) {
      const prevPhase = gameState.continentalCupProgress!.find(p => p.phaseIndex === roundIndex - 1);
      if (prevPhase && prevPhase.status === 'ELIMINADO') {
        const currentSlot = gameState.continentalCupProgress!.find(p => p.phaseIndex === roundIndex);
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

    const isGroupStage = roundIndex <= 3;
    const isKnockout = roundIndex === 4 || roundIndex === 5;
    const isFinal = roundIndex === 6;

    // v3.12 — PREMIO POR ETAPAS (real CONMEBOL): jugar la Fase de Grupos
    // garantiza ~$3M (se paga en la J1, gane o pierda), cada victoria de grupo
    // paga ~$340K, cuartos/semis un bono menor y el título embolsa $25M.
    const breakdown = { entry: 0, groupWin: 0, knockoutWin: 0, finalPrize: 0 };
    const fmtEuro = (v: number): string =>
      v >= 1_000_000 ? `€${(v / 1_000_000).toFixed(1)}M` : `€${(v / 1_000).toFixed(0)}K`;

    if (isGroupStage && roundIndex === 1) breakdown.entry = cont.groupEntryPrize; // garantizado
    if (userGoals > rivalGoals && isGroupStage) breakdown.groupWin = cont.groupWinPrize;
    if (userGoals > rivalGoals && isKnockout) breakdown.knockoutWin = cont.knockoutWinPrize;
    if (userGoals > rivalGoals && isFinal) breakdown.finalPrize = cont.finalPrize;
    const reward = breakdown.entry + breakdown.groupWin + breakdown.knockoutWin + breakdown.finalPrize;
    gameState.budget += reward;

    // ── Noticias en The Feed (v3.12): cada pago por etapa se anuncia ──────
    if (reward > 0) {
      const feedParts: string[] = [];
      if (breakdown.entry > 0) feedParts.push(`${fmtEuro(breakdown.entry)} por jugar la Fase de Grupos`);
      if (breakdown.groupWin > 0) feedParts.push(`${fmtEuro(breakdown.groupWin)} por la victoria de grupo`);
      if (breakdown.knockoutWin > 0) feedParts.push(`${fmtEuro(breakdown.knockoutWin)} por avanzar de ronda`);
      if (breakdown.finalPrize > 0) feedParts.push(`${fmtEuro(breakdown.finalPrize)} por el título`);
      if (!Array.isArray(gameState.feedItems)) gameState.feedItems = [];
      gameState.feedItems.unshift({
        id: `cont_prize_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        week: weekNumber,
        season: gameState.season,
        type: 'PREMIOS_CONTINENTAL',
        text: userGoals > rivalGoals && isFinal
          ? `🥇 ¡CAMPEÓN CONTINENTAL! ${userTeam.name} conquistó la ${cupName} (+${fmtEuro(reward)}) y embolsa ${fmtEuro(cont.finalPrize)} por el título.`
          : `🌎 ${cupName} (${roundLabel}): ${userTeam.name} recibe ${feedParts.join(' + ')} (+${fmtEuro(reward)}).`,
        icon: userGoals > rivalGoals && isFinal ? '🥇' : '🌎',
        isRead: false,
        linkedPlayerId: null
      });
      if (gameState.feedItems.length > 50) gameState.feedItems = gameState.feedItems.slice(0, 50);
    }

    let matchText = '';

    const currentSlot: CupPhase = gameState.continentalCupProgress!.find(p => p.phaseIndex === roundIndex) || {
      phaseIndex: roundIndex,
      week: weekNumber,
      phaseName: roundLabel,
      cupName: cupName,
      status: 'PENDIENTE',
      score: '- -',
      rivalName: 'Rival Continental'
    };
    currentSlot.cupName = cupName;
    currentSlot.phaseName = roundLabel;
    currentSlot.rivalName = rivalName;
    currentSlot.score = `${userGoals} - ${rivalGoals}`;

    if (userGoals > rivalGoals) {
      currentSlot.status = isFinal ? 'CAMPEÓN' : 'CLASIFICADO';
      matchText = `🏆 ${cupName} (${roundLabel}): ¡VICTORIA! ${userTeam.name} ${userGoals} - ${rivalGoals} ${rivalName}${reward > 0 ? ` (+${fmtEuro(reward)})` : ''}`;
      if (isFinal) {
        matchText = `🥇 ¡CAMPEÓN CONTINENTAL! ${userTeam.name} conquistó la ${cupName} (+${fmtEuro(reward)})`;
        gameState.trophies = gameState.trophies || [];
        gameState.trophies.push({
          title: `${cupName} - Campeón`,
          season: `${gameState.season}/${gameState.season + 1}`
        });
      }
    } else {
      currentSlot.status = isGroupStage ? 'DERROTA' : 'ELIMINADO';
      // Aun perdiendo la J1, clasificar a la Fase de Grupos ya aseguró premio.
      matchText = `🏆 ${cupName} (${roundLabel}): ${userTeam.name} ${userGoals} - ${rivalGoals} ${rivalName}${breakdown.entry > 0 ? ` (+${fmtEuro(breakdown.entry)} por jugar la Fase de Grupos)` : ''}`;
    }

    gameState.eventsLog.unshift({
      date: `Semana ${weekNumber}`,
      text: matchText
    });

    db.saveGame();
    return { cupName, roundLabel, userGoals, rivalGoals, reward, breakdown };
  }
}
