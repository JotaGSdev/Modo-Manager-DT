// Vista de Tácticas & Alineación 2D Estilo EA FC / FIFA (Drag and Drop, Formaciones y Auto-Alineación)

import { db } from '../data/db.js';
import { TacticsEngine, FORMATIONS, FC_IQ_ROLES } from '../engine/tactics.js';
import { openPlayerInspectorModal } from './playerInspectorUI.js';
import { sfx } from '../../assets/audio/sfx.js';

export function renderTactics(container) {
  const gameState = db.gameState;
  const squad = db.getTeamPlayers(gameState.userTeamId);
  const currentFormation = gameState.tactics.formation || '4-3-3';
  const { startingXI, substitutes } = TacticsEngine.getBestStartingXI(squad, currentFormation);
  const effectiveOvr = TacticsEngine.calculateEffectiveRating(startingXI, gameState.tactics);

  let draggedPlayerId = null;

  container.innerHTML = `
    <div class="squad-layout">
      <!-- Cancha 2D interactiva con Drag and Drop -->
      <div class="pitch-container glass-panel">
        <div class="pitch-header">
          <h3>⚽ Formación Táctica: ${currentFormation} (Arrastra jugadores para cambiar posiciones)</h3>
          <span class="ovr-badge stat-ovr">Nivel Táctico: ${effectiveOvr}</span>
        </div>
        
        <div class="football-pitch" id="pitchArea">
          <div class="pitch-lines">
            <div class="center-circle"></div>
            <div class="penalty-box top"></div>
            <div class="penalty-box bottom"></div>
          </div>

          <!-- Jugadores en cancha con selector de Rol FC IQ (v2.0) -->
          ${startingXI.map((item, idx) => {
            const playerPos = item.slot.role;
            const availableRoles = FC_IQ_ROLES[playerPos] || ['Estándar'];
            const currentRole = item.player.fcIqRole || availableRoles[0];

            return `
              <div class="player-pitch-card" 
                   draggable="true" 
                   data-id="${item.player.id}" 
                   data-idx="${idx}"
                   style="left: ${item.slot.x}%; top: ${item.slot.y}%;">
                <div class="player-number">${item.player.overall}</div>
                <div class="player-name">${item.player.name.split(' ').pop()}</div>
                <div class="player-pos-badge" style="background:var(--accent-gold); color:#000;">${item.slot.role}</div>
                
                <!-- Selector de Rol FC IQ -->
                <select class="fc-iq-role-select" 
                        data-player-id="${item.player.id}" 
                        onclick="event.stopPropagation();"
                        style="font-size:0.62rem; font-weight:800; background:rgba(15,23,42,0.9); color:var(--accent-cyan); border:1px solid var(--accent-cyan); border-radius:3px; margin-top:2px; cursor:pointer; max-width:85px;">
                  ${availableRoles.map(r => `
                    <option value="${r}" ${r === currentRole ? 'selected' : ''}>${r}</option>
                  `).join('')}
                </select>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Panel de Ajustes Tácticos y Banca de Suplentes -->
      <div class="tactics-panel glass-panel">
        <!-- BOTÓN DE AJUSTE AUTOMÁTICO DE MEJORES 11 -->
        <button id="btnAutoXI" class="btn-primary mb-3" style="width: 100%; font-size: 1rem; padding: 14px; background: var(--accent-gold); color: #000; font-weight: 800;">
          ⚡ AUTO-ALINEACIÓN (MEJORES 11 TITULARES)
        </button>

        <h3>⚙️ Estrategia y Sistema de Juego</h3>
        
        <div class="form-group mb-3">
          <label>Formación Táctica:</label>
          <select id="selectFormation" class="input-select">
            ${Object.keys(FORMATIONS).map(fKey => `
              <option value="${fKey}" ${fKey === currentFormation ? 'selected' : ''}>${FORMATIONS[fKey].name}</option>
            `).join('')}
          </select>
        </div>

        <div class="form-group mb-3">
          <label>Estilo de Juego Real:</label>
          <select id="selectStyle" class="input-select">
            <option value="Tiki-Taka" ${gameState.tactics.style === 'Tiki-Taka' ? 'selected' : ''}>⚽ Tiki-Taka & Juego de Posición</option>
            <option value="Gegenpressing" ${gameState.tactics.style === 'Gegenpressing' ? 'selected' : ''}>⚡ Gegenpressing & Presión Alta</option>
            <option value="Catenaccio" ${gameState.tactics.style === 'Catenaccio' ? 'selected' : ''}>🚌 Catenaccio & Bloque Bajo (El Autobús)</option>
            <option value="Juego por Bandas" ${gameState.tactics.style === 'Juego por Bandas' ? 'selected' : ''}>🌊 Juego por Bandas & Centros</option>
            <option value="Contraataque" ${gameState.tactics.style === 'Contraataque' ? 'selected' : ''}>🎯 Contraataque Directo & Balón Largo</option>
          </select>
        </div>

        <!-- MÓDULO DE NIVELES TÁCTICOS DEL ENTRENADOR (EXP) -->
        <div style="background: #0f172a; border: 1px solid var(--border-color); padding: 12px; border-radius: 10px; margin-bottom: 16px;">
          <h4 style="color: var(--accent-gold); font-size: 0.88rem; margin-bottom: 6px;">🧠 Habilidades Tácticas de Entrenador</h4>
          <p class="text-sub" style="font-size: 0.78rem; margin-bottom: 10px;">EXP Táctica Acumulada: <strong class="text-highlight">${(gameState.managerTactics?.exp || 400)} EXP</strong></p>
          
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: #141d2e; padding: 8px 10px; border-radius: 6px;">
              <span style="font-size: 0.8rem;">⚽ Pases & Posesión: <strong>Nivel ${gameState.managerTactics?.skillLevels?.skill1 || 1}/10</strong></span>
              <button class="btn-primary btn-sm btn-upgrade-skill" data-skill="skill1">Subir (+1)</button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: #141d2e; padding: 8px 10px; border-radius: 6px;">
              <span style="font-size: 0.8rem;">🔥 Potrero & Balón Parado: <strong>Nivel ${gameState.managerTactics?.skillLevels?.skill2 || 1}/10</strong></span>
              <button class="btn-primary btn-sm btn-upgrade-skill" data-skill="skill2">Subir (+1)</button>
            </div>
          </div>
        </div>

        <h3>📋 Suplentes (Haz clic para Inspeccionar/Vender)</h3>
        <div class="squad-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>POS</th>
                <th>Nombre</th>
                <th>OVR</th>
                <th>Edad</th>
              </tr>
            </thead>
            <tbody>
              ${substitutes.map(p => `
                <tr class="draggable-sub-row" draggable="true" data-id="${p.id}" style="cursor: pointer;">
                  <td><span class="pos-tag pos-${p.pos}">${p.pos}</span></td>
                  <td><strong>${p.name}</strong></td>
                  <td><span class="stat-ovr">${p.overall}</span></td>
                  <td>${p.age}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // BOTÓN AUTO-ALINEACIÓN
  document.getElementById('btnAutoXI').addEventListener('click', () => {
    sfx.playClick();
    const { startingXI: bestXI, substitutes: bestSubs } = TacticsEngine.getBestStartingXI(squad, currentFormation);
    
    const newOrder = [
      ...bestXI.map(item => item.player),
      ...bestSubs
    ];

    squad.length = 0;
    squad.push(...newOrder);

    db.saveGame();
    renderTactics(container);
  });

  // Configurar Drag and Drop API y Clics de Inspección
  const pitchCards = document.querySelectorAll('.player-pitch-card');
  const subRows = document.querySelectorAll('.draggable-sub-row');

  const handleDragStart = (e) => {
    draggedPlayerId = e.currentTarget.dataset.id;
    e.dataTransfer.setData('text/plain', draggedPlayerId);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  pitchCards.forEach(card => {
    card.addEventListener('click', () => {
      if (!card.classList.contains('dragging')) {
        const playerId = card.dataset.id;
        const player = squad.find(p => p.id === playerId);
        if (player) {
          sfx.playClick();
          openPlayerInspectorModal(player, () => renderTactics(container));
        }
      }
    });

    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const targetId = card.dataset.id;

      if (draggedPlayerId && targetId && draggedPlayerId !== targetId) {
        const p1 = squad.find(p => p.id === draggedPlayerId);
        const p2 = squad.find(p => p.id === targetId);

        if (p1 && p2) {
          const idx1 = squad.indexOf(p1);
          const idx2 = squad.indexOf(p2);
          squad[idx1] = p2;
          squad[idx2] = p1;

          sfx.playClick();
          db.saveGame();
          renderTactics(container);
        }
      }
    });
  });

  subRows.forEach(row => {
    row.addEventListener('click', () => {
      const playerId = row.dataset.id;
      const player = squad.find(p => p.id === playerId);
      if (player) {
        sfx.playClick();
        openPlayerInspectorModal(player, () => renderTactics(container));
      }
    });

    row.addEventListener('dragstart', handleDragStart);
    row.addEventListener('dragend', handleDragEnd);
  });

  document.querySelectorAll('.btn-upgrade-skill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      sfx.playClick();
      const skillKey = e.currentTarget.dataset.skill;
      const res = TacticsEngine.upgradeManagerSkill(skillKey);
      if (res.success) {
        sfx.playGoal();
        alert(res.message);
        renderTactics(container);
      } else {
        alert(res.reason);
      }
    });
  });

  // Handlers para cambios de rol FC IQ
  document.querySelectorAll('.fc-iq-role-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      e.stopPropagation();
      const playerId = e.target.dataset.playerId;
      const roleVal = e.target.value;
      const player = squad.find(p => p.id === playerId);
      if (player) {
        player.fcIqRole = roleVal;
        db.saveGame();
        sfx.playClick();
        renderTactics(container);
      }
    });
  });

  // Handlers para cambios de formación y tácticas
  document.getElementById('selectFormation').addEventListener('change', (e) => {
    sfx.playClick();
    gameState.tactics.formation = e.target.value;
    db.saveGame();
    renderTactics(container);
  });

  document.getElementById('selectStyle').addEventListener('change', (e) => {
    gameState.tactics.style = e.target.value;
    db.saveGame();
  });
}
