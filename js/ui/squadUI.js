// Vista Dedicada a la Gestión Organizada de la Plantilla (Squad Hub Estilo EA FC / FIFA)

import { db } from '../data/db.js';
import { openPlayerInspectorModal } from './playerInspectorUI.js';
import { sfx } from '../../assets/audio/sfx.js';

const POS_ORDER = { 'POR': 1, 'DFC': 2, 'LI': 3, 'LD': 4, 'MCD': 5, 'MC': 6, 'MCO': 7, 'EI': 8, 'ED': 9, 'DC': 10 };

export function renderSquad(container) {
  const gameState = db.gameState;
  const squad = db.getTeamPlayers(gameState.userTeamId);
  const userTeam = db.teams[gameState.userTeamId];

  let currentFilter = 'ALL';
  let searchQuery = '';

  const renderTable = () => {
    const listEl = document.getElementById('squadTableBody');
    if (!listEl) return;

    // Ordenar ordenadamente por posición heráldica de fútbol y luego por media (OVR)
    let filtered = [...squad].sort((a, b) => {
      const p1 = POS_ORDER[a.pos] || 99;
      const p2 = POS_ORDER[b.pos] || 99;
      if (p1 !== p2) return p1 - p2;
      return b.overall - a.overall;
    });

    if (currentFilter !== 'ALL') {
      if (currentFilter === 'POR') filtered = filtered.filter(p => p.pos === 'POR');
      else if (currentFilter === 'DEF') filtered = filtered.filter(p => ['DFC', 'LI', 'LD'].includes(p.pos));
      else if (currentFilter === 'MED') filtered = filtered.filter(p => ['MCD', 'MC', 'MCO', 'MI', 'MD'].includes(p.pos));
      else if (currentFilter === 'DEL') filtered = filtered.filter(p => ['EI', 'ED', 'DC'].includes(p.pos));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.pos.toLowerCase().includes(q));
    }

    listEl.innerHTML = filtered.length === 0 ? `
      <tr><td colspan="9" class="text-sub text-center py-4">No se encontraron futbolistas con los filtros seleccionados.</td></tr>
    ` : filtered.map(p => {
      const roleText = p.individualInstruction || 'Estándar';
      const contractYears = p.contractYears || 3;

      return `
        <tr class="player-squad-row" data-id="${p.id}" style="cursor: pointer;">
          <td><span class="pos-tag pos-${p.pos}">${p.pos}</span></td>
          <td>
            <strong>${p.name}</strong><br>
            <span class="text-sub" style="font-size: 0.75rem;">Rol: ${roleText}</span>
          </td>
          <td>${p.age}a</td>
          <td><span class="stat-ovr">${p.overall}</span></td>
          <td><span class="text-highlight">${p.potential || p.overall}</span></td>
          <td>€${(p.value / 1000000).toFixed(1)}M</td>
          <td style="color: var(--accent-gold);">€${(p.salary / 1000).toFixed(0)}K/s</td>
          <td>${contractYears}a</td>
          <td text-center">
            <button class="btn-primary btn-sm btn-inspect-player" data-id="${p.id}">🔍 Gestionar / Vender</button>
          </td>
        </tr>
      `;
    }).join('');

    // Eventos de botones de acción por jugador
    document.querySelectorAll('.btn-inspect-player').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        const player = squad.find(p => p.id === id);
        if (player) {
          sfx.playClick();
          openPlayerInspectorModal(player, () => renderSquad(container));
        }
      });
    });

    document.querySelectorAll('.player-squad-row').forEach(row => {
      row.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const player = squad.find(p => p.id === id);
        if (player) {
          sfx.playClick();
          openPlayerInspectorModal(player, () => renderSquad(container));
        }
      });
    });
  };

  container.innerHTML = `
    <div class="squad-hub-layout">
      <!-- Encabezado de Gestión de Plantilla Estilo EA FC -->
      <div class="glass-panel mb-4" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2>📋 Plantilla Profesional del Club: ${userTeam.name}</h2>
          <p class="text-sub">Total de Futbolistas: <strong>${squad.length} Jugadores</strong> | Presupuesto Salarial: <strong style="color: var(--accent-gold);">€${(gameState.wageBudget / 1000).toFixed(0)}K/sem</strong></p>
        </div>
        
        <div style="display: flex; gap: 10px;">
          <input type="text" id="inputSearchSquad" class="input-select" placeholder="🔍 Buscar jugador por nombre..." style="width: 240px;">
        </div>
      </div>

      <!-- Filtros por Línea de Campo -->
      <div class="glass-panel mb-3" style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
        <span class="text-sub" style="font-weight: 700; font-size: 0.85rem;">FILTRAR POR LÍNEA:</span>
        <button class="btn-secondary btn-filter-pos active" data-pos="ALL">TODOS (${squad.length})</button>
        <button class="btn-secondary btn-filter-pos" data-pos="POR">PORTEROS</button>
        <button class="btn-secondary btn-filter-pos" data-pos="DEF">DEFENSAS</button>
        <button class="btn-secondary btn-filter-pos" data-pos="MED">MEDIOCAMPISTAS</button>
        <button class="btn-secondary btn-filter-pos" data-pos="DEL">DELANTEROS</button>
      </div>

      <!-- Tabla Organizada de la Plantilla -->
      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>POS</th>
                <th>Futbolista & Rol Táctico</th>
                <th>Edad</th>
                <th>Media (OVR)</th>
                <th>Potencial</th>
                <th>Valor Mercado</th>
                <th>Salario</th>
                <th>Contrato</th>
                <th>Acciones Directivas</th>
              </tr>
            </thead>
            <tbody id="squadTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  renderTable();

  // Eventos de Filtro por Posición
  document.querySelectorAll('.btn-filter-pos').forEach(btn => {
    btn.addEventListener('click', (e) => {
      sfx.playClick();
      document.querySelectorAll('.btn-filter-pos').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentFilter = e.currentTarget.dataset.pos;
      renderTable();
    });
  });

  // Evento de Búsqueda por Nombre
  const searchInput = document.getElementById('inputSearchSquad');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderTable();
    });
  }
}
