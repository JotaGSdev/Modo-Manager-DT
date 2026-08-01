// Motor de Mercado de Fichajes y Negociaciones Limitar a 2 Ventanas por Temporada

import { db } from '../data/db.js';
import { ProbabilityEngine } from './probability.js';

export function isTransferWindowOpen(week) {
  return (week >= 1 && week <= 4) || (week >= 19 && week <= 22);
}

export class TransferEngine {
  /**
   * Obtiene todos los jugadores disponibles para fichar en el mercado
   */
  static getMarketPlayers(filters = {}) {
    const market = [];
    const userTeamId = db.gameState.userTeamId;

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
            teamName: db.teams[teamId]?.name || 'Club Libre'
          });
        }
      });
    }

    return market.sort((a, b) => b.overall - a.overall);
  }

  /**
   * Negocia el fichaje de un jugador respetando la ventana activa
   */
  static submitOffer(player, transferFee, wageOffer) {
    const userState = db.gameState;

    // Verificar si la ventana de fichajes está abierta
    if (!isTransferWindowOpen(userState.week)) {
      return { success: false, reason: 'El mercado de fichajes se encuentra CERRADO. Solo se permite negociar en las semanas 1-4 (Verano) y 19-22 (Invierno).' };
    }

    const userTeam = db.teams[userState.userTeamId];
    const sellingTeam = db.teams[player.teamId] || { reputation: 70 };

    if (transferFee > userState.budget) {
      return { success: false, reason: 'Presupuesto de traspasos insuficiente.' };
    }
    if (wageOffer > userState.wageBudget) {
      return { success: false, reason: 'Presupuesto salarial insuficiente.' };
    }

    const tablePos = userState.standings.findIndex(s => s.teamId === userTeam.id) + 1;
    const trophyCount = userState.trophies.length;

    const successProb = ProbabilityEngine.calculateTransferChance(
      player, userTeam, sellingTeam, transferFee, wageOffer, tablePos || 5, trophyCount
    );

    const rivalBid = ProbabilityEngine.generateRivalCounterOffer(player, transferFee);

    const roll = Math.floor(Math.random() * 100);
    const isAccepted = roll < successProb && (!rivalBid || rivalBid.offerAmount <= transferFee * 1.15);

    if (isAccepted) {
      userState.budget -= transferFee;
      userState.wageBudget -= wageOffer;

      const sellerPlayers = db.getTeamPlayers(player.teamId);
      const idx = sellerPlayers.findIndex(p => p.id === player.id);
      if (idx !== -1) sellerPlayers.splice(idx, 1);

      player.teamId = userTeam.id;
      player.salary = wageOffer;
      db.getTeamPlayers(userTeam.id).push(player);

      db.saveGame();

      return {
        success: true,
        chance: successProb,
        message: `¡ACUERDO CERRADO! ${player.name} se une a ${userTeam.name} por €${(transferFee / 1000000).toFixed(1)}M.`
      };
    } else {
      let failMsg = `Oferta rechazada (${successProb}% de probabilidad). `;
      if (rivalBid) {
        failMsg += `${rivalBid.rivalName} ha superado tu oferta con €${(rivalBid.offerAmount / 1000000).toFixed(1)}M.`;
      } else {
        failMsg += `El club o el jugador exigían mejores condiciones económicas.`;
      }

      return {
        success: false,
        chance: successProb,
        rivalBid: rivalBid,
        reason: failMsg
      };
    }
  }
}
