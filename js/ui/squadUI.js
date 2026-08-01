// Vista de Alineación, Plantilla y Tácticas con Drag and Drop 2D

import { db } from '../data/db.js';
import { TacticsEngine, FORMATIONS } from '../engine/tactics.js';
import { sfx } from '../../assets/audio/sfx.js';

export function renderSquad(container) {
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
          <h3>⚽ Formación Táctica: ${currentFormation} (Arrastra para intercambiar)</h3>
          <span class="ovr-badge stat-ovr">Nivel Táctico: ${effectiveOvr}</span>
        </div>
        
        <div class="football-pitch" id="pitchArea">
          <div class="pitch-lines">
            <div class="center-circle"></div>
            <div class="penalty-box top"></div>
            <div class="penalty-box bottom"></div>
          </div>

          <!-- Jugadores en cancha -->
          ${startingXI.map((item, idx) => `
            <div class="player-pitch-card" 
                 draggable="true" 
                 data-id="${item.player.id}" 
                 data-idx="${idx}"
                 style="left: ${item.slot.x}%; top: ${item.slot.y}%;">
              <div class="player-number">${item.player.overall}</div>
              <div class="player-name">${item.player.name.split(' ').pop()}</div>
              <div class="player-pos-badge">${item.slot.role}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Panel de Ajustes Tácticos y Banca de Suplentes -->
      <div class="tactics-panel glass-panel">
        <h3>⚙️ Estrategia y Roles</h3>
        
        <div class="form-group">
          <label>Formación Táctica:</label>
          <select id="selectFormation" class="input-select">
            ${Object.keys(FORMATIONS).map(fKey => `
              <option value="${fKey}" ${fKey === currentFormation ? 'selected' : ''}>${FORMATIONS[fKey].name}</option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Estilo de Juego:</label>
          <select id="selectStyle" class="input-select">
            <option value="Tiki-Taka" ${gameState.tactics.style === 'Tiki-Taka' ? 'selected' : ''}>Tiki-Taka (Posesión)</option>
            <option value="Contraataque" ${gameState.tactics.style === 'Contraataque' ? 'selected' : ''}>Contraataque Veloz</option>
            <option value="Balón Largo" ${gameState.tactics.style === 'Balón Largo' ? 'selected' : ''}>Balón Largo / Directo</option>
            <option value="Presión Alta" ${gameState.tactics.style === 'Presión Alta' ? 'selected' : ''}>Presión Asfixiante</option>
          </select>
        </div>

        <h3>📋 Suplentes (Arrastra hacia la Cancha)</h3>
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
                <tr class="draggable-sub-row" draggable="true" data-id="${p.id}">
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

  // Configurar Drag and Drop API
  const pitchCards = document.querySelectorAll('.player-pitch-card');
  const subRows = document.querySelectorAll('.draggable-sub-row');

  // Dragstart
  const handleDragStart = (e) => {
    draggedPlayerId = e.currentTarget.dataset.id;
    e.dataTransfer.setData('text/plain', draggedPlayerId);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  pitchCards.forEach(card => {
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
        // Intercambiar posiciones en el squad
        const p1 = squad.find(p => p.id === draggedPlayerId);
        const p2 = squad.find(p => p.id === targetId);

        if (p1 && p2) {
          const tempOvr = p1.overall;
          p1.overall = p2.overall;
          p2.overall = tempOvr;
          sfx.playClick();
          db.saveGame();
          renderSquad(container);
        }
      }
    });
  });

  subRows.forEach(row => {
    row.addEventListener('dragstart', handleDragStart);
    row.addEventListener('dragend', handleDragEnd);
  });

  // Handlers para cambios de formación y tácticas
  document.getElementById('selectFormation').addEventListener('change', (e) => {
    sfx.playClick();
    gameState.tactics.formation = e.target.value;
    db.saveGame();
    renderSquad(container);
  });

  document.getElementById('selectStyle').addEventListener('change', (e) => {
    gameState.tactics.style = e.target.value;
    db.saveGame();
  });
}
