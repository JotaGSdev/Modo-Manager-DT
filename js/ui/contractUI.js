// Vista de Evaluación de Contrato y Selección de Ofertas de Clubes Estilo EA FC

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
      <!-- Encabezado Directivo -->
      <div class="glass-panel mb-4" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2>📜 Evaluación del Vínculo contractual y Junta Directiva</h2>
          <p class="text-sub">Club Actual: <strong>${team.name}</strong> | Período: <strong>${contract.yearsRemaining} de ${contract.duration} Años Restantes</strong></p>
        </div>
        <div style="background: #141d2e; border: 1px solid var(--border-color); padding: 10px 20px; border-radius: 8px; text-align: center;">
          <span class="text-sub" style="font-size: 0.8rem; font-weight: 700;">OBJETIVO DE LA TEMPORADA</span>
          <h4 style="margin: 0; color: var(--accent-gold);">Quedar entre los Top ${contract.targetPosition}</h4>
        </div>
      </div>

      <!-- KPIs del Contrato con Barras de Progreso -->
      <div class="dashboard-grid">
        <div class="card glass-panel">
          <h3>🏆 Resultados Deportivos</h3>
          <p class="text-sub">Puntuación en Liga y Competiciones</p>
          <div class="prob-container">
            <div class="prob-bar-track">
              <div class="prob-bar-fill" style="width: ${contract.sportingScore}%;"></div>
              <div class="prob-bar-text">${contract.sportingScore} / 100 PTS</div>
            </div>
          </div>
        </div>

        <div class="card glass-panel">
          <h3>📣 Aprobación de la Hinchada</h3>
          <p class="text-sub">Respaldo popular en el estadio</p>
          <div class="prob-container">
            <div class="prob-bar-track">
              <div class="prob-bar-fill" style="width: ${contract.fanSatisfaction}%; background: var(--accent-cyan);"></div>
              <div class="prob-bar-text">${contract.fanSatisfaction}% Aprobación</div>
            </div>
          </div>
        </div>

        <div class="card glass-panel">
          <h3>💰 Balance Económico</h3>
          <p class="text-sub">Salud financiera y presupuesto salarial</p>
          <div class="prob-container">
            <div class="prob-bar-track">
              <div class="prob-bar-fill" style="width: ${contract.financialBalance}%; background: var(--accent-gold);"></div>
              <div class="prob-bar-text">${contract.financialBalance} / 100 Salud</div>
            </div>
          </div>
        </div>

        <div class="card glass-panel">
          <h3>👔 Confianza de la Directiva</h3>
          <p class="text-sub">Probabilidad de renovación automática</p>
          <div class="prob-container">
            <div class="prob-bar-track">
              <div class="prob-bar-fill" style="width: ${contract.renewalChance}%;"></div>
              <div class="prob-bar-text">${contract.renewalChance}% Probabilidad</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Acciones de Contrato -->
      <div class="glass-panel text-center mt-4" style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
        <button id="btnRenewContract" class="btn-primary btn-large" ${contract.renewalChance < 60 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
          ✍️ SOLICITAR RENOVACIÓN DE CONTRATO (3 AÑOS MÁS)
        </button>
        <button id="btnSearchJobOffers" class="btn-secondary btn-large">💼 EXPLORAR OFERTAS DE OTROS CLUBES</button>
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
