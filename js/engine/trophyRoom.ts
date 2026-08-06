// Sistema de Palmarés Histórico, Récords y Sala de Trofeos
// Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.

import { db } from '../data/db.js';

import type { Trophy } from '../types.js';

export class TrophyRoomEngine {
  /**
   * Registra un nuevo título obtenido por el club
   */
  static recordTrophy(titleName: string, season: string, runnerUpName = 'Rival'): Trophy {
    const gameState = db.gameState!;
    if (!gameState.trophies) gameState.trophies = [];

    const trophyEntry: Trophy = {
      id: `trophy_${Date.now()}`,
      title: titleName,
      season: season,
      runnerUp: runnerUpName,
      date: new Date().toLocaleDateString('es-ES')
    };

    gameState.trophies.push(trophyEntry);
    gameState.managerScore += 250;
    gameState.reputation = Math.min(99, gameState.reputation + 2);

    db.saveGame();
    return trophyEntry;
  }

  /**
   * Obtiene las estadísticas históricas y palmarés del usuario
   */
  static getCareerSummary(): {
    managerName: string;
    teamName: string;
    currentSeason: number;
    managerScore: number;
    reputation: number;
    trophyCount: number;
    trophies: Trophy[];
  } {
    const gameState = db.gameState!;
    const trophies = gameState.trophies || [];

    return {
      managerName: gameState.managerName,
      teamName: db.teams[gameState.userTeamId]?.name || 'Equipo',
      currentSeason: gameState.season,
      managerScore: gameState.managerScore,
      reputation: gameState.reputation,
      trophyCount: trophies.length,
      trophies: trophies
    };
  }
}
