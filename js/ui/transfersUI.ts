// Interfaz de Mercado de Fichajes con Negociación por Pasos e Indicadores Presupuestarios en Tiempo Real (EA FC Style)
// Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.

import { db } from '../data/db.js';
import { TransferEngine, isTransferWindowOpen } from '../engine/transfers.js';
import { sfx } from '../../assets/audio/sfx.js';

import type { MarketFilters } from '../engine/transfers.js';
import type { Player, SquadRole } from '../types.js';

export function renderTransfers(container: HTMLElement): void {
  const gameState = db.gameState!;
  const marketOpen = isTransferWindowOpen(gameState.week);
  let currentFilters: MarketFilters = { position: 'ALL', name: '' };

  const renderMarketList = () => {
    const players = TransferEngine.getMarketPlayers(currentFilters);
    const listContainer = document.getElementById('marketPlayerList');
    if (!listContainer) return;

    listContainer.innerHTML = players.slice(0, 40).map(p => `
      <div class="player-market-card ${p.isLocked ? 'locked-card' : ''}">
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

        ${p.isLocked ? `
          <button class="btn-secondary" disabled style="opacity: 0.6; cursor: not-allowed; border-color: var(--accent-red); color: var(--accent-red);">
            🔒 NEGOCIACIÓN ROTA
          </button>
        ` : `
          <button class="btn-primary btn-negotiate" data-id="${p.id}" ${!marketOpen ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            ${marketOpen ? '📝 NEGOCIAR' : '🔒 MERCADO CERRADO'}
          </button>
        `}
      </div>
    `).join('');

    document.querySelectorAll('.btn-negotiate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!marketOpen) {
          alert('El mercado de fichajes está cerrado actualmente. Solo abre en las Semanas 1-4 (Verano) y 19-22 (Invierno).');
          return;
        }
        const playerId = (e.target as HTMLElement).dataset.id;
        const player = db.getPlayerById(playerId!);
        if (player) openEAFCNegotiationWizard(player);
      });
    });
  };

  container.innerHTML = `
    <div class="transfers-layout">
      <!-- Encabezado de Presupuesto Disponible -->
      <div class="transfers-header glass-panel">
        <div class="budget-box">
          <span class="lbl">Presupuesto para Fichajes (Traspasos):</span>
          <span class="val text-highlight" style="font-size: 1.3rem;">€${(gameState.budget / 1000000).toFixed(2)}M</span>
        </div>
        <div class="budget-box">
          <span class="lbl">Presupuesto Salarial Disponible:</span>
          <span class="val" style="color: var(--accent-gold); font-size: 1.3rem;">€${(gameState.wageBudget / 1000).toFixed(0)}K /sem</span>
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

    <!-- Modal de Negociación por Pasos EA FC -->
    <div id="negotiationModal" class="modal-overlay hidden">
      <div id="modalContent" class="modal-card glass-panel"></div>
    </div>
  `;

  document.getElementById('inputSearchName')!.addEventListener('input', (e) => {
    currentFilters.name = (e.target as HTMLInputElement).value;
    renderMarketList();
  });

  document.getElementById('selectPosFilter')!.addEventListener('change', (e) => {
    currentFilters.position = (e.target as HTMLSelectElement).value as Exclude<MarketFilters['position'], undefined>;
    renderMarketList();
  });

  renderMarketList();

  /**
   * Wizard de Negociación por Pasos al estilo EA FC / FIFA con Indicadores Presupuestarios Visibles
   */
  function openEAFCNegotiationWizard(player: Player): void {
    const modal = document.getElementById('negotiationModal')!;
    const content = document.getElementById('modalContent')!;
    modal.classList.remove('hidden');

    let agreedFee = Math.round(player.value * 1.05);

    const renderStep1 = () => {
      content.innerHTML = `
        <h3>📝 Negociación de Traspaso (Paso 1 de 2: Con el Club)</h3>
        <p class="text-sub">Jugador: <strong>${player.name}</strong> (${player.pos}) | OVR: ${player.overall} | Valor de Mercado: <strong>€${(player.value / 1000000).toFixed(1)}M</strong></p>
        <p class="text-sub">Club Propietario: <strong>${db.teams[player.teamId]?.name || 'Club'}</strong></p>

        <!-- BANNER DE PRESUPUESTO DE FICHAJES PARA PASO 1 -->
        <div style="background: #0f172a; border: 1px solid var(--border-color); padding: 10px 14px; border-radius: 8px; margin: 12px 0; display: flex; justify-content: space-between; align-items: center;">
          <span class="text-sub" style="font-size: 0.85rem; font-weight: 700;">PRESUPUESTO DISPONIBLE PARA FICHAJES:</span>
          <strong style="color: var(--accent-green); font-size: 1.15rem;">€${(gameState.budget / 1000000).toFixed(2)}M</strong>
        </div>

        <div class="form-group mt-3">
          <label>Oferta de Traspaso (€):</label>
          <input type="number" id="inputClubFee" class="input-text" value="${agreedFee}" step="500000" />
        </div>

        <div class="form-group">
          <label>Cláusula de Venta Futura (%):</label>
          <select id="selectSellOn" class="input-select">
            <option value="0">Sin cláusula (0%)</option>
            <option value="10">10% de futura venta</option>
            <option value="20">20% de futura venta</option>
          </select>
        </div>

        <div class="prob-container">
          <label>Probabilidad de Aceptación del Club:</label>
          <div class="prob-bar-track">
            <div id="probBarFill" class="prob-bar-fill" style="width: 60%;"></div>
            <div id="probBarText" class="prob-bar-text">60% de Aceptación</div>
          </div>
        </div>

        <div id="step1Result" class="mt-3"></div>

        <div class="modal-actions mt-4">
          <button id="btnSubmitStep1" class="btn-primary">🤝 ENVIAR OFERTA AL CLUB</button>
          <button id="btnCloseWizard" class="btn-secondary">Cancelar</button>
        </div>
      `;

      const updateClubMeter = () => {
        const fee = parseFloat((document.getElementById('inputClubFee') as HTMLInputElement).value) || 0;
        const sellOn = parseFloat((document.getElementById('selectSellOn') as HTMLSelectElement).value) || 0;
        const effective = fee + (sellOn / 100) * player.value * 0.15;
        const pct = Math.max(0, Math.min(99, Math.round((effective / player.value) * 60)));

        const fill = document.getElementById('probBarFill');
        const txt = document.getElementById('probBarText');

        if (fill && txt) {
          fill.style.width = `${pct}%`;
          txt.innerText = `${pct}% de Aceptación del Club`;
          fill.style.background = pct > 50 ? 'linear-gradient(90deg, #00d2ff, #00ffb3)' : (pct > 30 ? '#ffd700' : '#ff2a6d');
        }
      };

      document.getElementById('inputClubFee')!.addEventListener('input', updateClubMeter);
      document.getElementById('selectSellOn')!.addEventListener('change', updateClubMeter);
      updateClubMeter();

      document.getElementById('btnCloseWizard')!.addEventListener('click', () => modal.classList.add('hidden'));

      document.getElementById('btnSubmitStep1')!.addEventListener('click', () => {
        const fee = parseFloat((document.getElementById('inputClubFee') as HTMLInputElement).value);
        const sellOn = parseFloat((document.getElementById('selectSellOn') as HTMLSelectElement).value);

        if (fee > gameState.budget) {
          alert(`Presupuesto insuficiente. Tu oferta de €${(fee/1e6).toFixed(2)}M supera tu presupuesto de fichajes disponible de €${(gameState.budget/1e6).toFixed(2)}M.`);
          return;
        }

        const res = TransferEngine.evaluateClubOffer(player, fee, sellOn);
        const resEl = document.getElementById('step1Result')!;

        if (res.success) {
          sfx.playTransferChime();
          agreedFee = fee;
          resEl.innerHTML = `<div class="alert alert-success mt-2">${res.message}</div>`;
          setTimeout(() => {
            renderStep2();
          }, 1500);
        } else {
          sfx.playWhistle();
          resEl.innerHTML = `<div class="alert alert-danger mt-2">${res.reason}</div>`;
          if (res.breakNegotiation) {
            setTimeout(() => {
              modal.classList.add('hidden');
              renderMarketList();
            }, 2500);
          }
        }
      });
    };

    const renderStep2 = () => {
      const defaultWage = Math.round(player.salary * 1.10);

      content.innerHTML = `
        <h3>✍️ Negociación de Contrato (Paso 2 de 2: Con el Jugador)</h3>
        <p class="text-sub">Jugador: <strong>${player.name}</strong> | Rol Deseado: <strong>${player.overall >= 80 ? 'Crucial / Titular' : 'Rotación'}</strong></p>

        <!-- BANNER DE PRESUPUESTO SALARIAL Y PRIMAS PARA PASO 2 -->
        <div style="background: #0f172a; border: 1px solid var(--border-color); padding: 12px 14px; border-radius: 8px; margin: 12px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; text-align: center;">
          <div>
            <span class="text-sub" style="font-size: 0.78rem; font-weight: 700; display: block;">PRESUPUESTO SALARIAL DISPONIBLE:</span>
            <strong style="color: var(--accent-gold); font-size: 1.15rem;">€${(gameState.wageBudget / 1000).toFixed(0)}K / sem</strong>
          </div>
          <div>
            <span class="text-sub" style="font-size: 0.78rem; font-weight: 700; display: block;">DISPONIBLE PARA PRIMAS / TRASPASO:</span>
            <strong style="color: var(--accent-green); font-size: 1.15rem;">€${((gameState.budget - agreedFee) / 1000000).toFixed(2)}M</strong>
          </div>
        </div>

        <div class="form-group mt-3">
          <label>Rol Ofrecido en el Equipo:</label>
          <select id="selectPlayerRole" class="input-select">
            <option value="Crucial">Jugador Crucial (Titular Indiscutible)</option>
            <option value="Titular Habitual" selected>Titular Habitual</option>
            <option value="Rotación">Jugador de Rotación</option>
            <option value="Prospecto">Prospecto de Futuro</option>
          </select>
        </div>

        <div class="form-group">
          <label>Duración del Contrato (Años):</label>
          <select id="selectYears" class="input-select">
            <option value="3" selected>3 Años</option>
            <option value="4">4 Años</option>
            <option value="5">5 Años</option>
          </select>
        </div>

        <div class="form-group">
          <label>Salario Semanal (€):</label>
          <input type="number" id="inputPlayerWage" class="input-text" value="${defaultWage}" step="2000" />
        </div>

        <div class="form-group">
          <label>Prima de Fichaje (€):</label>
          <input type="number" id="inputSigningBonus" class="input-text" value="0" step="50000" />
        </div>

        <!-- ── v2.0: BARRA DE IMPACIENCIA DEL AGENTE EN TIEMPO REAL (FASE 6C) ── -->
        <div style="background:#0b111e; border:1px solid var(--border-color); padding:10px; border-radius:8px; margin:10px 0;">
          <div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:4px;">
            <span style="color:var(--accent-gold); font-weight:800;">🤝 Impaciencia del Representante del Jugador:</span>
            <span id="agentImpatienceText" style="font-weight:900; color:var(--accent-green);">0% (Tranquilo)</span>
          </div>
          <div style="height:6px; background:#1e293b; border-radius:3px; overflow:hidden;">
            <div id="agentImpatienceBar" style="height:100%; width:0%; background:var(--accent-green); transition:width 0.3s ease;"></div>
          </div>
        </div>

        <div id="wageValidationInfo" class="text-sub mb-2" style="font-size: 0.84rem;"></div>

        <div id="step2Result" class="mt-3"></div>

        <div class="modal-actions mt-4">
          <button id="btnSubmitStep2" class="btn-primary">✍️ ESTAMPAR FIRMA Y CERRAR FICHAJE</button>
          <button id="btnCloseWizard2" class="btn-secondary">Rechazar Contrato</button>
        </div>
      `;

      let agentImpatience = 0;

      const validateStep2Budgets = () => {
        const wage = parseFloat((document.getElementById('inputPlayerWage') as HTMLInputElement).value) || 0;
        const bonus = parseFloat((document.getElementById('inputSigningBonus') as HTMLInputElement).value) || 0;
        const remainingBudgetForBonus = gameState.budget - agreedFee;
        const infoEl = document.getElementById('wageValidationInfo');

        // Cálculo dinámico de impaciencia del agente según la rebaja salarial propuesta
        const wageDiffRatio = (defaultWage - wage) / defaultWage;
        if (wageDiffRatio > 0) {
          agentImpatience = Math.min(100, Math.round(wageDiffRatio * 150));
        } else {
          agentImpatience = Math.max(0, agentImpatience - 10);
        }

        const barEl = document.getElementById('agentImpatienceBar');
        const txtEl = document.getElementById('agentImpatienceText');
        if (barEl && txtEl) {
          barEl.style.width = `${agentImpatience}%`;
          if (agentImpatience >= 80) {
            barEl.style.background = 'var(--accent-red)';
            txtEl.innerText = `${agentImpatience}% (¡A punto de romper la mesa!)`;
            txtEl.style.color = 'var(--accent-red)';
          } else if (agentImpatience >= 40) {
            barEl.style.background = 'var(--accent-gold)';
            txtEl.innerText = `${agentImpatience}% (Molesto por la oferta baja)`;
            txtEl.style.color = 'var(--accent-gold)';
          } else {
            barEl.style.background = 'var(--accent-green)';
            txtEl.innerText = `${agentImpatience}% (Tranquilo)`;
            txtEl.style.color = 'var(--accent-green)';
          }
        }

        if (!infoEl) return;

        if (wage > gameState.wageBudget) {
          infoEl.innerHTML = `<span style="color: var(--accent-red); font-weight: 700;">⚠️ Presupuesto salarial insuficiente. Tu oferta de €${(wage/1000).toFixed(0)}K/sem supera tus €${(gameState.wageBudget/1000).toFixed(0)}K/sem disponibles.</span>`;
        } else if (bonus > remainingBudgetForBonus) {
          infoEl.innerHTML = `<span style="color: var(--accent-red); font-weight: 700;">⚠️ Presupuesto de fichajes insuficiente para la prima. Te quedan €${(remainingBudgetForBonus/1e6).toFixed(2)}M tras el traspaso.</span>`;
        } else {
          infoEl.innerHTML = `<span style="color: var(--accent-green);">✓ Oferta salarial dentro del presupuesto disponible de tu club.</span>`;
        }
      };

      document.getElementById('inputPlayerWage')!.addEventListener('input', validateStep2Budgets);
      document.getElementById('inputSigningBonus')!.addEventListener('input', validateStep2Budgets);
      validateStep2Budgets();

      document.getElementById('btnCloseWizard2')!.addEventListener('click', () => {
        TransferEngine.lockPlayerForCurrentWindow(player.id);
        modal.classList.add('hidden');
        renderMarketList();
      });

      document.getElementById('btnSubmitStep2')!.addEventListener('click', () => {
        if (agentImpatience >= 95) {
          alert('¡NEGOCIACIÓN ROTA! El representante del jugador se levantó de la mesa furioso por tu propuesta insultante.');
          TransferEngine.lockPlayerForCurrentWindow(player.id);
          modal.classList.add('hidden');
          renderMarketList();
          return;
        }

        const role = (document.getElementById('selectPlayerRole') as HTMLSelectElement).value as SquadRole;
        const years = parseInt((document.getElementById('selectYears') as HTMLSelectElement).value);
        const wage = parseFloat((document.getElementById('inputPlayerWage') as HTMLInputElement).value);
        const bonus = parseFloat((document.getElementById('inputSigningBonus') as HTMLInputElement).value);

        const res = TransferEngine.evaluateContractOffer(player, agreedFee, role, years, wage, bonus);
        const resEl = document.getElementById('step2Result')!;

        if (res.success) {
          sfx.playGoal();
          resEl.innerHTML = `<div class="alert alert-success mt-2">${res.message}</div>`;
          setTimeout(() => {
            modal.classList.add('hidden');
            renderTransfers(container);
          }, 1800);
        } else {
          sfx.playWhistle();
          resEl.innerHTML = `<div class="alert alert-danger mt-2">${res.reason}</div>`;
          if (res.breakNegotiation) {
            setTimeout(() => {
              modal.classList.add('hidden');
              renderMarketList();
            }, 2500);
          }
        }
      });
    };

    renderStep1();
  }
}
