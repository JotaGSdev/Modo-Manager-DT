// Interfaz de Mercado de Fichajes con Indicador de Ventana Abierta / Cerrada

import { db } from '../data/db.js';
import { TransferEngine, isTransferWindowOpen } from '../engine/transfers.js';
import { ProbabilityEngine } from '../engine/probability.js';
import { sfx } from '../../assets/audio/sfx.js';

export function renderTransfers(container) {
  const gameState = db.gameState;
  const userTeam = db.teams[gameState.userTeamId];
  const marketOpen = isTransferWindowOpen(gameState.week);
  let currentFilters = { position: 'ALL', name: '' };

  const renderMarketList = () => {
    const players = TransferEngine.getMarketPlayers(currentFilters);
    const listContainer = document.getElementById('marketPlayerList');
    if (!listContainer) return;

    listContainer.innerHTML = players.slice(0, 40).map(p => `
      <div class="player-market-card">
        <div class="player-card-left">
          <span class="pos-tag pos-${p.pos}">${p.pos}</span>
          <div class="player-info">
            <h4>${p.name}</h4>
            <span class="club-subtext">🏰 ${p.teamName} | Edad: ${p.age}</span>
          </div>
        </div>

        <div class="player-card-stats">
          <div class="stat-box"><span class="lbl">OVR</span><span class="val stat-ovr">${p.overall}</span></div>
          <div class="stat-box"><span class="lbl">POT</span><span class="val">${p.potential}</span></div>
          <div class="stat-box"><span class="lbl">VALOR</span><span class="val">€${(p.value / 1000000).toFixed(1)}M</span></div>
        </div>

        <button class="btn-primary btn-negotiate" data-id="${p.id}" ${!marketOpen ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
          ${marketOpen ? '📝 NEGOCIAR' : '🔒 MERCADO CERRADO'}
        </button>
      </div>
    `).join('');

    document.querySelectorAll('.btn-negotiate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!marketOpen) {
          alert('El mercado de fichajes está cerrado actualmente. Solo abre en las Semanas 1-4 y Semanas 19-22.');
          return;
        }
        const playerId = e.target.dataset.id;
        const player = db.getPlayerById(playerId);
        if (player) openNegotiationModal(player);
      });
    });
  };

  container.innerHTML = `
    <div class="transfers-layout">
      <div class="transfers-header glass-panel">
        <div class="budget-box">
          <span class="lbl">Presupuesto de Traspasos:</span>
          <span class="val text-highlight">€${(gameState.budget / 1000000).toFixed(1)}M</span>
        </div>
        <div class="budget-box">
          <span class="lbl">Presupuesto Salarial:</span>
          <span class="val">€${(gameState.wageBudget / 1000).toFixed(0)}K /sem</span>
        </div>
        <div class="budget-box" style="margin-left: auto;">
          <span class="lbl">Estado del Mercado:</span>
          <span class="val ${marketOpen ? 'text-highlight' : 'text-sub'}">
            ${marketOpen ? '🟢 VENTANA ABIERTA' : '🔴 MERCADO CERRADO (Próxima apertura: Semana 19 / Sem. 1)'}
          </span>
        </div>
      </div>

      <!-- Filtros de Búsqueda -->
      <div class="filters-bar glass-panel">
        <input type="text" id="inputSearchName" class="input-text" placeholder="🔍 Buscar por nombre de jugador..." />
        
        <select id="selectPosFilter" class="input-select">
          <option value="ALL">Todas las Posiciones</option>
          <option value="POR">Porteros (POR)</option>
          <option value="DFC">Defensas Centrales (DFC)</option>
          <option value="LI">Laterales Izquierdos (LI)</option>
          <option value="LD">Laterales Derechos (LD)</option>
          <option value="MC">Mediocampistas (MC)</option>
          <option value="MCO">Mediapuntas (MCO)</option>
          <option value="EI">Extremos Izquierdos (EI)</option>
          <option value="ED">Extremos Derechos (ED)</option>
          <option value="DC">Delanteros (DC)</option>
        </select>
      </div>

      <!-- Lista de Mercado -->
      <div id="marketPlayerList" class="market-list"></div>
    </div>

    <!-- Modal de Negociación -->
    <div id="negotiationModal" class="modal-overlay hidden">
      <div id="modalContent" class="modal-card glass-panel"></div>
    </div>
  `;

  document.getElementById('inputSearchName').addEventListener('input', (e) => {
    currentFilters.name = e.target.value;
    renderMarketList();
  });

  document.getElementById('selectPosFilter').addEventListener('change', (e) => {
    currentFilters.position = e.target.value;
    renderMarketList();
  });

  renderMarketList();

  function openNegotiationModal(player) {
    const modal = document.getElementById('negotiationModal');
    const content = document.getElementById('modalContent');
    modal.classList.remove('hidden');

    let initialFee = Math.round(player.value * 1.05);
    let initialWage = Math.round(player.salary * 1.10);

    const updateProbabilityMeter = () => {
      const feeInput = parseFloat(document.getElementById('inputFee').value) || 0;
      const wageInput = parseFloat(document.getElementById('inputWage').value) || 0;
      const sellingTeam = db.teams[player.teamId] || { reputation: 70 };

      const chance = ProbabilityEngine.calculateTransferChance(
        player, userTeam, sellingTeam, feeInput, wageInput, 1, gameState.trophies.length
      );

      const meter = document.getElementById('probMeter');
      if (meter) {
        meter.style.width = `${chance}%`;
        meter.innerText = `${chance}% de Aceptación`;
        meter.style.background = chance > 60 ? '#00ffb3' : (chance > 35 ? '#ffd700' : '#ff2a6d');
      }
    };

    content.innerHTML = `
      <h3>📝 Negociación por ${player.name}</h3>
      <p class="text-sub">Posición: ${player.pos} | Media: ${player.overall} | Valor: €${(player.value / 1000000).toFixed(1)}M</p>
      
      <div class="form-group mt-3">
        <label>Oferta de Traspaso (€):</label>
        <input type="number" id="inputFee" class="input-text" value="${initialFee}" step="500000" />
      </div>

      <div class="form-group">
        <label>Oferta Salarial Semanal (€):</label>
        <input type="number" id="inputWage" class="input-text" value="${initialWage}" step="5000" />
      </div>

      <div class="prob-container">
        <label>Probabilidad Estimada de Acuerdo:</label>
        <div class="prob-bar-track">
          <div id="probMeter" class="prob-bar-fill" style="width: 50%;">50%</div>
        </div>
      </div>

      <div id="negotiationResult" class="negotiation-result"></div>

      <div class="modal-actions mt-4">
        <button id="btnSubmitOffer" class="btn-primary">🤝 ENVIAR OFERTA</button>
        <button id="btnCloseModal" class="btn-secondary">Cancelar</button>
      </div>
    `;

    document.getElementById('inputFee').addEventListener('input', updateProbabilityMeter);
    document.getElementById('inputWage').addEventListener('input', updateProbabilityMeter);
    updateProbabilityMeter();

    document.getElementById('btnCloseModal').addEventListener('click', () => modal.classList.add('hidden'));

    document.getElementById('btnSubmitOffer').addEventListener('click', () => {
      const fee = parseFloat(document.getElementById('inputFee').value);
      const wage = parseFloat(document.getElementById('inputWage').value);

      const res = TransferEngine.submitOffer(player, fee, wage);
      const resContainer = document.getElementById('negotiationResult');

      if (res.success) {
        sfx.playTransferChime();
        resContainer.innerHTML = `<div class="alert alert-success mt-2">${res.message}</div>`;
        setTimeout(() => {
          modal.classList.add('hidden');
          renderTransfers(container);
        }, 1800);
      } else {
        resContainer.innerHTML = `<div class="alert alert-danger mt-2">${res.reason}</div>`;
      }
    });
  }
}
