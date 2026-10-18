/**
 * ============================================================================
 * ENTRENADOR LEYENDA - MOTOR DE SIMULACIÓN DE PARTIDOS (matchEngine.js)
 * ============================================================================
 * Administra la simulación minuto a minuto de cada encuentro:
 * 1. Simulación tick-by-tick (0' a 90') con probabilidad de tiros y goles.
 * 2. Acumulación dinámica de goles esperados (xG) y tiros a portería.
 * 3. Cálculo dinámico de posesión de balón (homePossession vs awayPossession).
 * 4. Atribución automática de goles a los futbolistas de la plantilla.
 * 5. Simulación completa de los partidos de los rivales de la liga (`simulateAllRivalMatches`).
 *
 * Migrado a TypeScript (Fase 1): el flujo de eventos usa los tipos de
 * js/types.ts (MatchEvent, MatchResult, TensionOption, TacticalOrder).
 */

import { ProbabilityEngine } from './probability.js';
import { db } from '../data/db.js';
import { getRivalryInfo } from '../data/rivalries.js';
import { ManagerRPG } from './managerRPG.js';
import { AchievementsEngine } from './achievementsEngine.js';
import { PlayerFormEngine } from './playerForm.js';

import type { MatchEvent, MatchResult, PlayStyle, TacticalOrder, Team, TensionOption } from '../types.js';

export class MatchEngine {
  homeTeam: Team;
  awayTeam: Team;
  homeRating: number;
  awayRating: number;

  minute: number;
  homeScore: number;
  awayScore: number;
  homeXG: number;
  awayXG: number;
  homeShots: number;
  awayShots: number;
  homePossession: number;

  events: MatchEvent[];
  isFinished: boolean;

  // v2.0: Momentos de Tensión (Intervenciones del Mánager)
  tensionMomentsTriggered: number;
  pendingTensionMoment: MatchEvent | null;
  appliedTacticalOrder: TacticalOrder | null;

  // v4.0: Rivalidades, Entretiempo y Seguimiento de Goles
  isDerby: boolean;
  derbyName: string;
  hasHalftimeHappened: boolean;
  goalsByPlayer: Record<string, number>;

  /** xG objetivo calculados en initMatch() (asignados antes de su uso) */
  targetHomeXG!: number;
  targetAwayXG!: number;

  /**
   * Inicializa un partido entre dos equipos
   * @param homeTeam - Objeto del equipo local
   * @param awayTeam - Objeto del equipo visitante
   * @param homeRating - Valoración global (OVR) local + bonificaciones
   * @param awayRating - Valoración global (OVR) visitante
   * @param userBonus - Bonificación de moral/táctica adicional
   */
  constructor(homeTeam: Team, awayTeam: Team, homeRating: number, awayRating: number, userBonus = 0) {
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;

    // v4.0: Detección de Clásico / Derbi
    const derby = getRivalryInfo(homeTeam.id, awayTeam.id);
    this.isDerby = derby.isDerby;
    this.derbyName = derby.name || '';
    this.hasHalftimeHappened = false;
    this.goalsByPlayer = {};

    // v4.0: Talentos del DT
    const isUserMatch = db.gameState?.userTeamId === homeTeam.id || db.gameState?.userTeamId === awayTeam.id;
    let extraUserBonus = userBonus;

    if (isUserMatch && this.isDerby && ManagerRPG.hasTalent('masterclass')) {
      extraUserBonus += 2;
    }
    if (isUserMatch && ManagerRPG.hasTalent('tactical_analysis')) {
      extraUserBonus += 1;
    }

    this.homeRating = homeRating + extraUserBonus;
    this.awayRating = awayRating;

    this.minute = 0;
    this.homeScore = 0;
    this.awayScore = 0;
    this.homeXG = 0;
    this.awayXG = 0;
    this.homeShots = 0;
    this.awayShots = 0;
    this.homePossession = 50;

    this.events = [];
    this.isFinished = false;

    // v2.0: Momentos de Tensión (Intervenciones del Mánager)
    this.tensionMomentsTriggered = 0;
    this.pendingTensionMoment = null;
    this.appliedTacticalOrder = null; // 'PRESSING' | 'LOW_BLOCK' | 'COUNTER' | null

    this.initMatch();
  }

  /**
   * Configura las probabilidades iniciales y asigna apariciones a los titulares.
   */
  initMatch(): void {
    const gameState = db.gameState;
    const homeStyle: PlayStyle = gameState?.userTeamId === this.homeTeam.id ? (gameState?.tactics?.style || 'Tiki-Taka') : 'Tiki-Taka';
    const awayStyle: PlayStyle = gameState?.userTeamId === this.awayTeam.id ? (gameState?.tactics?.style || 'Tiki-Taka') : 'Contraataque';

    const probs = ProbabilityEngine.calculateMatchProbabilities(this.homeRating, this.awayRating, 0, 0, homeStyle, awayStyle);
    this.targetHomeXG = probs.homeXG;
    this.targetAwayXG = probs.awayXG;
    this.homePossession = probs.homePossession;

    // Acreditar apariciones a titulares de ambos planteles
    const homePlayers = db.getTeamPlayers(this.homeTeam.id);
    const awayPlayers = db.getTeamPlayers(this.awayTeam.id);

    homePlayers.slice(0, 11).forEach(p => p.appearances = (p.appearances || 0) + 1);
    awayPlayers.slice(0, 11).forEach(p => p.appearances = (p.appearances || 0) + 1);

    if (this.isDerby) {
      this.events.push({
        minute: 0,
        type: 'start',
        text: `[CLÁSICO] ¡PARTIDO DE MÁXIMA RIVALIDAD: ${this.derbyName.toUpperCase()}! ${this.homeTeam.name} (${homeStyle}) vs ${this.awayTeam.name} (${awayStyle}). ¡El estadio ruge de pasión!`
      });
    } else {
      this.events.push({
        minute: 0,
        type: 'start',
        text: `¡Pitazo inicial en el estadio ${this.homeTeam.stadium}! ${this.homeTeam.name} (${homeStyle}) vs ${this.awayTeam.name} (${awayStyle}).`
      });
    }
  }

  /**
   * Selecciona un goleador aleatorio de la plantilla según su posición (delanteros primero)
   * @param teamId - ID del equipo
   * @returns Nombre del goleador
   */
  getRandomScorer(teamId: string): string {
    const players = db.getTeamPlayers(teamId);
    const attackers = players.filter(p => ['DC', 'EI', 'ED', 'MCO', 'MC'].includes(p.pos));
    const pool = attackers.length > 0 ? attackers : players;
    const scorer = pool[Math.floor(Math.random() * pool.length)];

    if (scorer) {
      this.goalsByPlayer[scorer.id] = (this.goalsByPlayer[scorer.id] || 0) + 1;
      scorer.seasonGoals = (scorer.seasonGoals || 0) + 1;

      const gameState = db.gameState!;
      if (!gameState.topScorers) gameState.topScorers = [];
      const existing = gameState.topScorers.find(s => s.playerId === scorer.id);
      if (existing) {
        existing.goals++;
      } else {
        gameState.topScorers.push({
          playerId: scorer.id,
          name: scorer.name,
          teamName: db.teams[teamId]?.name || 'Club',
          goals: 1
        });
      }
      gameState.topScorers.sort((a, b) => b.goals - a.goals);
    }

    return scorer ? scorer.name : 'Delantero Star';
  }

  /**
   * Avanza 1 minuto de partido y simula si ocurre alguna ocasión o gol.
   * @returns Objeto del evento si ocurrió algo relevante en el minuto
   */
  tickMinute(): MatchEvent | null {
    if (this.isFinished) return null;

    this.minute++;

    // v4.0: Pausa estratégica de Entretiempo (Charla de Vestuario)
    if (this.minute === 45 && !this.hasHalftimeHappened) {
      this.hasHalftimeHappened = true;
      const halftimeEvent: MatchEvent = {
        minute: 45,
        type: 'halftime',
        title: 'DESCANSO — CHARLA DE ENTRETIEMPO',
        text: `Fin de los primeros 45 minutos (${this.homeScore} - ${this.awayScore}). Es momento de dar la arenga en el vestuario.`
      };
      this.events.push(halftimeEvent);
      return halftimeEvent;
    }

    const homeShotProb = (this.targetHomeXG / 90) * 1.5;
    const awayShotProb = (this.targetAwayXG / 90) * 1.5;

    // Ocasión local
    if (Math.random() < homeShotProb) {
      this.homeShots++;
      const xgGain = +(0.05 + Math.random() * 0.35).toFixed(2);
      this.homeXG = +(this.homeXG + xgGain).toFixed(2);

      if (Math.random() < xgGain * 1.4) {
        this.homeScore++;
        const scorerName = this.getRandomScorer(this.homeTeam.id);
        const event: MatchEvent = {
          minute: this.minute,
          type: 'goal_home',
          scorerName: scorerName,
          team: this.homeTeam.name,
          text: `[GOL] ¡GOOOOOOL DE ${this.homeTeam.name.toUpperCase()}! Anota ${scorerName}. (${this.homeScore} - ${this.awayScore})`
        };
        this.events.push(event);
        return event;
      } else {
        const event: MatchEvent = {
          minute: this.minute,
          type: 'shot_home',
          text: `[PELIGRO] Ocasión peligrosa de ${this.homeTeam.name}. Disparo directo atajado por el arquero.`
        };
        this.events.push(event);
        return event;
      }
    }

    // Ocasión visitante
    if (Math.random() < awayShotProb) {
      this.awayShots++;
      const xgGain = +(0.05 + Math.random() * 0.35).toFixed(2);
      this.awayXG = +(this.awayXG + xgGain).toFixed(2);

      if (Math.random() < xgGain * 1.4) {
        this.awayScore++;
        const scorerName = this.getRandomScorer(this.awayTeam.id);
        const event: MatchEvent = {
          minute: this.minute,
          type: 'goal_away',
          scorerName: scorerName,
          team: this.awayTeam.name,
          text: `[GOL] ¡GOOOOOOL DE ${this.awayTeam.name.toUpperCase()}! Remate certero de ${scorerName}. (${this.homeScore} - ${this.awayScore})`
        };
        this.events.push(event);
        return event;
      } else {
        const event: MatchEvent = {
          minute: this.minute,
          type: 'shot_away',
          text: `[POSTE] Remate potente de ${this.awayTeam.name} que se estrella en el travesaño.`
        };
        this.events.push(event);
        return event;
      }
    }

    // Pitazo final
    if (this.minute >= 90) {
      this.isFinished = true;
      const finalEvent: MatchEvent = {
        minute: 90,
        type: 'end',
        text: `[FINAL] ¡FINAL DEL PARTIDO! Resultado final: ${this.homeTeam.name} ${this.homeScore} - ${this.awayScore} ${this.awayTeam.name}.`
      };
      this.events.push(finalEvent);
      return finalEvent;
    }

    // v2.0: Chequear si se activa un Momento de Tensión (2 o 3 por partido: min 25-35, min 65-75)
    const tensionEvent = this.checkForTensionMoment();
    if (tensionEvent) {
      this.events.push(tensionEvent);
      return tensionEvent;
    }

    return null;
  }

  /**
   * Evaluá si en el minuto actual debe gatillarse un Momento de Tensión táctico.
   * @returns Objeto del evento de tensión o null
   */
  checkForTensionMoment(): MatchEvent | null {
    if (this.tensionMomentsTriggered >= 2) return null;

    const isFirstWindow = (this.minute >= 25 && this.minute <= 35 && this.tensionMomentsTriggered === 0);
    const isSecondWindow = (this.minute >= 65 && this.minute <= 75 && this.tensionMomentsTriggered === 1);

    if (isFirstWindow || isSecondWindow) {
      this.tensionMomentsTriggered++;

      const isUserHome = db.gameState?.userTeamId === this.homeTeam.id;
      const isUserBehind = isUserHome ? (this.awayScore > this.homeScore) : (this.homeScore > this.awayScore);
      const isTied = (this.homeScore === this.awayScore);

      let contextText = isTied
        ? `El partido está igualado y la batalla táctica en mitad de cancha se intensifica.`
        : (isUserBehind ? `Vas por detrás en el marcador y el rival cierra espacios.` : `Llevas la ventaja pero el rival adelanta sus líneas y presiona.`);

      const options: TensionOption[] = [
        {
          id: 'PRESSING',
          label: 'Presión Asfixiante',
          desc: '+15% Ocasiones de gol (Gasta resistencia)',
          effect: { homeShotBonus: 0.15, awayShotBonus: 0.05 }
        },
        {
          id: 'LOW_BLOCK',
          label: 'Cerrar Bloque Bajo',
          desc: '-25% Riesgo de encajar (Cede posesión)',
          effect: { awayShotBonus: -0.25, homePossessionBonus: -8 }
        },
        {
          id: 'COUNTER',
          label: 'Contraataque Directo',
          desc: '+20% Efectividad de contragolpe si recuperas',
          effect: { homeShotBonus: 0.10, awayShotBonus: 0.00 }
        }
      ];

      const tensionEvent: MatchEvent = {
        minute: this.minute,
        type: 'tension_moment',
        title: `[DECISIÓN DEL DT] MOMENTO CLAVE (${this.minute}')`,
        description: `${contextText} ¿Qué orden táctica das a tu plantilla? (Tienes 10 segundos)`,
        options
      };

      this.pendingTensionMoment = tensionEvent;
      return tensionEvent;
    }
    return null;
  }

  /**
   * Aplica la decisión del mánager tomada durante un Momento de Tensión.
   * @param optionId - 'PRESSING' | 'LOW_BLOCK' | 'COUNTER'
   */
  applyTacticalDecision(optionId: TacticalOrder): void {
    this.appliedTacticalOrder = optionId;
    const clutchMultiplier = ManagerRPG.hasTalent('clutch_master') ? 1.25 : 1.0;

    if (optionId === 'PRESSING') {
      this.targetHomeXG += 0.45 * clutchMultiplier;
      this.targetAwayXG += 0.20;
    } else if (optionId === 'LOW_BLOCK') {
      this.targetAwayXG = Math.max(0.1, this.targetAwayXG - (0.40 * clutchMultiplier));
      this.homePossession = Math.max(30, this.homePossession - 8);
    } else if (optionId === 'COUNTER') {
      this.targetHomeXG += 0.35 * clutchMultiplier;
    } else if (optionId === 'CONTROL') {
      this.homePossession = Math.min(75, this.homePossession + 8);
      this.targetAwayXG = Math.max(0.1, this.targetAwayXG - (0.25 * clutchMultiplier));
    }
    this.pendingTensionMoment = null;
  }

  /**
   * Aplica el impacto de la charla de vestuario durante el entretiempo
   */
  applyHalftimeTalk(choice: 'ATTACK' | 'DEFEND' | 'CONTROL'): void {
    const talkBonus = ManagerRPG.hasTalent('legendary_talk') ? 1.5 : 1.0;
    if (choice === 'ATTACK') {
      this.targetHomeXG += 0.30 * talkBonus;
      this.targetAwayXG += 0.10;
    } else if (choice === 'DEFEND') {
      this.targetAwayXG = Math.max(0.1, this.targetAwayXG - (0.25 * talkBonus));
    } else if (choice === 'CONTROL') {
      this.homePossession = Math.min(75, this.homePossession + (5 * talkBonus));
      this.targetHomeXG += 0.15 * talkBonus;
    }
  }

  /**
   * Orden táctica por contexto para la resolución automática de los momentos
   * de tensión en simulación rápida:
   * ganando → BLOQUE BAJO, perdiendo → PRESIÓN ALTA, empatado → CONTRAATAQUE.
   */
  private resolveContextTacticalOrder(): TacticalOrder {
    const isUserHome = db.gameState?.userTeamId === this.homeTeam.id;
    const isUserBehind = isUserHome ? (this.awayScore > this.homeScore) : (this.homeScore > this.awayScore);
    if (isUserBehind) return 'PRESSING';
    if (this.homeScore === this.awayScore) return 'COUNTER';
    return 'LOW_BLOCK';
  }

  /**
   * Simula de forma instantánea todo el partido hasta el minuto 90.
   */
  simulateFullMatch(): MatchResult {
    while (!this.isFinished) {
      const event = this.tickMinute();
      if (event && event.type === 'tension_moment') {
        this.applyTacticalDecision(this.resolveContextTacticalOrder());
      } else if (event && event.type === 'halftime') {
        const isUserBehind = db.gameState?.userTeamId === this.homeTeam.id
          ? this.awayScore > this.homeScore
          : this.homeScore > this.awayScore;
        this.applyHalftimeTalk(isUserBehind ? 'ATTACK' : 'CONTROL');
      }
    }

    MatchEngine.awardInSeasonPlayerEXP(this.homeTeam.id, this.homeScore > this.awayScore);
    MatchEngine.awardInSeasonPlayerEXP(this.awayTeam.id, this.awayScore > this.homeScore);
    MatchEngine.processPostMatchEffects(this.homeTeam.id, this.awayTeam.id, this.homeScore, this.awayScore, this.isDerby, this.goalsByPlayer);

    return {
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      homeXG: this.homeXG,
      awayXG: this.awayXG,
      homeShots: this.homeShots,
      awayShots: this.awayShots,
      homePossession: this.homePossession,
      events: this.events
    };
  }

  /**
   * Otorga EXP en tiempo real a los futbolistas titulares tras cada partido jugado
   */
  static awardInSeasonPlayerEXP(teamId: string, isWinner: boolean): void {
    const squad = db.getTeamPlayers(teamId);
    if (!squad || squad.length === 0) return;

    const baseExp = isWinner ? 18 : 10;
    const hasAccelerator = ManagerRPG.hasTalent('youth_accelerator');

    squad.slice(0, 11).forEach(p => {
      let gain = baseExp;
      if (p.seasonGoals && p.seasonGoals > 0) gain += 10;
      if (hasAccelerator && p.age <= 22) gain = Math.round(gain * 1.5);
      if (p.isWonderkid) gain = Math.round(gain * 1.2);

      p.matchExp = (p.matchExp || 0) + gain;

      if (p.matchExp >= 100) {
        p.matchExp -= 100;
        p.overall = Math.min(99, p.overall + 1);

        if (['EI', 'ED', 'DC'].includes(p.pos)) p.sho = Math.min(99, (p.sho || 70) + 2);
        else if (['MCO', 'MC', 'MI', 'MD'].includes(p.pos)) p.pas = Math.min(99, (p.pas || 70) + 2);
        else p.def = Math.min(99, (p.def || 70) + 2);

        const gameState = db.gameState;
        if (gameState && gameState.eventsLog && teamId === gameState.userTeamId) {
          gameState.eventsLog.unshift({
            date: `Semana ${gameState.week || 1}`,
            text: `[EVOLUCIÓN] ¡${p.name} alcanzó 100 EXP por su rendimiento y subió a ${p.overall} OVR!`
          });
        }
      }
    });
  }

  /**
   * Procesa los efectos post-partido: EXP de DT, Clásicos, rachas de jugadores y logros
   */
  static processPostMatchEffects(
    homeTeamId: string,
    awayTeamId: string,
    homeScore: number,
    awayScore: number,
    isDerby: boolean,
    goalsByPlayer: Record<string, number>
  ): void {
    const gameState = db.gameState;
    if (!gameState) return;

    const userTeamId = gameState.userTeamId;
    const isUserHome = userTeamId === homeTeamId;
    const isUserAway = userTeamId === awayTeamId;
    if (!isUserHome && !isUserAway) return;

    const userScore = isUserHome ? homeScore : awayScore;
    const rivalScore = isUserHome ? awayScore : homeScore;
    const userWon = userScore > rivalScore;
    const isDraw = userScore === rivalScore;
    const cleanSheet = rivalScore === 0;

    // Actualizar estados de forma y rachas de jugadores
    PlayerFormEngine.processPostMatchForm(userTeamId, goalsByPlayer, userWon, cleanSheet);

    // Conceder EXP al DT y verificar retos
    let xpGain = 0;
    if (userWon) {
      xpGain = 120;
      AchievementsEngine.checkAndUnlock('first_win', 1);

      if (cleanSheet) {
        gameState.cleanSheetStreak = (gameState.cleanSheetStreak || 0) + 1;
        AchievementsEngine.checkAndUnlock('clean_sheet_3', gameState.cleanSheetStreak);
        xpGain += 30;
      } else {
        gameState.cleanSheetStreak = 0;
      }

      if (isDerby) {
        xpGain += 250;
        gameState.classicWins = (gameState.classicWins || 0) + 1;
        AchievementsEngine.checkAndUnlock('derby_winner', 1);
        if (gameState.contract) {
          gameState.contract.boardConfidence = Math.min(100, gameState.contract.boardConfidence + 8);
          gameState.contract.fanSatisfaction = Math.min(100, (gameState.contract.fanSatisfaction || 50) + 10);
        }
      }

      if ((gameState.currentStreak || 0) >= 5) {
        AchievementsEngine.checkAndUnlock('streak_5', gameState.currentStreak || 0);
      }
      if ((gameState.currentStreak || 0) >= 10) {
        AchievementsEngine.checkAndUnlock('streak_10', gameState.currentStreak || 0);
      }
    } else if (isDraw) {
      xpGain = 45;
      gameState.cleanSheetStreak = cleanSheet ? (gameState.cleanSheetStreak || 0) + 1 : 0;
    } else {
      gameState.cleanSheetStreak = 0;
      if (isDerby && gameState.contract) {
        gameState.contract.boardConfidence = Math.max(10, gameState.contract.boardConfidence - 6);
      }
    }

    if (xpGain > 0) {
      ManagerRPG.awardXP(xpGain, userWon ? 'Victoria Oficial' : 'Empate');
    }

    // Verificar nivel del DT para logros
    const rpgState = ManagerRPG.initIfMissing();
    AchievementsEngine.checkAndUnlock('dt_level_5', rpgState.level);
    AchievementsEngine.checkAndUnlock('dt_level_15', rpgState.level);

    if (gameState.budget >= 30000000) {
      AchievementsEngine.checkAndUnlock('millionaire', Math.floor(gameState.budget / 1000000));
    }
  }

  /**
   * Simula los partidos de la jornada para todos los demás equipos rivales de la liga según probabilidades tácticas.
   * @param userTeamId - ID del equipo del usuario
   * @param rivalId - ID del rival directo en el partido en vivo
   */
  static simulateAllRivalMatches(userTeamId: string, rivalId: string): void {
    const gameState = db.gameState!;
    const standings = gameState.standings;
    if (!standings || standings.length < 2) return;

    const otherTeams = standings.filter(s => s.teamId !== userTeamId && s.teamId !== rivalId);

    for (let i = 0; i < otherTeams.length - 1; i += 2) {
      const t1Standing = otherTeams[i]!;
      const t2Standing = otherTeams[i + 1]!;

      const t1 = db.teams[t1Standing.teamId] || { overall: 74 };
      const t2 = db.teams[t2Standing.teamId] || { overall: 74 };

      const probs = ProbabilityEngine.calculateMatchProbabilities(t1.overall, t2.overall, 0, 0, 'Tiki-Taka', 'Contraataque');

      let g1 = Math.max(0, Math.round(probs.homeXG + (Math.random() * 1.6 - 0.8)));
      let g2 = Math.max(0, Math.round(probs.awayXG + (Math.random() * 1.6 - 0.8)));

      t1Standing.played = Math.min(gameState.maxWeeks || 38, t1Standing.played + 1);
      t2Standing.played = Math.min(gameState.maxWeeks || 38, t2Standing.played + 1);
      t1Standing.gf += g1; t1Standing.ga += g2; t1Standing.gd = t1Standing.gf - t1Standing.ga;
      t2Standing.gf += g2; t2Standing.ga += g1; t2Standing.gd = t2Standing.gf - t2Standing.ga;

      if (g1 > g2) {
        t1Standing.won++; t1Standing.points += 3; t2Standing.lost++;
      } else if (g1 < g2) {
        t2Standing.won++; t2Standing.points += 3; t1Standing.lost++;
      } else {
        t1Standing.drawn++; t1Standing.points += 1;
        t2Standing.drawn++; t2Standing.points += 1;
      }

      const t1Squad = db.getTeamPlayers(t1Standing.teamId);
      const t2Squad = db.getTeamPlayers(t2Standing.teamId);
      t1Squad.slice(0, 11).forEach(p => p.appearances = (p.appearances || 0) + 1);
      t2Squad.slice(0, 11).forEach(p => p.appearances = (p.appearances || 0) + 1);
      MatchEngine.awardInSeasonPlayerEXP(t1Standing.teamId, g1 > g2);
      MatchEngine.awardInSeasonPlayerEXP(t2Standing.teamId, g2 > g1);
    }
  }
}

