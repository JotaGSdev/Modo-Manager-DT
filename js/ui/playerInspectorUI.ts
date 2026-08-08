// Inspector de Jugador Estilo EA FC / FIFA: Edad Dinámica, Contrato en Años y Meses Restantes, Ventas y Renovaciones
// Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.

import { db } from '../data/db.js';
import { sfx } from '../../assets/audio/sfx.js';
import { renderCountryFlagSVG, renderTeamBadgeSVG } from './badgeHelper.js';

import type { Player, Position } from '../types.js';

const TACTICAL_ROLES_BY_POS: Partial<Record<Position, string[]>> = {
  'POR': ['Portero Líbero (Sale a Cortar)', 'Portero Tradicional (Bajo el Arco)'],
  'DFC': ['Defensa Marcador Físico', 'Defensa de Salida Limpia / Toque'],
  'LI': ['Lateral de Recorrido Profundo', 'Lateral Invertido (Apoyo a MCO)', 'Defensa Lateral Cerrado'],
  'LD': ['Lateral de Recorrido Profundo', 'Lateral Invertido (Apoyo a MCO)', 'Defensa Lateral Cerrado'],
  'MCD': ['Organizador Profundo', 'Destructor Físico de Juego', 'Pivote de Presión Alta'],
  'MC': ['Box-to-Box (Área a Área)', 'Creador de Juego Ritmo', 'Interior Ofensivo'],
  'MCO': ['Mediapunta Libre Creativo', 'Falso 9 Retrasado', 'Enganche de Pase Filtrado'],
  'EI': ['Extremo Invertido (Corte al Centro)', 'Extremo Puro de Banda', 'Delantero Interior'],
  'ED': ['Extremo Invertido (Corte al Centro)', 'Extremo Puro de Banda', 'Delantero Interior'],
  'DC': ['Delantero Centro Avanzado', 'Falso 9 Táctico', 'Hombre Objetivo / Pivote de Área']
};

export function openPlayerInspectorModal(player: Player, onUpdate?: () => void): void {
  const gameState = db.gameState!;
  const userTeamId = gameState.userTeamId;
  const isOwnPlayer = player.teamId === userTeamId;

  let modal: HTMLElement | null = document.getElementById('playerInspectorModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'playerInspectorModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  const appearances = player.appearances || 0;
  const goals = player.seasonGoals || 0;
  const ratingAvg = (6.8 + (player.overall * 0.015) + (Math.random() * 0.4)).toFixed(1);

  // Cálculo Dinámico de Años y Meses de Contrato Restantes
  const contractYears = player.contractYears !== undefined ? player.contractYears : 3;
  const maxWeeks = gameState.maxWeeks || 38;
  const currentWeek = gameState.week || 1;
  const monthsRemaining = Math.max(1, (contractYears * 12) - Math.floor((currentWeek / maxWeeks) * 12));

  const currentInstruction = player.individualInstruction || (TACTICAL_ROLES_BY_POS[player.pos]?.[0] || 'Rol Estándar');
  const availableRoles = TACTICAL_ROLES_BY_POS[player.pos] || ['Rol Estándar'];

  modal.innerHTML = `
    <div class="modal-card glass-panel" style="max-width: 650px;">
      <!-- Encabezado del Jugador -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <span class="pos-tag pos-${player.pos}" style="font-size: 1.1rem; padding: 8px 16px;">${player.pos}</span>
          <div>
            <h2 style="margin: 0; font-size: 1.6rem; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">${player.name} ${player.country ? renderCountryFlagSVG(player.country, 18) : ''}</h2>
            <span class="text-sub">Edad Actual: <strong>${player.age} años</strong> | Morale: <strong>${player.morale || 90}%</strong> | Forma: <strong>${player.form || 85}%</strong></span>
          </div>
        </div>
        <button id="btnCloseInspector" class="btn-secondary btn-sm" style="font-size: 1.2rem;">✖</button>
      </div>

      <!-- Atributos y Valor de Mercado -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 20px;">
        <div class="bonus-item text-center" style="flex-direction: column;">
          <span class="text-sub">OVR ACTUAL</span>
          <strong class="stat-ovr" style="font-size: 1.3rem;">${player.overall}</strong>
        </div>
        <div class="bonus-item text-center" style="flex-direction: column;">
          <span class="text-sub">POTENCIAL</span>
          <strong class="text-highlight" style="font-size: 1.3rem;">${player.potential || player.overall}</strong>
        </div>
        <div class="bonus-item text-center" style="flex-direction: column;">
          <span class="text-sub">VALOR DE MERCADO</span>
          <strong style="font-size: 1.1rem; color: #ffffff;">€${(player.value / 1000000).toFixed(1)}M</strong>
        </div>
        <div class="bonus-item text-center" style="flex-direction: column;">
          <span class="text-sub">SALARIO SEMANAL</span>
          <strong style="font-size: 1.1rem; color: var(--accent-gold);">€${(player.salary / 1000).toFixed(0)}K/sem</strong>
        </div>
      </div>

      <!-- v2.0: GRÁFICO RADAR HEXAGONAL DE ATRIBUTOS EN CANVAS PURO (FASE 5B) -->
      <div style="background: #0d1320; border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; margin-bottom: 20px; text-align: center;">
        <div style="font-size:0.8rem; font-weight:800; color:var(--accent-cyan); margin-bottom:8px;">📊 GRÁFICO RADAR DE ATRIBUTOS (6 DIMENSIONES)</div>
        <canvas id="playerRadarCanvas" width="300" height="240" style="max-width:100%; border-radius:6px; background:#070b12;"></canvas>
      </div>

      <!-- Instrucciones Tácticas Individuales Estilo EA FC -->
      ${isOwnPlayer ? `
        <div style="background: #141d2e; border: 1px solid var(--border-color); padding: 14px; border-radius: 10px; margin-bottom: 20px;">
          <label style="font-size: 0.88rem; font-weight: 800; color: var(--accent-cyan); display: block; margin-bottom: 6px;">
            ⚙️ Rol Táctico e Instrucción Individual en Cancha:
          </label>
          <select id="selectIndividualRole" class="input-select" style="width: 100%;">
            ${availableRoles.map(r => `
              <option value="${r}" ${r === currentInstruction ? 'selected' : ''}>${r}</option>
            `).join('')}
          </select>
        </div>
      ` : ''}

      <!-- Estadísticas de Rendimiento y Vínculo contractual Actualizado -->
      <div style="background: #141d2e; border: 1px solid var(--border-color); padding: 16px; border-radius: 10px; margin-bottom: 20px;">
        <h4 style="margin-bottom: 10px; color: var(--accent-green);">📊 Rendimiento Deportivo & Estado del Contrato</h4>
        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-size: 0.9rem; margin-bottom: 12px;">
          <span>Partidos Jugados (PJ): <strong>${appearances}</strong></span>
          <span>Goles Marcados: <strong>${goals} ⚽</strong></span>
          <span>Promedio de Calificación: <strong>${ratingAvg} ⭐</strong></span>
          <span>Vínculo contractual: <strong style="color: ${contractYears <= 1 ? 'var(--accent-red)' : 'var(--accent-gold)'}">${contractYears} Años (${monthsRemaining} Meses restantes)</strong></span>
        </div>

        <!-- ── v2.0: TABLA DE HISTORIAL DE RENDIMIENTO DE TEMPORADAS PASADAS (FASE 5B) ── -->
        ${(player.statsHistory && player.statsHistory.length > 0) ? `
          <div style="border-top:1px solid var(--border-color); padding-top:10px; margin-top:10px;">
            <div style="font-size:0.8rem; font-weight:800; color:var(--accent-gold); margin-bottom:6px;">📜 Histórico de Temporadas Anteriores</div>
            <table class="data-table" style="font-size:0.75rem;">
              <thead>
                <tr>
                  <th>Temporada</th>
                  <th>OVR</th>
                  <th>PJ</th>
                  <th>Goles</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                ${player.statsHistory.map(h => `
                  <tr>
                    <td>T${h.season}</td>
                    <td><span class="stat-ovr">${h.ovr}</span></td>
                    <td>${h.appearances}</td>
                    <td>${h.goals} ⚽</td>
                    <td>${h.ratingAvg || '6.8'} ⭐</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>

      <!-- Panel de Ofertas de Venta (1-3 postores, estilo EA FC) -->
      ${isOwnPlayer ? `
        <div id="sellOffersPanel" class="hidden" style="background: #141d2e; border: 1px solid var(--border-color); padding: 14px; border-radius: 10px; margin-bottom: 16px;"></div>
      ` : ''}

      <!-- Panel de Acciones Directivas Estilo EA FC -->
      ${isOwnPlayer ? `
        <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
          <button id="btnSellPlayer" class="btn-primary" style="background: var(--accent-red); color: #fff;">
            💰 VENDER JUGADOR (Aceptar Oferta de Mercado)
          </button>
          <button id="btnRenewContract" class="btn-primary" style="background: var(--accent-gold); color: #000;">
            📝 RENOVAR CONTRATO (+2 AÑOS)
          </button>
          <button id="btnSwapPlayer" class="btn-secondary">
            🔄 PROPONER TRUEQUE / INTERCAMBIO
          </button>
        </div>
      ` : `
        <div class="text-center">
          <p class="text-sub">Este futbolista pertenece a un club rival. Para ficharlo, dirígete al Mercado de Fichajes.</p>
        </div>
      `}

      <div id="inspectorFeedback" class="mt-3 text-center text-highlight hidden"></div>
    </div>
  `;

  modal.classList.remove('hidden');

  // Renderizar Gráfico Radar Hexagonal en Canvas puro
  const radarCanvas = document.getElementById('playerRadarCanvas');
  if (radarCanvas) {
    drawPlayerRadarCanvas(radarCanvas as HTMLCanvasElement, player);
  }

  function drawPlayerRadarCanvas(canvas: HTMLCanvasElement, p: Player): void {
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2, r = 75;

    ctx.clearRect(0, 0, w, h);

    const stats = [
      { label: 'PAC', val: p.pac || 75 },
      { label: 'SHO', val: p.sho || 75 },
      { label: 'PAS', val: p.pas || 75 },
      { label: 'DRI', val: p.dri || 75 },
      { label: 'DEF', val: p.def || 75 },
      { label: 'PHY', val: p.phy || 75 },
    ];

    const totalAxes = stats.length;
    const angleStep = (Math.PI * 2) / totalAxes;

    // Dibujar rejilla hexagonal concéntrica (niveles 25, 50, 75, 100)
    [0.25, 0.50, 0.75, 1.0].forEach(level => {
      ctx.beginPath();
      for (let i = 0; i < totalAxes; i++) {
        const a = i * angleStep - Math.PI / 2;
        const x = cx + Math.cos(a) * (r * level);
        const y = cy + Math.sin(a) * (r * level);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = level === 1.0 ? 'rgba(0,200,133,0.4)' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Dibujar ejes radiados y etiquetas
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < totalAxes; i++) {
      const a = i * angleStep - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.stroke();

      // Posición texto etiqueta
      const lx = cx + Math.cos(a) * (r + 18);
      const ly = cy + Math.sin(a) * (r + 14);
      ctx.fillStyle = '#00c885';
      ctx.fillText(`${stats[i]!.label} ${stats[i]!.val}`, lx, ly);
    }

    // Polígono de los atributos del jugador
    ctx.beginPath();
    for (let i = 0; i < totalAxes; i++) {
      const a = i * angleStep - Math.PI / 2;
      const normVal = Math.min(100, Math.max(30, stats[i]!.val)) / 100;
      const x = cx + Math.cos(a) * (r * normVal);
      const y = cy + Math.sin(a) * (r * normVal);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 200, 133, 0.35)';
    ctx.fill();
    ctx.strokeStyle = '#00c885';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const feedbackEl = document.getElementById('inspectorFeedback');
  const closeBtn = document.getElementById('btnCloseInspector');

  closeBtn!.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  if (isOwnPlayer) {
    const roleSelect = document.getElementById('selectIndividualRole');
    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        player.individualInstruction = target.value;
        db.saveGame();
        sfx.playClick();
        feedbackEl!.innerText = `¡Rol Táctico guardado: "${target.value}"!`;
        feedbackEl!.classList.remove('hidden');
        setTimeout(() => feedbackEl!.classList.add('hidden'), 2000);
      });
    }

    // 1. VENDER JUGADOR — mercado con 1-3 postores reales (estilo EA FC)
    document.getElementById('btnSellPlayer')!.addEventListener('click', () => {
      sfx.playClick();
      const offersPanel = document.getElementById('sellOffersPanel');
      if (!offersPanel) return;

      // Postores: clubes con presupuesto suficiente, ordenados por poderío económico
      const availableTeams = Object.values(db.teams).filter(t => t.id !== userTeamId);
      let bidders = availableTeams
        .filter(t => (t.budget || 0) >= player.value * 0.6)
        .sort((a, b) => (b.budget || 0) - (a.budget || 0))
        .slice(0, 3);
      if (bidders.length === 0) {
        bidders = [...availableTeams].sort(() => Math.random() - 0.5).slice(0, 2);
      }

      // Cada postor ofrece entre el 95% y el 125% del valor del jugador
      const offers = bidders.map(t => ({
        team: t,
        fee: Math.round(player.value * (0.95 + Math.random() * 0.30))
      }));

      offersPanel.classList.remove('hidden');
      offersPanel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
          <h4 style="margin: 0; color: var(--accent-green); font-size: 0.95rem;">💼 OFERTAS RECIBIDAS POR ${player.name.toUpperCase()}</h4>
          <button class="btn-secondary btn-sm" id="btnDeclineAllOffers">✖ Rechazar todas</button>
        </div>
        ${offers.map(o => `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #0f172a; border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 10px;">
              ${renderTeamBadgeSVG(o.team, 36)}
              <div>
                <strong style="font-size: 0.9rem;">${o.team.name}</strong>
                <div class="text-sub" style="font-size: 0.72rem;">OVR ${o.team.overall} · Reputación ${o.team.reputation}</div>
              </div>
            </div>
            <button class="btn-primary btn-sm btn-accept-bid" data-id="${o.team.id}" data-fee="${o.fee}">
              💰 Aceptar €${(o.fee / 1000000).toFixed(1)}M
            </button>
          </div>
        `).join('')}
      `;

      // Aceptar una oferta concreta
      offersPanel.querySelectorAll('.btn-accept-bid').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.currentTarget as HTMLElement;
          const buyerTeam = db.teams[target.dataset.id!]!;
          const fee = Number(target.dataset.fee);

          gameState.budget += fee;
          gameState.wageBudget += player.salary;

          const squad = db.getTeamPlayers(userTeamId);
          const idx = squad.findIndex(p => p.id === player.id);
          if (idx !== -1) squad.splice(idx, 1);

          player.teamId = buyerTeam.id;
          db.getTeamPlayers(buyerTeam.id).push(player);

          if (!gameState.seasonPlayersOut) gameState.seasonPlayersOut = [];
          gameState.seasonPlayersOut.push(`${player.name} → ${buyerTeam.name}`);

          gameState.eventsLog.unshift({
            date: `Semana ${gameState.week}`,
            text: `💰 VENTA OFICIAL: ${player.name} fue vendido a ${buyerTeam.name} por €${(fee / 1000000).toFixed(1)}M.`
          });

          // Recalcular el OVR del equipo con el XI resultante
          db.updateUserTeamOverall();
          db.saveGame();
          sfx.playGoal();
          alert(`¡VENTA COMPLETADA! ${player.name} se unió a ${buyerTeam.name}. Se sumaron €${(fee / 1000000).toFixed(1)}M a tu presupuesto.`);

          modal.classList.add('hidden');
          if (onUpdate) onUpdate();
        });
      });

      // Rechazar todas las ofertas
      document.getElementById('btnDeclineAllOffers')?.addEventListener('click', () => {
        offersPanel.classList.add('hidden');
        offersPanel.innerHTML = '';
      });
    });

    // 2. RENOVAR CONTRATO
    document.getElementById('btnRenewContract')!.addEventListener('click', () => {
      sfx.playClick();
      const newWage = Math.round(player.salary * 1.10);
      const newYears = Math.min(5, (player.contractYears || 2) + 2);

      if (confirm(`📝 NEGOCIACIÓN DE RENOVACIÓN:\n\n¿Ofrecer a ${player.name} una extensión de ${newYears} años de contrato con un salario ajustado de €${(newWage / 1000).toFixed(0)}K/sem?`)) {
        player.contractYears = newYears;
        player.salary = newWage;
        player.morale = 100;

        gameState.eventsLog.unshift({
          date: `Semana ${gameState.week}`,
          text: `📝 RENOVACIÓN: ${player.name} renovó su contrato por ${newYears} años con el club.`
        });

        db.saveGame();
        sfx.playGoal();
        alert(`¡RENOVACIÓN FIRMADA! ${player.name} aseguró su permanencia por ${newYears} temporadas adicionales.`);

        modal.classList.add('hidden');
        if (onUpdate) onUpdate();
      }
    });

    // 3. PROPONER TRUEQUE / INTERCAMBIO
    document.getElementById('btnSwapPlayer')!.addEventListener('click', () => {
      sfx.playClick();
      const availableTeams = Object.values(db.teams).filter(t => t.id !== userTeamId);
      const targetTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)]!;
      const targetPlayers = db.getTeamPlayers(targetTeam.id);
      
      const suitableTarget = targetPlayers.find(p => Math.abs(p.overall - player.overall) <= 3) || targetPlayers[0];

      if (suitableTarget) {
        if (confirm(`🔄 PROPUESTA DE TRUEQUE CON ${targetTeam.name.toUpperCase()}:\n\n¿Ofrecer a ${player.name} (OVR ${player.overall}) a cambio de ${suitableTarget.name} (${suitableTarget.pos}, OVR ${suitableTarget.overall})?`)) {
          const userSquad = db.getTeamPlayers(userTeamId);
          const rivalSquad = db.getTeamPlayers(targetTeam.id);

          const idx1 = userSquad.findIndex(p => p.id === player.id);
          const idx2 = rivalSquad.findIndex(p => p.id === suitableTarget.id);

          if (idx1 !== -1) userSquad.splice(idx1, 1);
          if (idx2 !== -1) rivalSquad.splice(idx2, 1);

          player.teamId = targetTeam.id;
          suitableTarget.teamId = userTeamId;

          userSquad.push(suitableTarget);
          rivalSquad.push(player);

          gameState.eventsLog.unshift({
            date: `Semana ${gameState.week}`,
            text: `🔄 INTERCAMBIO OFICIAL: ${player.name} traspasado a ${targetTeam.name} a cambio de ${suitableTarget.name}.`
          });

          db.saveGame();
          sfx.playGoal();
          alert(`¡TRUEQUE EXITOSO! ${suitableTarget.name} (${suitableTarget.pos}, OVR ${suitableTarget.overall}) se ha incorporado a tu equipo.`);

          modal.classList.add('hidden');
          if (onUpdate) onUpdate();
        }
      } else {
        alert('No se encontró un jugador compatible para trueque en este momento.');
      }
    });
  }
}
