// Vista de Evaluación de Contrato y Selección de Ofertas de Clubes

import { db } from '../data/db.js';
import { ContractEngine } from '../engine/contracts.js';
import { sfx } from '../../assets/audio/sfx.js';

export function renderContractView(container, navigateTo) {
  const gameState = db.gameState;
  let contract = ContractEngine.evaluatePerformance();

  if (!contract) {
    contract = ContractEngine.startClubContract(gameState.userTeamId, 3);
  }

  const team = db.teams[gameState.userTeamId];

  container.innerHTML = `
    <div class="contract-layout">
      <div class="glass-panel text-center mb-4">
        <h2>📜 Informe de Evaluación de Contrato & Directiva</h2>
        <p class="text-sub">Duración del Vinculo: <strong>${contract.yearsRemaining} de ${contract.duration} Años Restantes</strong></p>
      </div>

      <!-- KPIs del Contrato -->
      <div class="dashboard-grid">
        <div class="card glass-panel">
          <h3>🏆 Resultados Deportivos</h3>
          <p class="text-sub">Objetivo de la Directiva: <strong>Top ${contract.targetPosition}</strong></p>
          <div class="stat-box mt-3">
            <span class="lbl">PUNTUACIÓN DEPORTIVA</span>
            <span class="val stat-ovr">${contract.sportingScore} / 100</span>
          </div>
        </div>

        <div class="card glass-panel">
          <h3>📣 Satisfacción de la Afición</h3>
          <p class="text-sub">Respaldo de los Hinchas en el Estadio</p>
          <div class="stat-box mt-3">
            <span class="lbl">APROBACIÓN</span>
            <span class="val stat-ovr">${contract.fanSatisfaction}%</span>
          </div>
        </div>

        <div class="card glass-panel">
          <h3>💰 Balance Económico</h3>
          <p class="text-sub">Gestión del Presupuesto Salarial</p>
          <div class="stat-box mt-3">
            <span class="lbl">SALUD FINANCIERA</span>
            <span class="val stat-ovr">${contract.financialBalance} / 100</span>
          </div>
        </div>

        <div class="card glass-panel">
          <h3>👔 Confianza de la Directiva</h3>
          <p class="text-sub">Probabilidad de Renovación</p>
          <div class="stat-box mt-3">
            <span class="lbl">PROBABILIDAD RENOVACIÓN</span>
            <span class="val text-highlight" style="font-size: 1.4rem;">${contract.renewalChance}%</span>
          </div>
        </div>
      </div>

      <!-- Acciones de Contrato -->
      <div class="glass-panel text-center mt-4">
        <button id="btnRenewContract" class="btn-primary btn-large" ${contract.renewalChance < 60 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
          ✍️ SOLICITAR RENOVACIÓN DE CONTRATO (3 AÑOS MÁS)
        </button>
        <button id="btnSearchJobOffers" class="btn-secondary btn-large ml-3">💼 EXPLORAR OFERTAS DE OTROS CLUBES</button>
      </div>

      <div id="jobOffersContainer" class="mt-4 hidden"></div>
    </div>
  `;

  document.getElementById('btnRenewContract').addEventListener('click', () => {
    if (contract.renewalChance < 60) {
      alert('La directiva no está dispuesta a renovar tu contrato en este momento por falta de resultados.');
      return;
    }
    sfx.playTransferChime();
    ContractEngine.startClubContract(gameState.userTeamId, 3);
    alert(`¡CONTRATO RENOVADO! Has extendido tu vínculo con ${team.name} por 3 temporadas adicionales.`);
    renderContractView(container, navigateTo);
  });

  document.getElementById('btnSearchJobOffers').addEventListener('click', () => {
    sfx.playClick();
    const offers = ContractEngine.generateJobOffers();
    const containerEl = document.getElementById('jobOffersContainer');
    containerEl.classList.remove('hidden');

    containerEl.innerHTML = `
      <div class="glass-panel">
        <h3>💼 Ofertas de Trabajo Disponibles de Otros Clubes</h3>
        <div class="market-list mt-3">
          ${offers.map(o => `
            <div class="player-market-card">
              <div class="player-card-left">
                <div class="player-info">
                  <h4>🏰 ${o.teamName}</h4>
                  <span class="club-subtext">Duración Ofrecida: ${o.contractDuration} Años | Presupuesto: €${(o.budget / 1000000).toFixed(1)}M</span>
                </div>
              </div>

              <button class="btn-primary btn-accept-job" data-id="${o.teamId}">✍️ FIRMAR POR ESTE CLUB</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.querySelectorAll('.btn-accept-job').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const newTeamId = e.target.dataset.id;
        const newTeam = db.teams[newTeamId];
        sfx.playWhistle();

        gameState.userTeamId = newTeamId;
        gameState.userLeagueId = newTeam.leagueId;
        gameState.budget = newTeam.budget;
        gameState.wageBudget = newTeam.wageBudget;
        gameState.reputation = newTeam.reputation;

        ContractEngine.startClubContract(newTeamId, 3);
        alert(`¡NUEVO DESAFÍO! Has firmado contrato con ${newTeam.name}.`);
        navigateTo('dashboard');
      });
    });
  });
}
