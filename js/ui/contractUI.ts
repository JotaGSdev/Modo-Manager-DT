// Vista de Evaluación de Contrato, Renovaciones y Ofertas de Clubes & Selecciones Nacionales
// Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.

import { db } from '../data/db.js';
import { ContractEngine } from '../engine/contracts.js';
import { renderTeamBadgeSVG, getCountryFlag } from './badgeHelper.js';
import { sfx } from '../../assets/audio/sfx.js';
import { ManagerMarketEngine } from '../engine/managerMarketEngine.js';
import type { NavigateFn } from '../types.js';

export function renderContractView(container: HTMLElement, navigateTo: NavigateFn): void {
  const gameState = db.gameState!;
  let contract = ContractEngine.evaluatePerformance();

  if (!contract) {
    contract = ContractEngine.startClubContract(gameState.userTeamId, 3);
  }

  const team = db.teams[gameState.userTeamId]!;
  const nationalTeam = gameState.nationalTeamContract ? gameState.nationalTeamContract.teamName : null;

  container.innerHTML = `
    <div class="contract-layout">
      <!-- Encabezado Directivo con Escudos -->
      <div class="glass-panel mb-4" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          ${renderTeamBadgeSVG(team, 56)}
          <div>
            <h2 style="margin:0;">📜 Vínculo Contractual & Despacho del DT</h2>
            <p class="text-sub" style="margin-top:4px;">
              Club Actual: <strong>${team.name}</strong> | Período: <strong>${contract.yearsRemaining} de ${contract.duration} Años Restantes</strong>
              ${nationalTeam ? ` | 🇦🇷 Cargo Selección: <strong style="color:var(--accent-cyan);">${nationalTeam}</strong>` : ''}
            </p>
          </div>
        </div>
        <div style="background: #141d2e; border: 1px solid var(--border-color); padding: 10px 20px; border-radius: 8px; text-align: center;">
          <span class="text-sub" style="font-size: 0.8rem; font-weight: 700;">OBJETIVO TEMPORAL</span>
          <h4 style="margin: 0; color: var(--accent-gold);">Top ${contract.targetPosition} en Liga</h4>
        </div>
      </div>

      <!-- KPIs del Contrato -->
      <div class="dashboard-grid">
        <div class="card glass-panel">
          <h3>🏆 Resultados Deportivos</h3>
          <p class="text-sub">Desempeño en tabla y torneos</p>
          <div class="prob-container">
            <div class="prob-bar-track">
              <div class="prob-bar-fill" style="width: ${contract.sportingScore}%;"></div>
              <div class="prob-bar-text">${contract.sportingScore} / 100 PTS</div>
            </div>
          </div>
        </div>

        <div class="card glass-panel">
          <h3>📣 Aprobación de la Hinchada</h3>
          <p class="text-sub">Popularidad e identidad del club</p>
          <div class="prob-container">
            <div class="prob-bar-track">
              <div class="prob-bar-fill" style="width: ${contract.fanSatisfaction}%; background: var(--accent-cyan);"></div>
              <div class="prob-bar-text">${contract.fanSatisfaction}% Aprobación</div>
            </div>
          </div>
        </div>

        <div class="card glass-panel">
          <h3>💰 Salud Financiera</h3>
          <p class="text-sub">Cumplimiento del margen presupuestario</p>
          <div class="prob-container">
            <div class="prob-bar-track">
              <div class="prob-bar-fill" style="width: ${contract.financialBalance}%; background: var(--accent-gold);"></div>
              <div class="prob-bar-text">${contract.financialBalance} / 100 Salud</div>
            </div>
          </div>
        </div>

        <div class="card glass-panel">
          <h3>👔 Confianza Directiva</h3>
          <p class="text-sub">Probabilidad de renovación de contrato</p>
          <div class="prob-container">
            <div class="prob-bar-track">
              <div class="prob-bar-fill" style="width: ${contract.renewalChance}%;"></div>
              <div class="prob-bar-text">${contract.renewalChance}% Confianza</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Acciones de Contrato -->
      <div class="glass-panel text-center mt-4" style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
        <button id="btnRenewContract" class="btn-primary btn-large" ${contract.renewalChance < 60 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
          ✍️ SOLICITAR RENOVACIÓN DE CONTRATO (3 AÑOS MÁS)
        </button>
        <button id="btnSearchJobOffers" class="btn-secondary btn-large">💼 EXPLORAR OFERTAS DE CLUBES Y SELECCIONES</button>
      </div>

      <div id="jobOffersContainer" class="mt-4 hidden"></div>

      <!-- ── v2.0: MERCADO DE ENTRENADORES RIVALES (INTEGRADO SEGÚN PREFERENCIA DE USUARIO) ── -->
      <div class="glass-panel mt-4">
        <h3 style="margin-bottom:6px; color:var(--accent-cyan);">🧑‍💼 Mercado Global de Entrenadores (DTs Rivales & Vacantes)</h3>
        <p class="text-sub" style="font-size:0.8rem; margin-bottom:14px;">
          Movilidad en tiempo real de directores técnicos. Los clubes destituyen entrenadores por bajos resultados.
        </p>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Club</th>
                <th>Director Técnico Actual</th>
                <th>Estilo / Arquetipo Táctico</th>
                <th>Estado del Cargo</th>
                <th>Reputación</th>
              </tr>
            </thead>
            <tbody>
              ${ManagerMarketEngine.getAllManagersTable().map(row => {
                const isInterim = row.manager.isInterim;
                return `
                  <tr>
                    <td><strong>${row.teamName}</strong> <span class="text-sub" style="font-size:0.75rem;">(${row.country})</span></td>
                    <td>${row.manager.name}</td>
                    <td><span class="badge" style="background:#1e293b; color:var(--accent-gold);">${row.manager.archetype.replace(/_/g, ' ')}</span></td>
                    <td>
                      ${isInterim
                        ? `<span class="badge" style="background:rgba(239,68,68,0.2); color:var(--accent-red); font-weight:800;">🔴 INTERINO (VACANTE LIBRE)</span>`
                        : `<span class="badge" style="background:rgba(0,200,133,0.2); color:var(--accent-green);">🟢 TITULAR</span>`}
                    </td>
                    <td><span class="stat-ovr">${row.manager.reputation}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btnRenewContract')!.addEventListener('click', () => {
    if (contract.renewalChance < 60) {
      alert('La directiva no renovará tu contrato por falta de resultados en la temporada.');
      return;
    }
    sfx.playTransferChime();
    ContractEngine.startClubContract(gameState.userTeamId, 3);
    alert(`¡CONTRATO RENOVADO! Has extendido tu contrato con ${team.name} por 3 temporadas adicionales.`);
    renderContractView(container, navigateTo);
  });

  document.getElementById('btnSearchJobOffers')!.addEventListener('click', () => {
    sfx.playClick();
    const offers = ContractEngine.generateJobOffers();
    const containerEl = document.getElementById('jobOffersContainer')!;
    containerEl.classList.remove('hidden');

    containerEl.innerHTML = `
      <div class="glass-panel">
        <h3 style="margin-bottom: 12px;">💼 Propuestas Formales de Trabajo Recepcionadas</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${offers.map(o => {
            const isNational = o.type === 'NATIONAL_TEAM';
            const offerTeam = isNational ? null : db.teams[o.teamId];

            return `
              <div style="background: #0f172a; border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  ${isNational ? `<span style="font-size: 2.2rem;">${getCountryFlag(o.country)}</span>` : renderTeamBadgeSVG(offerTeam, 48)}
                  <div>
                    <h4 style="margin: 0; font-size: 1.05rem; color: #fff;">${o.teamName}</h4>
                    <span class="text-sub" style="font-size: 0.8rem;">
                      ${isNational ? `🏆 <strong>${o.targetTournament}</strong>` : `Duración: ${o.contractDuration} Años | Presupuesto: €${(o.budget / 1000000).toFixed(1)}M`}
                    </span>
                  </div>
                </div>

                <button class="btn-primary btn-accept-job" data-id="${o.teamId}" data-type="${o.type}" data-name="${o.teamName}">
                  ${isNational ? '🌎 ASUMIR SELECCIÓN NACIONAL' : '✍️ FIRMAR CONTRATO POR ESTE CLUB'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    document.querySelectorAll('.btn-accept-job').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const type = target.dataset.type;
        const targetId = target.dataset.id!;
        const targetName = target.dataset.name;
        sfx.playWhistle();

        if (type === 'NATIONAL_TEAM') {
          gameState.nationalTeamContract = {
            teamId: targetId,
            teamName: targetName || 'Selección Nacional',
            startYear: gameState.season
          };
          alert(`¡CARGO ASUMIDO! Ahora eres el Seleccionador Oficial de la ${targetName} para competir en Eliminatorias y el Mundial.`);
          renderContractView(container, navigateTo);
        } else {
          const newTeam = db.teams[targetId]!;
          gameState.userTeamId = targetId;
          gameState.userLeagueId = newTeam.leagueId || '';
          gameState.budget = newTeam.budget;
          gameState.wageBudget = newTeam.wageBudget || Math.round((newTeam.budget || 0) * 0.3);
          gameState.reputation = newTeam.reputation;

          ContractEngine.startClubContract(targetId, 3);
          alert(`¡NUEVO DESAFÍO PROFESIONAL! Has asumido el cargo de DT en ${newTeam.name}.`);
          navigateTo('dashboard');
        }
      });
    });
  });
}
