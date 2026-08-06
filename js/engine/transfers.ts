// Motor de Mercado de Fichajes y Negociaciones Estilo EA FC / FIFA por Pasos y Bloqueo de Ventana
// Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.

import { db } from '../data/db.js';

import type { ActionResult, Player, Position, SquadRole } from '../types.js';

/** Filtros del mercado de fichajes (getMarketPlayers) */
export interface MarketFilters {
  position?: Position | 'ALL';
  maxPrice?: number;
  minOvr?: number;
  maxAge?: number;
  name?: string;
}

/** Entrada del mercado: jugador + club y estado de bloqueo */
export type MarketPlayer = Player & { teamName: string; isLocked: boolean };

export function isTransferWindowOpen(week: number): boolean {
  return (week >= 1 && week <= 4) || (week >= 19 && week <= 22);
}

export class TransferEngine {
  /**
   * Verifica si las negociaciones con un jugador están bloqueadas en la ventana actual
   */
  static isPlayerLocked(playerId: string): boolean {
    const gameState = db.gameState!;
    if (!gameState.failedTransferPlayers) gameState.failedTransferPlayers = [];
    return gameState.failedTransferPlayers.includes(playerId);
  }

  /**
   * Bloquea a un jugador por negociación fallida hasta la siguiente ventana
   */
  static lockPlayerForCurrentWindow(playerId: string): void {
    const gameState = db.gameState!;
    if (!gameState.failedTransferPlayers) gameState.failedTransferPlayers = [];
    if (!gameState.failedTransferPlayers.includes(playerId)) {
      gameState.failedTransferPlayers.push(playerId);
    }
    db.saveGame();
  }

  /**
   * Resetea el bloqueo de negociaciones al abrir una nueva ventana (Semana 1 o Semana 19)
   */
  static resetWindowLocks(): void {
    const gameState = db.gameState!;
    gameState.failedTransferPlayers = [];
    db.saveGame();
  }

  /**
   * Obtiene los jugadores disponibles en el mercado
   */
  static getMarketPlayers(filters: MarketFilters = {}): MarketPlayer[] {
    const market: MarketPlayer[] = [];
    const userTeamId = db.gameState!.userTeamId;

    for (const teamId in db.teams) {
      if (teamId === userTeamId) continue;
      const players = db.getTeamPlayers(teamId);
      players.forEach(p => {
        let match = true;
        if (filters.position && filters.position !== 'ALL' && p.pos !== filters.position) match = false;
        if (filters.maxPrice && p.value > filters.maxPrice) match = false;
        if (filters.minOvr && p.overall < filters.minOvr) match = false;
        if (filters.maxAge && p.age > filters.maxAge) match = false;
        if (filters.name && !p.name.toLowerCase().includes(filters.name.toLowerCase())) match = false;

        if (match) {
          market.push({
            ...p,
            teamName: db.teams[teamId]?.name || 'Club Libre',
            isLocked: this.isPlayerLocked(p.id)
          });
        }
      });
    }

    return market.sort((a, b) => b.overall - a.overall);
  }

  /**
   * Evalúa la Oferta de Traspaso enviada al Club Vendedor (Paso 1)
   */
  static evaluateClubOffer(player: Player, fee: number, sellOnPct = 0): ActionResult {
    const gameState = db.gameState!;

    if (!isTransferWindowOpen(gameState.week)) {
      return { success: false, reason: 'El mercado de fichajes está cerrado.' };
    }

    if (this.isPlayerLocked(player.id)) {
      return { success: false, reason: 'Las negociaciones con este jugador o club se han roto en esta ventana.' };
    }

    if (fee > gameState.budget) {
      return { success: false, reason: 'Presupuesto de traspasos insuficiente.' };
    }

    // Ponderación de aceptación del club según valor de mercado y cláusulas
    const minAcceptableFee = player.value * 0.95;
    const bonusFromClause = (sellOnPct / 100) * player.value * 0.15;
    const totalEffectiveOffer = fee + bonusFromClause;

    if (totalEffectiveOffer >= minAcceptableFee) {
      return {
        success: true,
        message: `¡ACUERDO CON EL CLUB! ${db.teams[player.teamId]?.name || 'El club'} ha aceptado la oferta de €${(fee / 1000000).toFixed(1)}M. Procediendo a acordar condiciones con el jugador.`
      };
    } else {
      // Romper negociación para esta ventana estilo EA FC
      this.lockPlayerForCurrentWindow(player.id);
      return {
        success: false,
        breakNegotiation: true,
        reason: `🔒 NEGOCIACIÓN ROTA: El club consideró la oferta insultante (€${(fee / 1000000).toFixed(1)}M vs €${(player.value / 1000000).toFixed(1)}M valor de mercado). Se han cerrado las conversaciones hasta la próxima ventana de fichajes.`
      };
    }
  }

  /**
   * Evalúa el Contrato del Jugador y Representante (Paso 2)
   */
  static evaluateContractOffer(player: Player, transferFee: number, role: SquadRole, contractYears: number, wage: number, signingBonus = 0): ActionResult {
    const gameState = db.gameState!;

    if (wage > gameState.wageBudget) {
      return { success: false, reason: 'Presupuesto salarial insuficiente.' };
    }

    // Expectativas del jugador
    const expectedWage = Math.round(player.salary * (player.overall >= 82 ? 1.25 : 1.10));
    let score = 50;

    // Rol en plantilla
    if (role === 'Crucial' && player.overall >= 80) score += 20;
    else if (role === 'Titular Habitual') score += 15;
    else if (role === 'Rotación' && player.overall < 78) score += 10;
    else if (role === 'Prospecto' && player.age <= 20) score += 15;

    // Salario
    if (wage >= expectedWage) score += 30;
    else if (wage >= expectedWage * 0.85) score += 15;
    else score -= 25;

    // Prima de fichaje
    if (signingBonus >= player.value * 0.05) score += 15;

    if (score >= 60) {
      // ¡Fichaje Exitoso!
      gameState.budget -= transferFee;
      gameState.wageBudget -= wage;

      const sellerPlayers = db.getTeamPlayers(player.teamId);
      const idx = sellerPlayers.findIndex(p => p.id === player.id);
      if (idx !== -1) sellerPlayers.splice(idx, 1);

      player.teamId = gameState.userTeamId;
      player.salary = wage;
      player.contractYears = contractYears;
      player.squadRole = role;

      db.getTeamPlayers(gameState.userTeamId).push(player);

      gameState.eventsLog.unshift({
        date: `Semana ${gameState.week}`,
        text: `📝 FICHAJE OFICIAL: ${player.name} se une al equipo firmando por ${contractYears} años con salario de €${(wage / 1000).toFixed(0)}K/sem.`
      });

      db.saveGame();

      return {
        success: true,
        message: `¡FICHAJE COMPLETADO! ${player.name} estampó su firma en el contrato por ${contractYears} temporadas.`
      };
    } else {
      // Romper negociación estilo EA FC
      this.lockPlayerForCurrentWindow(player.id);
      return {
        success: false,
        breakNegotiation: true,
        reason: `🔒 NEGOCIACIÓN ROTA: El representante y el jugador rechazaron las condiciones de rol (${role}) o salario (€${(wage / 1000).toFixed(0)}K vs €${(expectedWage / 1000).toFixed(0)}K exigidos). No aceptarán más ofertas en esta ventana.`
      };
    }
  }
}
