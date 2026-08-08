/**
 * ============================================================================
 * ENTRENADOR LEYENDA - VISTA DE FINANZAS DEL CLUB (financesUI.ts)
 * ============================================================================
 * Pestaña dedicada al control económico y contable del club estilo FIFA / EA FC,
 * con DOS PANTALLAS conmutables desde la cabecera (v3.13):
 *
 *   💶 Panel Financiero — el control contable:
 *     1. KPIs Financieros: presupuesto de fichajes, nómina semanal, ingresos y balance proyectado.
 *     2. Desglose de Ingresos (Taquilla, Premios de Liga, Ventas) y Gastos (Salarios, Compras).
 *     3. Tabla completa de la nómina salarial de la plantilla.
 *     4. Historial de finanzas y rendimiento por temporada del DT.
 *
 *   🏆 Ingresos de Mi Liga — los premios según el país del club:
 *     1. Tabla de premios de liga por posición (campeón, zona alta, resto).
 *     2. Premios de la copa nacional por ronda.
 *     3. El pozo de la copa continental por etapas (clasificar, victorias, título).
 * Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.
 */

import { db } from '../data/db.js';
import { getLeagueChampionPrize, getLeaguePrizeByRank, getContinentalCupInfo, getNationalCupRoundPrize } from '../data/leaguePrizes.js';
import { CompetitionsEngine } from '../engine/competitionsEngine.js';
import { sfx } from '../../assets/audio/sfx.js';
import type { NavigateFn } from '../types.js';

/**
 * Renderiza la vista de Finanzas del Club (panel contable ⇄ Ingresos de Mi Liga).
 * @param container - Elemento HTML contenedor principal
 * @param navigateTo - Función de navegación entre vistas
 */
export function renderFinances(container: HTMLElement, navigateTo: NavigateFn): void {
  const gameState = db.gameState!;
  const userTeam = db.teams[gameState.userTeamId] || { id: gameState.userTeamId, name: 'Mi Club', short: 'FC', overall: 70, colors: ['#00aaff', '#00ffaa'], stadium: 'Estadio Principal', budget: 0, reputation: 50 };
  const squad = db.getTeamPlayers(userTeam.id);

  // Garantizar objeto de finanzas (solo partidas heredadas sin el campo)
  if (!gameState.finances) {
    gameState.finances = {
      ticketRevenue: 0,
      weeklyWageTotal: 0,
      playerSales: 0,
      playerPurchases: 0,
      leaguePrize: 0,
      balance: 0,
      budgetAtSeasonStart: 0
    };
  }

  const finances = gameState.finances;

  // Cálculo de Nómina Semanal Total
  const totalWeeklyWage = squad.reduce((sum, p) => sum + (p.salary || 5000), 0);

  // Proyección de gastos salariales hasta final de temporada (38 semanas)
  const remainingWeeks = Math.max(1, gameState.maxWeeks - gameState.week);
  const projectedWageExpenses = totalWeeklyWage * remainingWeeks;

  // Totales acumulados
  const totalIncome = (finances.ticketRevenue || 0) + (finances.playerSales || 0) + (finances.leaguePrize || 0);
  const totalExpenses = (finances.weeklyWageTotal || 0) + (finances.playerPurchases || 0);
  const netBalance = totalIncome - totalExpenses;

  // Estimación del premio por posición actual (v3.9: realista por liga —
  // antes era plano €10-40M para cualquier país).
  const userRank = (gameState.standings || []).findIndex(s => s.teamId === userTeam.id) + 1;
  const leagueId = userTeam.leagueId || gameState.userLeagueId;
  const estimatedPrize = getLeaguePrizeByRank(leagueId, userRank <= 0 ? 99 : userRank);

  // ── Pantalla "Ingresos de Mi Liga" (v3.11 → v3.13): montos por posición +
  //    copa nacional por ronda + pozo continental, según el país del club. ──
  const userLeague = db.leagues.find(l => l.id === leagueId) || null;
  const leagueName = userLeague?.name || 'Mi liga';
  const leagueCountry = userLeague?.country || '';
  const championPrize = getLeagueChampionPrize(leagueId);
  const top4Prize = getLeaguePrizeByRank(leagueId, 2);
  const restPrize = getLeaguePrizeByRank(leagueId, 5);
  const contCup = getContinentalCupInfo(userTeam.region);
  const nationalCupName = CompetitionsEngine.getNationalCupName(userTeam.country || '');
  const fmtMoney = (v: number): string =>
    v >= 1_000_000 ? `€${(v / 1_000_000).toFixed(1)}M` : `€${(v / 1_000).toFixed(0)}K`;
  const rankRow = (rank: number, emoji: string, label: string, prize: number, pct: string): string =>
    `<tr${userRank === rank ? ' style="background: rgba(245,158,11,0.10);"' : ''}>
      <td>${emoji} ${label}</td>
      <td><strong style="color: var(--accent-gold);">${fmtMoney(prize)}</strong></td>
      <td style="text-align: right;">${pct}</td>
    </tr>`;

  // v3.13: conmutador de pantalla. El dataset del contenedor sobrevive al
  // re-render, así que se recuerda la última pestaña visitada.
  const mode: 'finanzas' | 'premios' = (container.dataset.finMode as 'finanzas' | 'premios') || 'finanzas';
  const setMode = (m: 'finanzas' | 'premios') => {
    container.dataset.finMode = m;
    renderFinances(container, navigateTo);
  };

  const finanzasScreen = `
      <!-- ALERTA DE CONGELACIÓN DE FONDOS POR CRISIS / AUDITORÍA (v2.0) -->
      ${gameState.transferBudgetLocked ? `
        <div class="glass-panel mb-4" style="border: 2px solid var(--accent-red); background: rgba(239,68,68,0.1); padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h4 style="color: var(--accent-red); margin: 0; font-size: 1rem;">🕵️ CRISIS FINANCIERA ACTIVA — FONDOS CONGELADOS POR AUDITORÍA</h4>
            <p class="text-sub" style="font-size: 0.82rem; margin-top: 4px;">
              El 30% (€${((gameState.lockedBudgetAmount || 0) / 1000000).toFixed(2)}M) de tu presupuesto de traspasos está congelado por la junta directiva.
            </p>
          </div>
          <button id="btnUnfreezeBudget" class="btn-primary" style="background: var(--accent-gold); color: #000; font-weight: 900;">
            🔓 LIBERAR FONDOS (€200K)
          </button>
        </div>
      ` : ''}

      <!-- ACCIÓN DE REDISTRIBUCIÓN PRESUPUESTARIA CON LA DIRECTIVA -->
      <div class="glass-panel mb-4 text-center" style="display:flex; justify-content:space-between; align-items:center;">
        <span class="text-sub" style="font-size:0.85rem; font-weight:700;">
          📊 Solicitud de Conversión / Redistribución Presupuestaria
        </span>
        <button id="btnRedistributeBudget" class="btn-secondary" style="font-size:0.82rem; padding:8px 16px;">
          🔄 Solicitar mover liquidez a la Directiva
        </button>
      </div>

      <!-- KPIs RÁPIDOS FINANCIEROS -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 20px;">
        
        <div class="glass-panel text-center" style="padding: 16px;">
          <span class="text-sub" style="font-size: 0.75rem; font-weight: 800;">NÓMINA SEMANAL PLANTILLA</span>
          <h3 style="margin: 4px 0 0 0; color: var(--accent-gold);">€${(totalWeeklyWage / 1000).toFixed(0)}K /sem</h3>
          <span class="text-sub" style="font-size: 0.72rem;">${squad.length} Contratos Profesionales</span>
        </div>

        <div class="glass-panel text-center" style="padding: 16px;">
          <span class="text-sub" style="font-size: 0.75rem; font-weight: 800;">INGRESOS ACUMULADOS</span>
          <h3 style="margin: 4px 0 0 0; color: var(--accent-green);">+€${(totalIncome / 1000000).toFixed(2)}M</h3>
          <span class="text-sub" style="font-size: 0.72rem;">Taquilla + Ventas + Premios</span>
        </div>

        <div class="glass-panel text-center" style="padding: 16px;">
          <span class="text-sub" style="font-size: 0.75rem; font-weight: 800;">GASTOS ACUMULADOS</span>
          <h3 style="margin: 4px 0 0 0; color: var(--accent-red);">-€${(totalExpenses / 1000000).toFixed(2)}M</h3>
          <span class="text-sub" style="font-size: 0.72rem;">Salarios + Compras de Fichajes</span>
        </div>

        <div class="glass-panel text-center" style="padding: 16px;">
          <span class="text-sub" style="font-size: 0.75rem; font-weight: 800;">BALANCE NETO DE TEMPORADA</span>
          <h3 style="margin: 4px 0 0 0; color: ${netBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">
            ${netBalance >= 0 ? '+' : ''}€${(netBalance / 1000000).toFixed(2)}M
          </h3>
          <span class="text-sub" style="font-size: 0.72rem;">Superávit / Déficit Operativo</span>
        </div>

      </div>

      <!-- DESGLOSE DE INGRESOS Y GASTOS (2 COLUMNAS) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        
        <!-- COLUMNA INGRESOS -->
        <div class="glass-panel">
          <h3 style="color: var(--accent-green); margin-bottom: 14px; font-size: 1.05rem;">📈 Desglose de Ingresos del Club</h3>
          
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.88rem;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
              <span>🎟️ Recaudación por Taquilla (Estadio):</span>
              <strong style="color: var(--accent-green);">+€${((finances.ticketRevenue || 0) / 1000000).toFixed(2)}M</strong>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
              <span>💰 Ventas de Futbolistas:</span>
              <strong style="color: var(--accent-green);">+€${((finances.playerSales || 0) / 1000000).toFixed(2)}M</strong>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
              <span>🏆 Premio Proyectado por Posición (#${userRank || '-'}):</span>
              <strong style="color: var(--accent-gold);">+€${estimatedPrize >= 1000000 ? (estimatedPrize / 1000000).toFixed(1) + 'M' : (estimatedPrize / 1000).toFixed(0) + 'K'}</strong>
            </div>

            <div style="display: flex; justify-content: space-between; padding-top: 4px;">
              <span style="font-weight: 800;">TOTAL INGRESOS TEMPORADA:</span>
              <strong style="color: var(--accent-green); font-size: 1rem;">+€${((totalIncome + estimatedPrize) / 1000000).toFixed(2)}M</strong>
            </div>
          </div>
        </div>

        <!-- COLUMNA GASTOS -->
        <div class="glass-panel">
          <h3 style="color: var(--accent-red); margin-bottom: 14px; font-size: 1.05rem;">📉 Desglose de Gastos del Club</h3>
          
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.88rem;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
              <span>👥 Nómina Salarial Acumulada:</span>
              <strong style="color: var(--accent-red);">-€${((finances.weeklyWageTotal || 0) / 1000000).toFixed(2)}M</strong>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
              <span>📝 Inversión en Fichajes (Compras):</span>
              <strong style="color: var(--accent-red);">-€${((finances.playerPurchases || 0) / 1000000).toFixed(2)}M</strong>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
              <span>⏳ Nómina Salarial Restante (${remainingWeeks} sem):</span>
              <strong style="color: var(--accent-gold);">-€${(projectedWageExpenses / 1000000).toFixed(2)}M</strong>
            </div>

            <div style="display: flex; justify-content: space-between; padding-top: 4px;">
              <span style="font-weight: 800;">TOTAL GASTOS PROYECTADOS:</span>
              <strong style="color: var(--accent-red); font-size: 1rem;">-€${((totalExpenses + projectedWageExpenses) / 1000000).toFixed(2)}M</strong>
            </div>
          </div>
        </div>

      </div>

      <!-- DETALLE DE NÓMINA DE LA PLANTILLA -->
      <div class="glass-panel mb-4">
        <h3 style="margin-bottom: 12px; font-size: 1rem; color: #ffffff;">📋 Detalle de Contratos y Salarios Semanales de la Plantilla</h3>
        
        <div class="table-responsive">
          <table class="data-table" style="font-size: 0.84rem;">
            <thead>
              <tr>
                <th>POS</th>
                <th>Futbolista</th>
                <th>Edad</th>
                <th>Media (OVR)</th>
                <th>Valor Mercado</th>
                <th>Salario Semanal</th>
                <th>Contrato Restante</th>
                <th>Costo Anual</th>
              </tr>
            </thead>
            <tbody>
              ${squad.map(p => {
                const annualCost = (p.salary || 5000) * 52;
                const contractYears = p.contractYears !== undefined ? p.contractYears : 3;

                return `
                  <tr>
                    <td><span class="pos-tag pos-${p.pos}">${p.pos}</span></td>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.age}a</td>
                    <td><span class="stat-ovr">${p.overall}</span></td>
                    <td>€${(p.value / 1000000).toFixed(1)}M</td>
                    <td style="color: var(--accent-gold); font-weight: 800;">€${((p.salary || 5000) / 1000).toFixed(0)}K /sem</td>
                    <td style="color: ${contractYears <= 1 ? 'var(--accent-red)' : 'inherit'}; font-weight: 700;">${contractYears} Años</td>
                    <td>€${(annualCost / 1000000).toFixed(2)}M/año</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- HISTORIAL DE CARRERA DE FINANZAS POR TEMPORADA -->
      <div class="glass-panel">
        <h3 style="margin-bottom: 12px; font-size: 1rem; color: var(--accent-gold);">📜 Historial de Presupuestos e Hitos por Temporada (25 Años)</h3>
        
        ${(gameState.careerHistory || []).length === 0 ? `
          <p class="text-sub text-center py-3">El historial se actualizará automáticamente al finalizar tu primera temporada como DT.</p>
        ` : `
          <div class="table-responsive">
            <table class="data-table" style="font-size: 0.82rem;">
              <thead>
                <tr>
                  <th>Temporada</th>
                  <th>Club Dirigido</th>
                  <th>Posición Liga</th>
                  <th>Presupuesto Inicial</th>
                  <th>Presupuesto Final</th>
                  <th>MVP de la Temporada</th>
                  <th>Título Ganado</th>
                </tr>
              </thead>
              <tbody>
                ${gameState.careerHistory.map(h => `
                  <tr>
                    <td><strong>${h.season}/${h.season + 1}</strong></td>
                    <td>🏰 ${h.club}</td>
                    <td>#${h.leagueRank} lugar</td>
                    <td>€${((h.budgetStart || 10000000) / 1000000).toFixed(1)}M</td>
                    <td style="color: var(--accent-green); font-weight: 800;">€${((h.budgetEnd || 10000000) / 1000000).toFixed(1)}M</td>
                    <td>🌟 ${h.mvpPlayer}</td>
                    <td>${h.isTitleWon ? '🏆 CAMPEÓN' : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
  `;

  // ── PANTALLA: INGRESOS DE MI LIGA (v3.13) ─────────────────────────────
  const premiosScreen = `
      <!-- PREMIOS DE LA LIGA POR POSICIÓN -->
      <div class="glass-panel mb-4">
        <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 6px; margin-bottom: 4px;">
          <h3 style="font-size: 1.05rem; color: var(--accent-gold); margin: 0;">🏆 Premios de la Liga — ${leagueName}</h3>
          <span class="text-sub" style="font-size: 0.8rem;">${leagueCountry} · Temporada ${gameState.season}/${gameState.season + 1}</span>
        </div>
        <p class="text-sub" style="font-size: 0.8rem; margin-bottom: 12px;">Montos por posición final al cierre de temporada · tu fila actual está resaltada (#${userRank || '—'})</p>

        <div class="table-responsive">
          <table class="data-table" style="font-size: 0.88rem;">
            <thead>
              <tr>
                <th>Posición</th>
                <th>Premio</th>
                <th style="text-align: right;">% del campeón</th>
              </tr>
            </thead>
            <tbody>
              ${rankRow(1, '🥇', 'Campeón (1º)', championPrize, '100%')}
              ${rankRow(2, '🥈', 'Zona alta (2º-4º)', top4Prize, '50%')}
              ${rankRow(5, '🎖️', 'Resto de la tabla (5º+)', restPrize, '20%')}
            </tbody>
          </table>
        </div>
        <p class="text-sub" style="font-size: 0.75rem; margin-top: 10px;">
          El premio de campeón se paga al cerrar la temporada; el 2º-4º recibe la mitad y el resto de la tabla un 20%. La brecha entre ligas es real: el Brasileirão reparte €9M por el título y la Liga 1 solo €600K.
        </p>
      </div>

      <!-- COPA NACIONAL POR RONDA -->
      <div class="glass-panel mb-4">
        <h3 style="font-size: 1.05rem; color: var(--accent-gold); margin: 0 0 4px;">🥊 ${nationalCupName} — premios por ronda</h3>
        <p class="text-sub" style="font-size: 0.8rem; margin-bottom: 12px;">Cada ronda superada paga su premio; en los países grandes la copa puede pagar más que la propia liga (la Copa do Brasil supera al Brasileirão).</p>

        <div class="table-responsive">
          <table class="data-table" style="font-size: 0.88rem;">
            <thead>
              <tr>
                <th>Ronda</th>
                <th>Premio</th>
              </tr>
            </thead>
            <tbody>
              ${[1, 2, 3, 4].map(ri => {
                const labels: Record<number, string> = { 1: 'Octavos de Final', 2: 'Cuartos de Final', 3: 'Semifinal', 4: 'GRAN FINAL 🏆' };
                return `
                  <tr>
                    <td>${labels[ri]}</td>
                    <td><strong style="color: var(--accent-gold);">${fmtMoney(getNationalCupRoundPrize(leagueId, ri))}</strong></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- POZO DE LA COPA CONTINENTAL -->
      <div class="glass-panel">
        <h3 style="font-size: 1.05rem; color: var(--accent-gold); margin: 0 0 4px;">🌐 ${contCup.name} — el pozo continental</h3>
        <p class="text-sub" style="font-size: 0.8rem; margin-bottom: 12px;">Se paga por etapas: jugar la Fase de Grupos ya asegura dinero, cada victoria de grupo suma y el título embolsa el gran premio.</p>

        <div class="table-responsive">
          <table class="data-table" style="font-size: 0.88rem;">
            <thead>
              <tr>
                <th>Etapa</th>
                <th>Premio</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>🎟️ Clasificar a la Fase de Grupos (garantizado)</td><td><strong style="color: var(--accent-green);">${fmtMoney(contCup.groupEntryPrize)}</strong></td></tr>
              <tr><td>⚽ Victoria en Fase de Grupos (por partido)</td><td><strong style="color: var(--accent-green);">${fmtMoney(contCup.groupWinPrize)}</strong></td></tr>
              <tr><td>🛡️ Avanzar en Cuartos / Semifinal (por victoria)</td><td><strong style="color: var(--accent-green);">${fmtMoney(contCup.knockoutWinPrize)}</strong></td></tr>
              <tr><td>🥇 Conquistar el título en la gran final</td><td><strong style="color: var(--accent-gold);">${fmtMoney(contCup.finalPrize)}</strong></td></tr>
            </tbody>
          </table>
        </div>
        <p class="text-sub" style="font-size: 0.75rem; margin-top: 10px;">
          Para la mayoría de clubes sudamericanos, ganar la liga local es solo el vehículo para acceder a este pozo: solo clasificar asegura €${fmtMoney(contCup.groupEntryPrize).slice(1)} y el campeón embolsa ${fmtMoney(contCup.finalPrize)}.
        </p>
      </div>
  `;

  container.innerHTML = `
    <div class="finances-layout">
      <!-- Encabezado de Finanzas Dual + Conmutador de Pantalla (v3.13) -->
      <div class="glass-panel mb-4" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2>💶 Panel de Finanzas & Contabilidad de ${userTeam.name}</h2>
          <p class="text-sub">Control de ingresos, gastos salariales, presupuesto dual y auditorías contables</p>
        </div>
        
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <div style="display:flex; gap:8px;">
            <button id="btnModeFinanzas" class="btn-secondary" style="padding: 6px 12px; font-size: 0.78rem; font-weight: 800; ${mode === 'finanzas' ? 'background: var(--accent-cyan); color: #0b111e; border-color: var(--accent-cyan);' : ''}">💶 Panel Financiero</button>
            <button id="btnModePremios" class="btn-secondary" style="padding: 6px 12px; font-size: 0.78rem; font-weight: 800; ${mode === 'premios' ? 'background: var(--accent-gold); color: #0b111e; border-color: var(--accent-gold);' : ''}">🏆 Ingresos de Mi Liga</button>
          </div>

          <div style="display:flex; gap:12px;">
            <!-- CAJA 1: TRASPASOS -->
            <div style="background: #141d2e; border: 1px solid var(--accent-green); padding: 10px 16px; border-radius: 8px; text-align: center;">
              <span class="text-sub" style="font-size: 0.75rem; font-weight: 700;">💰 PRESUPUESTO TRASPASOS</span>
              <h3 style="margin: 0; color: var(--accent-green);">€${(gameState.budget / 1000000).toFixed(2)}M</h3>
            </div>

            <!-- CAJA 2: SALARIOS -->
            <div style="background: #141d2e; border: 1px solid var(--accent-gold); padding: 10px 16px; border-radius: 8px; text-align: center;">
              <span class="text-sub" style="font-size: 0.75rem; font-weight: 700;">📋 PRESUPUESTO SALARIAL</span>
              <h3 style="margin: 0; color: var(--accent-gold);">€${((gameState.wageBudget || 0) / 1000).toFixed(0)}K /sem</h3>
            </div>
          </div>
        </div>
      </div>

      ${mode === 'finanzas' ? finanzasScreen : premiosScreen}

    </div>
  `;

  // Handlers (los botones de cada pantalla solo existen cuando está visible)
  document.getElementById('btnModeFinanzas')?.addEventListener('click', () => setMode('finanzas'));
  document.getElementById('btnModePremios')?.addEventListener('click', () => setMode('premios'));

  document.getElementById('btnUnfreezeBudget')?.addEventListener('click', () => {
    if (gameState.budget < 200000) {
      alert('Presupuesto insuficiente para liberar los fondos congelados (€200,000 requeridos).');
      return;
    }
    gameState.budget -= 200000;
    gameState.budget += (gameState.lockedBudgetAmount || 0);
    gameState.transferBudgetLocked = false;
    gameState.lockedBudgetAmount = 0;
    db.saveGame();
    sfx.playGoal();
    alert('¡AUDITORÍA RESUELTA! Se han desbloqueado los fondos congelados.');
    renderFinances(container, navigateTo);
  });

  document.getElementById('btnRedistributeBudget')?.addEventListener('click', () => {
    sfx.playClick();
    const boardConf = gameState.contract?.boardConfidence || 50;
    if (boardConf < 55) {
      alert('La directiva ha RECHAZADO tu solicitud de redistribución presupuestaria debido a la baja confianza actual (<55%).');
      return;
    }
    const moveAmount = 5000000;
    if (gameState.budget >= moveAmount) {
      gameState.budget -= moveAmount;
      gameState.wageBudget = (gameState.wageBudget || 0) + 100000;
      db.saveGame();
      sfx.playGoal();
      alert('¡SOLICITUD APROBADA! Se transfirieron €5.0M del presupuesto de traspasos a €100K/sem de masa salarial.');
      renderFinances(container, navigateTo);
    } else {
      alert('No dispones de liquidez suficiente (€5.0M requeridos) para la conversión.');
    }
  });
}
