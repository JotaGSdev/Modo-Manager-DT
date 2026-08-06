/**
 * ============================================================================
 * ENTRENADOR LEYENDA - MOTOR DE MERCADO DE ENTRENADORES IA (managerMarketEngine.js)
 * ============================================================================
 * v2.0 — Simula el ecosistema real de directores técnicos en las ligas del juego:
 * 1. Inicialización: Asigna un DT IA a cada equipo al comenzar la carrera.
 * 2. Evaluación periódica (cada 4 semanas): Puede despedir DTs con bajo rendimiento.
 * 3. Interinatos: Equipo sin DT asume un interino con penalización táctica.
 * 4. Contrataciones: En ventanas de fichajes se asignan nuevos DTs a equipos sin técnico.
 * 5. Generación de Ofertas: Para el DT jugador, basadas en reputación y filosofía.
 * 6. Feed: Genera noticias de cambios de DT para The Feed.
 *
 * Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.
 */

import { db } from '../data/db.js';
import { generateAIManager } from '../data/teamData.js';
import { EventsEngine } from './eventsEngine.js';

import type { AIManager, ManagerMarketJobOffer, Team } from '../types.js';

export class ManagerMarketEngine {
  /**
   * Inicializa entrenadores IA para todos los equipos de la liga del usuario.
   * Se llama al crear una nueva carrera.
   */
  static initAIManagers(): void {
    const gameState = db.gameState;
    if (!gameState || !gameState.enableManagerMarket) return;

    const userLeague = db.leagues.find(l => l.id === gameState.userLeagueId);
    if (!userLeague) return;

    userLeague.teams.forEach(team => {
      // No asignar DT IA al equipo del jugador
      if (team.id === gameState.userTeamId) return;
      if (!gameState.managerMarket.aiManagers[team.id]) {
        const teamObj = db.teams[team.id];
        gameState.managerMarket.aiManagers[team.id] = generateAIManager(team.id, teamObj?.reputation || 60);
      }
    });

    db.saveGame();
  }

  /**
   * Evalúa si algún equipo rival debe despedir a su DT IA.
   * Debe llamarse cada 4 semanas desde dashboardUI.
   * @param week - Semana actual
   */
  static evaluateAIManagerSackings(week: number): void {
    const gameState = db.gameState;
    if (!gameState || !gameState.enableManagerMarket) return;
    if (week < 8) return; // No hay despidos en las primeras 8 semanas

    const standings = gameState.standings || [];
    const totalTeams = standings.length;

    standings.forEach((standing, index) => {
      const teamId = standing.teamId;
      if (teamId === gameState.userTeamId) return;

      const manager = gameState.managerMarket.aiManagers[teamId];
      if (!manager || manager.isInterim) return;

      // Riesgo de despido: posición en los últimos 3 y más de 8 semanas jugadas
      const isBottomThree = index >= totalTeams - 3;
      const isLateInSeason = week >= 20;

      let sackProbability = 0;
      if (isBottomThree && week >= 8) sackProbability += 0.20;
      if (isBottomThree && isLateInSeason) sackProbability += 0.25;
      if (standing.points < (week * 0.6) && week >= 12) sackProbability += 0.15;

      if (Math.random() < sackProbability) {
        ManagerMarketEngine.sackAIManager(teamId, week);
      } else {
        manager.weeksInCharge = (manager.weeksInCharge || 0) + 1;
      }
    });

    gameState.managerMarket.lastRotationWeek = week;
    db.saveGame();
  }

  /**
   * Despide al DT de un equipo y asigna un interino.
   * @param teamId
   * @param week
   */
  static sackAIManager(teamId: string, week: number): void {
    const gameState = db.gameState;
    const oldManager = gameState?.managerMarket.aiManagers[teamId];
    if (!oldManager) return;

    const teamName = db.teams[teamId]?.name || teamId;

    // Notificar en The Feed
    EventsEngine.generateFeedItem('CAMBIO_DT', {
      text: `🧑‍💼 ${teamName} ha despedido a su DT ${oldManager.name} (${oldManager.archetype.replace('_', ' ')}). El club busca sustituto.`
    });

    // Asignar interino
    ManagerMarketEngine.assignInterimManager(teamId, week);
  }

  /**
   * Asigna un entrenador interino a un equipo despedido.
   * El interino dura hasta la próxima ventana de fichajes.
   * @param teamId
   * @param currentWeek
   */
  static assignInterimManager(teamId: string, currentWeek: number): void {
    const gameState = db.gameState;
    if (!gameState) return;

    const teamObj = db.teams[teamId];
    const interim = generateAIManager(teamId, (teamObj?.reputation || 60) - 15);
    interim.name = `${interim.name.split(' ')[0]!} (Interino)`;
    interim.isInterim = true;
    interim.weeksInCharge = 0;
    // El interino dura como máximo hasta la próxima ventana (semanas 19-22 o 1-4)
    interim.interimUntilWeek = currentWeek < 19 ? 19 : 1;

    gameState.managerMarket.aiManagers[teamId] = interim;

    EventsEngine.generateFeedItem('CAMBIO_DT', {
      text: `🧑‍💼 ${db.teams[teamId]?.name || teamId} designa a ${interim.name} como técnico interino hasta la próxima ventana.`
    });
  }

  /**
   * Procesa la contratación de nuevos DTs en ventanas de fichajes.
   * Los equipos con interino contratan un DT definitivo.
   */
  static processManagerHirings(): void {
    const gameState = db.gameState;
    if (!gameState || !gameState.enableManagerMarket) return;

    Object.keys(gameState.managerMarket.aiManagers).forEach(teamId => {
      const manager = gameState.managerMarket.aiManagers[teamId];
      if (manager && manager.isInterim) {
        const teamObj = db.teams[teamId];
        const newManager = generateAIManager(teamId, teamObj?.reputation || 60);
        gameState.managerMarket.aiManagers[teamId] = newManager;

        EventsEngine.generateFeedItem('CAMBIO_DT', {
          text: `🧑‍💼 ${db.teams[teamId]?.name || teamId} ha contratado a ${newManager.name} (${newManager.archetype.replace(/_/g, ' ')}) como nuevo DT.`
        });
      }
    });

    db.saveGame();
  }

  /**
   * Genera ofertas de trabajo para el DT jugador basadas en:
   * - Reputación del DT vs. nivel del club interesado
   * - Alineación filosófica: preferencia por clubes con arquetipo compatible
   * - Situación: solo ofrece si el club tiene interino o está libre
   * @returns Lista de hasta 3 ofertas
   */
  static generateManagerJobOffers(): ManagerMarketJobOffer[] {
    const gameState = db.gameState;
    if (!gameState) return [];

    const playerRep = gameState.reputation || 50;
    const playerArchetype = gameState.managerArchetype || 'GUARDIOLA';
    const offers: ManagerMarketJobOffer[] = [];

    // Buscar equipos con interinos como oportunidades de trabajo
    const interimTeams = Object.entries(gameState.managerMarket.aiManagers || {})
      .filter(([, mgr]) => mgr.isInterim)
      .map(([teamId]) => db.teams[teamId])
      .filter((t): t is Team => Boolean(t));

    // Seleccionar hasta 2 equipos con interino como ofertas prioritarias
    interimTeams.slice(0, 2).forEach(team => {
      const philosophyMatch = team.philosophy === playerArchetype;
      const repMatch = Math.abs((team.reputation || 60) - playerRep) <= 25;

      if (repMatch) {
        offers.push({
          teamId: team.id,
          teamName: team.name,
          country: team.country || '',
          teamReputation: team.reputation || 60,
          philosophyMatch,
          situation: 'interim_vacancy', // plaza libre por interino
          offerBudget: team.budget || 0,
          contractYears: 2,
          reason: philosophyMatch
            ? '✨ La filosofía del club encaja con tu estilo de juego.'
            : '📋 El club busca un técnico urgente de tu nivel de reputación.',
          urgencyLabel: '🔴 PLAZA URGENTE'
        });
      }
    });

    // Completar con ofertas generadas por reputación (como en contracts.js original)
    if (offers.length < 3) {
      const allLeagueTeams = db.leagues.flatMap(l => l.teams.map(t => ({ ...t, ...(db.teams[t.id] || {}) })));
      const eligibleTeams = allLeagueTeams.filter(t =>
        t.id !== gameState.userTeamId &&
        Math.abs((t.reputation || 60) - playerRep) <= 20 &&
        !offers.find(o => o.teamId === t.id)
      );

      const shuffled = eligibleTeams.sort(() => Math.random() - 0.5);
      shuffled.slice(0, 3 - offers.length).forEach(team => {
        offers.push({
          teamId: team.id,
          teamName: team.name,
          country: team.country || '',
          teamReputation: team.reputation || 60,
          philosophyMatch: team.philosophy === playerArchetype,
          situation: 'regular',
          offerBudget: team.budget || 0,
          contractYears: 3,
          reason: `El ${team.name} busca un DT con experiencia internacional de tu perfil.`,
          urgencyLabel: null
        });
      });
    }

    return offers.slice(0, 3);
  }

  /**
   * Devuelve la información del DT IA de un equipo rival.
   * @param teamId
   * @returns Info del DT IA o null
   */
  static getAIManagerInfo(teamId: string): AIManager | null {
    const gameState = db.gameState;
    return gameState?.managerMarket?.aiManagers?.[teamId] || null;
  }

  /**
   * Devuelve todos los DTs IA en formato de tabla para la UI.
   * @returns Filas { teamId, teamName, country, manager }
   */
  static getAllManagersTable(): { teamId: string; teamName: string; country: string; manager: AIManager }[] {
    const gameState = db.gameState;
    if (!gameState?.managerMarket?.aiManagers) return [];

    return Object.entries(gameState.managerMarket.aiManagers).map(([teamId, mgr]) => ({
      teamId,
      teamName: db.teams[teamId]?.name || teamId,
      country: db.teams[teamId]?.country || '',
      manager: mgr
    }));
  }
}
