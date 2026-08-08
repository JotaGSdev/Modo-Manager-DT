// Vista Dedicada a la Gestión Organizada de la Plantilla (Squad Hub Estilo EA FC / FIFA)
// Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.

import { db } from '../data/db.js';
import { openPlayerInspectorModal } from './playerInspectorUI.js';
import { sfx } from '../../assets/audio/sfx.js';
import { TeamSpiritEngine } from '../engine/teamSpirit.js';

const POS_ORDER: Record<string, number> = { 'POR': 1, 'DFC': 2, 'LI': 3, 'LD': 4, 'MCD': 5, 'MC': 6, 'MCO': 7, 'EI': 8, 'ED': 9, 'DC': 10 };

// v4.0 — El Rol Vestuario ya NO se asigna a mano: cada jugador nace con el suyo
// (assignPersonalityRole en teamData). Aquí solo se muestra, como insignia.
const PERSONALITY_ROLE_LABELS: Record<string, string> = {
  captain: '👑 Capitán',
  youngStar: '⭐ Joven Promesa',
  rebel: '🔥 El Rebelde',
  mentor: '🎓 El Mentor',
};

export function renderSquad(container: HTMLElement): void {
  const gameState = db.gameState!;
  const squad = db.getTeamPlayers(gameState.userTeamId);
  const userTeam = db.teams[gameState.userTeamId]!;

  let currentFilter = 'ALL';
  let searchQuery = '';

  const expiringCount = squad.filter(p => (p.contractYears !== undefined ? p.contractYears : 3) <= 1).length;

  const renderTable = () => {
    const listEl = document.getElementById('squadTableBody');
    if (!listEl) return;

    // XI real que juega el motor: los 11 primeros del array de plantilla (no el
    // orden visual por posición). Marca visual titular/suplente para que coincida
    // con lo que sale al campo en los partidos.
    const xiIds = new Set(squad.slice(0, 11).map(p => p.id));

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
      else if (currentFilter === 'EXPIRING') filtered = filtered.filter(p => (p.contractYears !== undefined ? p.contractYears : 3) <= 1);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.pos.toLowerCase().includes(q));
    }

    listEl.innerHTML = filtered.length === 0 ? `
      <tr><td colspan="10" class="text-sub text-center py-4">No se encontraron futbolistas con los filtros seleccionados.</td></tr>
    ` : filtered.map(p => {
      const roleText = p.individualInstruction || 'Estándar';
      const personalityRole = p.personalityRole || 'none';
      const personalityLabel = personalityRole === 'none' ? '—' : (PERSONALITY_ROLE_LABELS[personalityRole] || personalityRole);
      const contractYears = p.contractYears !== undefined ? p.contractYears : 3;
      const maxWeeks = gameState.maxWeeks || 38;
      const currentWeek = gameState.week || 1;
      const monthsLeft = Math.max(1, (contractYears * 12) - Math.floor((currentWeek / maxWeeks) * 12));

      // Resaltar filas de Capitán y Mentor con borde izquierdo de color
      const leaderBorderStyle = p.personalityRole === 'captain'
        ? 'border-left: 3px solid var(--accent-gold); background: rgba(250,189,0,0.04);'
        : p.personalityRole === 'mentor'
        ? 'border-left: 3px solid #94a3b8; background: rgba(148,163,184,0.04);'
        : '';

      return `
        <tr class="player-squad-row" data-id="${p.id}" style="cursor: pointer; ${leaderBorderStyle}">
          <td><span class="pos-tag pos-${p.pos}">${p.pos}</span></td>
          <td>
            <strong>${p.name} ${xiIds.has(p.id) ? '<span class="xi-badge starter">XI</span>' : '<span class="xi-badge bench">SUP</span>'}</strong><br>
            <span class="text-sub" style="font-size: 0.75rem;">Rol: ${roleText}</span>
          </td>
          <td><strong>${p.age}a</strong></td>
          <td><span class="stat-ovr">${p.overall}</span></td>
          <td><span class="text-highlight">${p.potential || p.overall}</span></td>

          <!-- Rol de Vestuario v4.0: automático según características (solo visual) -->
          <td>
            <span class="role-badge" title="Rol de vestuario automático según edad/media/potencial" style="font-size:0.75rem; padding:3px 8px; border-radius:4px; background:${personalityRole === 'none' ? 'transparent' : '#1e293b'}; color:${personalityRole === 'none' ? 'var(--text-sub)' : 'var(--accent-gold)'}; border:1px solid ${personalityRole === 'none' ? 'transparent' : 'var(--border-color)'}; white-space:nowrap;">${personalityLabel}</span>
          </td>

          <td>€${(p.value / 1000000).toFixed(1)}M</td>
          <td style="color: var(--accent-gold);">€${(p.salary / 1000).toFixed(0)}K/s</td>
          <td style="color: ${contractYears <= 1 ? 'var(--accent-red)' : 'inherit'}; font-weight: 700;">${contractYears}a (${monthsLeft}m)</td>
          <td class="text-center">
            <button class="btn-primary btn-sm btn-inspect-player" data-id="${p.id}">🔍 Gestionar / Vender</button>
          </td>
        </tr>
      `;
    }).join('');

    // Eventos de botones de acción por jugador
    document.querySelectorAll('.btn-inspect-player').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (e.currentTarget as HTMLElement).dataset.id;
        const player = squad.find(p => p.id === id);
        if (player) {
          sfx.playClick();
          openPlayerInspectorModal(player, () => renderSquad(container));
        }
      });
    });

    document.querySelectorAll('.player-squad-row').forEach(row => {
      row.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
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
        
        <div style="display: flex; gap: 10px; align-items:center;">
          <!-- Panel Embebido de Team Spirit (v2.0) -->
          ${TeamSpiritEngine.renderSpiritPanel()}
          <input type="text" id="inputSearchSquad" class="input-select" placeholder="🔍 Buscar jugador..." style="width: 200px;">
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
        <button class="btn-secondary btn-filter-pos" data-pos="EXPIRING" style="color: ${expiringCount > 0 ? 'var(--accent-red)' : 'var(--accent-gold)'}; font-weight: 800; border: 1px solid ${expiringCount > 0 ? 'var(--accent-red)' : 'var(--accent-gold)'};">⚠️ CONTRATOS POR VENCER (${expiringCount})</button>
      </div>

      <!-- ════ BANNER DE LIDERAZGO DEL VESTUARIO ════ -->
      ${(() => {
        const captain = squad.find(p => p.personalityRole === 'captain');
        const mentor  = squad.find(p => p.personalityRole === 'mentor');

        const leaderCard = (
          player: typeof captain,
          icon: string,
          label: string,
          borderColor: string,
          badgeBg: string
        ) => {
          if (!player) return `
            <div style="flex:1; min-width:240px; background:rgba(255,255,255,0.03); border:1px dashed #334155;
                         border-radius:14px; padding:18px; display:flex; align-items:center; gap:14px;
                         opacity:0.5;">
              <span style="font-size:2.2rem;">${icon}</span>
              <div>
                <div style="font-size:0.7rem; font-weight:700; color:#64748b; letter-spacing:1px;">${label}</div>
                <div style="color:#64748b; font-size:0.85rem;">Sin designar</div>
              </div>
            </div>`;

          const morale   = player.morale  ?? 75;
          const moraleColor = morale >= 80 ? 'var(--accent-green)' : morale >= 60 ? 'var(--accent-gold)' : 'var(--accent-red)';
          const contractYrs = player.contractYears ?? 3;

          return `
            <div style="flex:1; min-width:240px;
                         background:linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.9) 100%);
                         border:1.5px solid ${borderColor}; border-radius:14px; padding:18px 22px;
                         display:flex; align-items:center; gap:16px;
                         box-shadow: 0 0 18px ${borderColor}22;
                         cursor:pointer;"
                 data-leader-id="${player.id}">
              <!-- Icono rol -->
              <div style="font-size:2.6rem; line-height:1;">${icon}</div>

              <!-- Info principal -->
              <div style="flex:1; min-width:0;">
                <div style="font-size:0.65rem; font-weight:900; letter-spacing:1.5px;
                             color:${borderColor}; margin-bottom:2px;">${label}</div>
                <div style="font-size:1.05rem; font-weight:800; color:#f1f5f9;
                             white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${player.name}
                </div>
                <div style="display:flex; gap:8px; margin-top:5px; flex-wrap:wrap;">
                  <span class="pos-tag pos-${player.pos}" style="font-size:0.65rem;">${player.pos}</span>
                  <span class="stat-ovr" style="font-size:0.8rem; padding:2px 7px;">${player.overall}</span>
                  <span style="font-size:0.72rem; color:#94a3b8; align-self:center;">${player.age} años</span>
                </div>
              </div>

              <!-- Stats laterales -->
              <div style="display:flex; flex-direction:column; gap:5px; text-align:right; min-width:80px;">
                <div style="font-size:0.68rem; color:#94a3b8;">
                  Moral
                  <span style="color:${moraleColor}; font-weight:800; display:block; font-size:0.9rem;">${morale}%</span>
                </div>
                <div style="font-size:0.68rem; color:#94a3b8;">
                  Contrato
                  <span style="color:${contractYrs <= 1 ? 'var(--accent-red)' : '#f1f5f9'}; font-weight:700; display:block; font-size:0.85rem;">${contractYrs}a</span>
                </div>
              </div>

              <!-- Badge esquina -->
              <div style="position:absolute; top:10px; right:14px;
                           background:${badgeBg}; color:#000; font-size:0.55rem;
                           font-weight:900; padding:2px 7px; border-radius:4px;
                           letter-spacing:0.8px;">${label}</div>
            </div>`;
        };

        return `
          <div style="position:relative; display:flex; gap:16px; flex-wrap:wrap; margin-bottom:16px;">
            ${leaderCard(captain, '👑', 'CAPITÁN', 'var(--accent-gold)', 'var(--accent-gold)')}
            ${leaderCard(mentor,  '🎓', 'MENTOR',  '#94a3b8',           '#94a3b8')}
          </div>`;
      })()}

      <!-- Tabla Organizada de la Plantilla -->
      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>POS</th>
                <th>Futbolista &amp; Rol Táctico</th>
                <th>Edad</th>
                <th>Media (OVR)</th>
                <th>Potencial</th>
                <th>Rol Vestuario (Automático)</th>
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

  // Click en las tarjetas de Capitán / Mentor → abre inspector de jugador
  document.querySelectorAll<HTMLElement>('[data-leader-id]').forEach(card => {
    card.addEventListener('click', () => {
      const pid = card.dataset.leaderId;
      const player = squad.find(p => p.id === pid);
      if (player) {
        sfx.playClick();
        openPlayerInspectorModal(player, () => renderSquad(container));
      }
    });
  });

  // Eventos de Filtro por Posición
  document.querySelectorAll('.btn-filter-pos').forEach(btn => {
    btn.addEventListener('click', (e) => {
      sfx.playClick();
      document.querySelectorAll('.btn-filter-pos').forEach(b => b.classList.remove('active'));
      (e.currentTarget as HTMLElement).classList.add('active');
      currentFilter = (e.currentTarget as HTMLElement).dataset.pos || 'ALL';
      renderTable();
    });
  });

  // Evento de Búsqueda por Nombre
  const searchInput = document.getElementById('inputSearchSquad') as HTMLInputElement | null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value;
      renderTable();
    });
  }
}
