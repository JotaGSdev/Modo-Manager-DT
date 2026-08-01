// Módulo de Cantera (Youth Academy) y Canteranos con Cobro Económico

import { db } from '../data/db.js';
import { ProbabilityEngine } from './probability.js';

const YOUTH_FIRST_NAMES = ['Gabriel', 'Mateo', 'Lucas', 'Thiago', 'Enzo', 'Agustín', 'Joaquín', 'Ignacio', 'Santino', 'Bautista'];
const YOUTH_LAST_NAMES = ['Suárez', 'Pérez', 'Gómez', 'Ríos', 'Navarro', 'Castillo', 'Vargas', 'Morales', 'Reyes', 'Mendoza'];

export class YouthAcademyEngine {
  /**
   * Genera un nuevo reporte de ojeador descontando el costo correspondiente
   */
  static scoutNewProspects(region = 'Sudamérica') {
    const gameState = db.gameState;
    const cost = region === 'Europa' ? 300000 : 200000;

    if (gameState.budget < cost) {
      return { success: false, reason: `Presupuesto insuficiente. Se requieren €${(cost/1000).toFixed(0)}K para ojear en ${region}.` };
    }

    gameState.budget -= cost;

    const prospects = [];
    const count = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const fn = YOUTH_FIRST_NAMES[Math.floor(Math.random() * YOUTH_FIRST_NAMES.length)];
      const ln = YOUTH_LAST_NAMES[Math.floor(Math.random() * YOUTH_LAST_NAMES.length)];
      const pos = ['POR', 'DFC', 'LI', 'LD', 'MCD', 'MC', 'MCO', 'EI', 'ED', 'DC'][Math.floor(Math.random() * 10)];
      
      const age = 15 + Math.floor(Math.random() * 4); // 15 - 18 años
      const ovr = 60 + Math.floor(Math.random() * 12);
      const potMin = Math.min(94, ovr + 12 + Math.floor(Math.random() * 8));
      const potMax = Math.min(96, potMin + 6 + Math.floor(Math.random() * 6));

      prospects.push({
        id: `youth_${Date.now()}_${i}`,
        name: `${fn} ${ln}`,
        pos: pos,
        age: age,
        overall: ovr,
        potential: potMax,
        potRange: `${potMin} - ${potMax}`,
        pac: ovr + Math.floor((Math.random() - 0.5) * 10),
        sho: ovr + Math.floor((Math.random() - 0.5) * 10),
        pas: ovr + Math.floor((Math.random() - 0.5) * 10),
        dri: ovr + Math.floor((Math.random() - 0.5) * 10),
        def: ovr + Math.floor((Math.random() - 0.5) * 10),
        phy: ovr + Math.floor((Math.random() - 0.5) * 10),
        value: Math.round(Math.pow(ovr, 3.1) * 1.5),
        salary: 1500,
        promotionCost: 100000
      });
    }

    if (!gameState.youthAcademy) gameState.youthAcademy = [];
    gameState.youthAcademy.push(...prospects);
    db.saveGame();

    return { success: true, prospects };
  }

  /**
   * Promociona a un juvenil cobrando la tasa de contrato del club
   */
  static promoteToFirstTeam(youthPlayer) {
    const gameState = db.gameState;
    const promotionCost = youthPlayer.promotionCost || 100000;

    if (gameState.budget < promotionCost) {
      return { success: false, reason: `Presupuesto insuficiente. Se requieren €${(promotionCost / 1000).toFixed(0)}K para el contrato profesional de ${youthPlayer.name}.` };
    }

    gameState.budget -= promotionCost;

    const userTeamId = gameState.userTeamId;
    const squad = db.getTeamPlayers(userTeamId);

    youthPlayer.teamId = userTeamId;
    youthPlayer.morale = 90;
    youthPlayer.form = 80;
    youthPlayer.appearances = 0;
    youthPlayer.seasonGoals = 0;
    squad.push(youthPlayer);

    // Remover de la cantera
    const academy = gameState.youthAcademy;
    const idx = academy.findIndex(p => p.id === youthPlayer.id);
    if (idx !== -1) academy.splice(idx, 1);

    db.saveGame();
    return { success: true, message: `¡${youthPlayer.name} ha sido promocionado por €${(promotionCost / 1000).toFixed(0)}K!` };
  }
}
