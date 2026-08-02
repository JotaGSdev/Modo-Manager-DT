// Inspector de Jugador Estilo EA FC / FIFA: Estadísticas de Temporada, Ventas, Renovaciones e Intercambios

import { db } from '../data/db.js';
import { sfx } from '../../assets/audio/sfx.js';
import { calculatePlayerMarketValue, calculatePlayerSalary } from '../data/teamData.js';

export function openPlayerInspectorModal(player, onUpdate) {
  const gameState = db.gameState;
  const userTeamId = gameState.userTeamId;
  const isOwnPlayer = player.teamId === userTeamId;

  let modal = document.getElementById('playerInspectorModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'playerInspectorModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  const appearances = player.appearances || 0;
  const goals = player.seasonGoals || 0;
  const ratingAvg = (6.8 + (player.overall * 0.015) + (Math.random() * 0.4)).toFixed(1);
  const contractYears = player.contractYears || 3;

  modal.innerHTML = `
    <div class="modal-card glass-panel" style="max-width: 650px;">
      <!-- Encabezado del Jugador -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <span class="pos-tag pos-${player.pos}" style="font-size: 1.1rem; padding: 8px 16px;">${player.pos}</span>
          <div>
            <h2 style="margin: 0; font-size: 1.6rem;">${player.name}</h2>
            <span class="text-sub">Edad: ${player.age} años | Morale: <strong>${player.morale || 90}%</strong> | Forma: <strong>${player.form || 85}%</strong></span>
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

      <!-- Atributos Hexagonales / Físicos -->
      <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 20px; background: #0d1320; padding: 12px; border-radius: 8px; text-align: center;">
        <div><span class="text-sub" style="font-size: 0.75rem;">PAC</span><br><strong>${player.pac || 75}</strong></div>
        <div><span class="text-sub" style="font-size: 0.75rem;">SHO</span><br><strong>${player.sho || 75}</strong></div>
        <div><span class="text-sub" style="font-size: 0.75rem;">PAS</span><br><strong>${player.pas || 75}</strong></div>
        <div><span class="text-sub" style="font-size: 0.75rem;">DRI</span><br><strong>${player.dri || 75}</strong></div>
        <div><span class="text-sub" style="font-size: 0.75rem;">DEF</span><br><strong>${player.def || 75}</strong></div>
        <div><span class="text-sub" style="font-size: 0.75rem;">PHY</span><br><strong>${player.phy || 75}</strong></div>
      </div>

      <!-- Estadísticas de Rendimiento en la Temporada -->
      <div style="background: #141d2e; border: 1px solid var(--border-color); padding: 16px; border-radius: 10px; margin-bottom: 20px;">
        <h4 style="margin-bottom: 10px; color: var(--accent-green);">📊 Rendimiento Deportivo de la Temporada</h4>
        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-size: 0.9rem;">
          <span>Partidos Jugados (PJ): <strong>${appearances}</strong></span>
          <span>Goles Marcados: <strong>${goals} ⚽</strong></span>
          <span>Promedio de Calificación: <strong>${ratingAvg} ⭐</strong></span>
          <span>Contrato Restante: <strong>${contractYears} años</strong></span>
        </div>
      </div>

      <!-- Panel de Acciones Directivas Estilo EA FC -->
      ${isOwnPlayer ? `
        <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
          <button id="btnSellPlayer" class="btn-primary" style="background: var(--accent-red); color: #fff;">
            💰 VENDER JUGADOR (Aceptar Oferta de Mercado)
          </button>
          <button id="btnRenewContract" class="btn-primary" style="background: var(--accent-gold); color: #000;">
            📝 RENOVAR CONTRATO (Extender Años)
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

  const feedbackEl = document.getElementById('inspectorFeedback');
  const closeBtn = document.getElementById('btnCloseInspector');

  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  if (isOwnPlayer) {
    // 1. VENDER JUGADOR
    document.getElementById('btnSellPlayer').addEventListener('click', () => {
      sfx.playClick();
      const availableTeams = Object.values(db.teams).filter(t => t.id !== userTeamId);
      const buyerTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];
      
      const offerMultiplier = 1.05 + Math.random() * 0.20; // 105% a 125% de su valor
      const offerFee = Math.round(player.value * offerMultiplier);

      if (confirm(`💰 OFERTA DE COMPRA DE ${buyerTeam.name.toUpperCase()}:\n\n¿Deseas aceptar la oferta de transferencia por €${(offerFee / 1000000).toFixed(1)}M por ${player.name}?`)) {
        // Ejecutar venta
        gameState.budget += offerFee;
        gameState.wageBudget += player.salary;

        const squad = db.getTeamPlayers(userTeamId);
        const idx = squad.findIndex(p => p.id === player.id);
        if (idx !== -1) squad.splice(idx, 1);

        player.teamId = buyerTeam.id;
        db.getTeamPlayers(buyerTeam.id).push(player);

        gameState.eventsLog.unshift({
          date: `Semana ${gameState.week}`,
          text: `💰 VENTA OFICIAL: ${player.name} fue vendido a ${buyerTeam.name} por €${(offerFee / 1000000).toFixed(1)}M.`
        });

        db.saveGame();
        sfx.playGoal();
        alert(`¡VENTA COMPLETADA! ${player.name} se unió a ${buyerTeam.name}. Se sumaron €${(offerFee / 1000000).toFixed(1)}M a tu presupuesto.`);

        modal.classList.add('hidden');
        if (onUpdate) onUpdate();
      }
    });

    // 2. RENOVAR CONTRATO
    document.getElementById('btnRenewContract').addEventListener('click', () => {
      sfx.playClick();
      const newWage = Math.round(player.salary * 1.15); // 15% de aumento
      const newYears = Math.min(5, (player.contractYears || 3) + 2);

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
    document.getElementById('btnSwapPlayer').addEventListener('click', () => {
      sfx.playClick();
      const availableTeams = Object.values(db.teams).filter(t => t.id !== userTeamId);
      const targetTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];
      const targetPlayers = db.getTeamPlayers(targetTeam.id);
      
      const suitableTarget = targetPlayers.find(p => Math.abs(p.overall - player.overall) <= 3) || targetPlayers[0];

      if (suitableTarget) {
        if (confirm(`🔄 PROPUESTA DE TRUEQUE CON ${targetTeam.name.toUpperCase()}:\n\n¿Ofrecer a ${player.name} (OVR ${player.overall}) a cambio de ${suitableTarget.name} (${suitableTarget.pos}, OVR ${suitableTarget.overall})?`)) {
          // Intercambiar jugadores en las plantillas
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
