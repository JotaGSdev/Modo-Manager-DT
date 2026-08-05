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
 */

import { ProbabilityEngine } from './probability.js';
import { db } from '../data/db.js';

export class MatchEngine {
  /**
   * Inicializa un partido entre dos equipos
   * @param {Object} homeTeam - Objeto del equipo local
   * @param {Object} awayTeam - Objeto del equipo visitante
   * @param {number} homeRating - Valoración global (OVR) local + bonificaciones
   * @param {number} awayRating - Valoración global (OVR) visitante
   * @param {number} [userBonus=0] - Bonificación de moral/táctica adicional
   */
  constructor(homeTeam, awayTeam, homeRating, awayRating, userBonus = 0) {
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.homeRating = homeRating + userBonus;
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
  initMatch() {
    const probs = ProbabilityEngine.calculateMatchProbabilities(this.homeRating, this.awayRating);
    this.targetHomeXG = probs.homeXG;
    this.targetAwayXG = probs.awayXG;
    
    const diff = this.homeRating - this.awayRating;
    this.homePossession = Math.max(35, Math.min(68, Math.round(50 + diff * 1.2)));

    // Acreditar apariciones a titulares de ambos planteles
    const homePlayers = db.getTeamPlayers(this.homeTeam.id);
    const awayPlayers = db.getTeamPlayers(this.awayTeam.id);

    homePlayers.slice(0, 11).forEach(p => p.appearances = (p.appearances || 0) + 1);
    awayPlayers.slice(0, 11).forEach(p => p.appearances = (p.appearances || 0) + 1);

    this.events.push({
      minute: 0,
      type: 'start',
      text: `¡Pitazo inicial en el estadio ${this.homeTeam.stadium}! ${this.homeTeam.name} vs ${this.awayTeam.name}.`
    });
  }

  /**
   * Selecciona un goleador aleatorio de la plantilla según su posición (delanteros primero)
   * @param {string} teamId - ID del equipo
   * @returns {string} Nombre del goleador
   */
  getRandomScorer(teamId) {
    const players = db.getTeamPlayers(teamId);
    const attackers = players.filter(p => ['DC', 'EI', 'ED', 'MCO', 'MC'].includes(p.pos));
    const pool = attackers.length > 0 ? attackers : players;
    const scorer = pool[Math.floor(Math.random() * pool.length)];

    if (scorer) {
      scorer.seasonGoals = (scorer.seasonGoals || 0) + 1;

      if (!db.gameState.topScorers) db.gameState.topScorers = [];
      const existing = db.gameState.topScorers.find(s => s.playerId === scorer.id);
      if (existing) {
        existing.goals++;
      } else {
        db.gameState.topScorers.push({
          playerId: scorer.id,
          name: scorer.name,
          teamName: db.teams[teamId]?.name || 'Club',
          goals: 1
        });
      }
      db.gameState.topScorers.sort((a, b) => b.goals - a.goals);
    }

    return scorer ? scorer.name : 'Delantero Star';
  }

  /**
   * Avanza 1 minuto de partido y simula si ocurre alguna ocasión o gol.
   * @returns {Object|null} Objeto del evento si ocurrió algo relevante en el minuto
   */
  tickMinute() {
    if (this.isFinished) return null;

    this.minute++;

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
        const event = {
          minute: this.minute,
          type: 'goal_home',
          scorerName: scorerName,
          team: this.homeTeam.name,
          text: `⚽ ¡GOOOOOOL DE ${this.homeTeam.name.toUpperCase()}! Anota ${scorerName}. (${this.homeScore} - ${this.awayScore})`
        };
        this.events.push(event);
        return event;
      } else {
        const event = {
          minute: this.minute,
          type: 'shot_home',
          text: `🔥 Ocasión peligrosa de ${this.homeTeam.name}. Disparo directo atajado por el arquero.`
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
        const event = {
          minute: this.minute,
          type: 'goal_away',
          scorerName: scorerName,
          team: this.awayTeam.name,
          text: `⚽ ¡GOOOOOOL DE ${this.awayTeam.name.toUpperCase()}! Remate certero de ${scorerName}. (${this.homeScore} - ${this.awayScore})`
        };
        this.events.push(event);
        return event;
      } else {
        const event = {
          minute: this.minute,
          type: 'shot_away',
          text: `💥 Remate potente de ${this.awayTeam.name} que se estrella en el travesaño.`
        };
        this.events.push(event);
        return event;
      }
    }

    // Pitazo final
    if (this.minute >= 90) {
      this.isFinished = true;
      const finalEvent = {
        minute: 90,
        type: 'end',
        text: `🏁 ¡FINAL DEL PARTIDO! Resultado final: ${this.homeTeam.name} ${this.homeScore} - ${this.awayScore} ${this.awayTeam.name}.`
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
   * @returns {Object|null} Objeto del evento de tensión o null
   */
  checkForTensionMoment() {
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

      const tensionEvent = {
        minute: this.minute,
        type: 'tension_moment',
        title: `⏱️ MOMENTO CLAVE (${this.minute}') — DECISIÓN DEL MÁNAGER`,
        description: `${contextText} ¿Qué orden táctica das a tu plantilla? (Tienes 10 segundos)`,
        options: [
          {
            id: 'PRESSING',
            label: '⚡ Presión Asfixiante',
            desc: '+15% Ocasiones de gol (Gasta resistencia)',
            effect: { homeShotBonus: 0.15, awayShotBonus: 0.05 }
          },
          {
            id: 'LOW_BLOCK',
            label: '🚌 Cerrar Bloque Bajo',
            desc: '-25% Riesgo de encajar (Cede posesión)',
            effect: { awayShotBonus: -0.25, homePossessionBonus: -8 }
          },
          {
            id: 'COUNTER',
            label: '🎯 Contraataque Directo',
            desc: '+20% Efectividad de contragolpe si recuperas',
            effect: { homeShotBonus: 0.10, awayShotBonus: 0.00 }
          }
        ]
      };

      this.pendingTensionMoment = tensionEvent;
      return tensionEvent;
    }
    return null;
  }

  /**
   * Aplica la decisión del mánager tomada durante un Momento de Tensión.
   * @param {string} optionId - 'PRESSING' | 'LOW_BLOCK' | 'COUNTER'
   */
  applyTacticalDecision(optionId) {
    this.appliedTacticalOrder = optionId;
    if (optionId === 'PRESSING') {
      this.targetHomeXG += 0.45;
      this.targetAwayXG += 0.20;
    } else if (optionId === 'LOW_BLOCK') {
      this.targetAwayXG = Math.max(0.1, this.targetAwayXG - 0.40);
      this.homePossession = Math.max(30, this.homePossession - 8);
    } else if (optionId === 'COUNTER') {
      this.targetHomeXG += 0.35;
    }
    this.pendingTensionMoment = null;
  }

  /**
   * Simula de forma instantánea todo el partido hasta el minuto 90.
   * @returns {Object} Resultado con marcador, xG, tiros y eventos
   */
  simulateFullMatch() {
    while (!this.isFinished) {
      this.tickMinute();
    }
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
   * Simula los partidos de la jornada para todos los demás equipos rivales de la liga.
   * @param {string} userTeamId - ID del equipo del usuario
   * @param {string} rivalId - ID del rival directo en el partido en vivo
   */
  static simulateAllRivalMatches(userTeamId, rivalId) {
    const gameState = db.gameState;
    const standings = gameState.standings;
    if (!standings || standings.length < 2) return;

    const otherTeams = standings.filter(s => s.teamId !== userTeamId && s.teamId !== rivalId);

    for (let i = 0; i < otherTeams.length - 1; i += 2) {
      const t1Standing = otherTeams[i];
      const t2Standing = otherTeams[i + 1];

      const t1 = db.teams[t1Standing.teamId] || { overall: 74 };
      const t2 = db.teams[t2Standing.teamId] || { overall: 74 };

      const probs = ProbabilityEngine.calculateMatchProbabilities(t1.overall, t2.overall);

      let g1 = 0, g2 = 0;
      const roll = Math.random() * 100;
      if (roll < 45) {
        g1 = 1 + Math.floor(Math.random() * 3);
        g2 = Math.floor(Math.random() * g1);
      } else if (roll < 75) {
        g1 = Math.floor(Math.random() * 3);
        g2 = g1;
      } else {
        g2 = 1 + Math.floor(Math.random() * 3);
        g1 = Math.floor(Math.random() * g2);
      }

      t1Standing.played++; t2Standing.played++;
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
    }
  }
}
