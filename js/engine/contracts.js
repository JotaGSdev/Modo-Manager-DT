// Motor de Contratos Laborales (3-5 Años), KPIs de Evaluación y 25 Años de Carrera

import { db } from '../data/db.js';

export class ContractEngine {
  /**
   * Inicializa o renueva el contrato laboral del DT con el club actual
   * @param {string} teamId - ID del club
   * @param {number} durationYears - Duración del contrato (3 a 5 años)
   */
  static startClubContract(teamId, durationYears = 3) {
    const gameState = db.gameState;
    const team = db.teams[teamId];
    
    // Fijar objetivo deportivo según el nivel del equipo
    let targetPos = 5;
    if (team.overall >= 84) targetPos = 1; // Campeón
    else if (team.overall >= 78) targetPos = 4; // Champions/Libertadores
    else if (team.overall >= 70) targetPos = 8; // Mitad superior
    else targetPos = 14; // Evitar descenso

    gameState.contract = {
      teamId: teamId,
      teamName: team.name,
      startYear: gameState.season,
      duration: durationYears,
      yearsRemaining: durationYears,
      targetPosition: targetPos,
      sportingScore: 85,
      fanSatisfaction: 80,
      financialBalance: 85,
      boardConfidence: 85,
      renewalChance: 85,
      status: 'ACTIVO' // ACTIVO, EN_RIESGO, RENOVADO, FINALIZADO, DESPEDIDO
    };

    db.saveGame();
    return gameState.contract;
  }

  /**
   * Evalúa los 4 KPIs de rendimiento del DT periódicamente
   */
  static evaluatePerformance() {
    const gameState = db.gameState;
    const contract = gameState.contract;
    if (!contract) return null;

    const standings = gameState.standings || [];
    const currentPos = standings.findIndex(s => s.teamId === gameState.userTeamId) + 1 || 5;

    // 1. KPI Resultados Deportivos (vs Objetivo)
    let sportingDiff = contract.targetPosition - currentPos;
    contract.sportingScore = Math.max(30, Math.min(100, Math.round(75 + sportingDiff * 6)));

    // 2. KPI Satisfacción de la Afición
    const winRatio = (standings.find(s => s.teamId === gameState.userTeamId)?.won || 0) / Math.max(1, gameState.week);
    contract.fanSatisfaction = Math.max(30, Math.min(100, Math.round(50 + winRatio * 60 + gameState.matchBonus.moraleBonus)));

    // 3. KPI Balance Económico
    const initialBudget = db.teams[gameState.userTeamId]?.budget || 10000000;
    const budgetRatio = gameState.budget / Math.max(1, initialBudget);
    contract.financialBalance = Math.max(30, Math.min(100, Math.round(70 + budgetRatio * 20)));

    // 4. Confianza Global de la Directiva
    contract.boardConfidence = Math.round(
      (contract.sportingScore * 0.40) +
      (contract.fanSatisfaction * 0.25) +
      (contract.financialBalance * 0.20) +
      (gameState.reputation * 0.15)
    );

    // Probabilidad de renovación
    contract.renewalChance = Math.max(0, Math.min(99, Math.round(contract.boardConfidence * 1.05)));

    if (contract.boardConfidence < 45) {
      contract.status = 'EN_RIESGO';
    } else {
      contract.status = 'ACTIVO';
    }

    db.saveGame();
    return contract;
  }

  /**
   * Avanza un año de contrato al finalizar la temporada
   */
  static processContractYearEnd() {
    const gameState = db.gameState;
    let contract = gameState.contract;

    if (!contract) {
      contract = this.startClubContract(gameState.userTeamId, 3);
    }

    contract.yearsRemaining--;

    // Si el contrato expiró o la directiva perdió la confianza
    if (contract.boardConfidence < 35) {
      contract.status = 'DESPEDIDO';
      gameState.eventsLog.unshift({
        date: `Año ${gameState.season}`,
        text: `⚠️ DESPIDO: La directiva de ${contract.teamName} ha rescindido tu contrato por falta de resultados.`
      });
      return { action: 'SACKED', contract };
    }

    if (contract.yearsRemaining <= 0) {
      contract.status = 'FINALIZADO';
      return { action: 'CONTRACT_EXPIRED', contract };
    }

    db.saveGame();
    return { action: 'CONTINUE', contract };
  }

  /**
   * Genera 3 ofertas de empleo de clubes interesados según la reputación del DT
   */
  static generateJobOffers() {
    const gameState = db.gameState;
    const rep = gameState.reputation || 75;
    const offers = [];

    const availableTeams = Object.values(db.teams).filter(t => t.id !== gameState.userTeamId);
    availableTeams.sort((a, b) => Math.abs(a.reputation - rep) - Math.abs(b.reputation - rep));

    for (let i = 0; i < Math.min(3, availableTeams.length); i++) {
      const t = availableTeams[i];
      offers.push({
        teamId: t.id,
        teamName: t.name,
        leagueId: t.leagueId,
        budget: t.budget,
        reputation: t.reputation,
        contractDuration: 3 + Math.floor(Math.random() * 3), // 3 - 5 años
        salary: Math.round(t.budget * 0.003)
      });
    }

    return offers;
  }
}
