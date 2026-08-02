// Vista de la Sala de Trofeos, Vitrina 3D con Sombras SVG e Historial de Clubes Dirigidos

import { db } from '../data/db.js';
import { TrophyRoomEngine } from '../engine/trophyRoom.js';
import { sfx } from '../../assets/audio/sfx.js';

// SVG Vectoriales con sombras 3D por Tipo de Trofeo
const TROPHY_SVGS = {
  LIGA: `
    <svg viewBox="0 0 100 120" style="filter: drop-shadow(0 10px 12px rgba(0,0,0,0.6)); width: 80px; height: 100px;">
      <!-- Base de Granito -->
      <rect x="25" y="95" width="50" height="18" rx="4" fill="#1e293b" stroke="#475569" stroke-width="2"/>
      <rect x="30" y="86" width="40" height="10" rx="2" fill="#334155"/>
      <!-- Copa Dorada Nacional -->
      <path d="M 30 20 L 70 20 L 65 65 Q 50 82 35 65 Z" fill="url(#goldGrad)" stroke="#e5a93c" stroke-width="2"/>
      <!-- Asas laterales -->
      <path d="M 30 28 C 12 28 12 52 32 55" fill="none" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
      <path d="M 70 28 C 88 28 88 52 68 55" fill="none" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
      <!-- Corona Superior -->
      <polygon points="30,20 40,8 50,18 60,8 70,20" fill="#fbbf24"/>
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24"/>
          <stop offset="50%" stop-color="#d97706"/>
          <stop offset="100%" stop-color="#92400e"/>
        </linearGradient>
      </defs>
    </svg>
  `,
  CONTINENTAL: `
    <svg viewBox="0 0 100 120" style="filter: drop-shadow(0 10px 12px rgba(0,0,0,0.6)); width: 80px; height: 100px;">
      <!-- Base de Mármol Oscuro -->
      <rect x="22" y="96" width="56" height="18" rx="3" fill="#0f172a" stroke="#00c885" stroke-width="2"/>
      <!-- Copa Orejona de Plata Brillante -->
      <path d="M 28 15 L 72 15 L 68 62 Q 50 85 32 62 Z" fill="url(#silverGrad)" stroke="#cbd5e1" stroke-width="2"/>
      <!-- Grandes Asas Orejonas -->
      <path d="M 28 20 C 5 15 5 60 30 60" fill="none" stroke="#e2e8f0" stroke-width="5" stroke-linecap="round"/>
      <path d="M 72 20 C 95 15 95 60 70 60" fill="none" stroke="#e2e8f0" stroke-width="5" stroke-linecap="round"/>
      <defs>
        <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="50%" stop-color="#94a3b8"/>
          <stop offset="100%" stop-color="#475569"/>
        </linearGradient>
      </defs>
    </svg>
  `,
  COPA: `
    <svg viewBox="0 0 100 120" style="filter: drop-shadow(0 10px 12px rgba(0,0,0,0.6)); width: 80px; height: 100px;">
      <rect x="28" y="94" width="44" height="18" rx="3" fill="#1e293b"/>
      <path d="M 32 25 L 68 25 L 62 65 Q 50 80 38 65 Z" fill="url(#bronzeGrad)" stroke="#f59e0b" stroke-width="2"/>
      <path d="M 32 32 C 18 32 18 52 34 52" fill="none" stroke="#d97706" stroke-width="4"/>
      <path d="M 68 32 C 82 32 82 52 66 52" fill="none" stroke="#d97706" stroke-width="4"/>
      <defs>
        <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="100%" stop-color="#ca8a04"/>
        </linearGradient>
      </defs>
    </svg>
  `
};

export function renderTrophyRoom(container) {
  const career = TrophyRoomEngine.getCareerSummary();
  const gameState = db.gameState;
  const userTeam = db.teams[gameState.userTeamId];

  const trophies = career.trophies || [];
  const clubHistory = gameState.managedClubsHistory || [
    { teamName: userTeam.name, seasons: `${gameState.season}/${gameState.season + 1}`, trophiesWon: trophies.length }
  ];

  container.innerHTML = `
    <div class="trophy-layout">
      <!-- Encabezado de la Sala de Trofeos -->
      <div class="trophy-header glass-panel" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2>🏆 Vitrina 3D de Trofeos & Palmarés de ${career.managerName}</h2>
          <p class="text-sub">Puntuación de Manager: <strong class="text-highlight">${career.managerScore} PTS</strong> | Reputación Mundial: <strong style="color: var(--accent-gold);">${career.reputation}/99</strong></p>
        </div>
        <div style="background: #141d2e; border: 1px solid var(--border-color); padding: 10px 20px; border-radius: 8px;">
          <span class="text-sub" style="font-size: 0.8rem; font-weight: 700;">TÍTULOS TOTALES GANADOS</span>
          <h2 style="margin: 0; color: var(--accent-green); text-align: center;">${trophies.length} 🏆</h2>
        </div>
      </div>

      <!-- Vitrina 3D con Estantería y Sombras -->
      <div class="glass-panel mt-4" style="background: linear-gradient(180deg, #101726 0%, #0a0d14 100%); border: 1px solid var(--border-color); padding: 32px 24px;">
        <h3 style="margin-bottom: 20px; color: var(--accent-gold); text-align: center;">✨ Vitrina de Trofeos del Director Técnico (Haz clic en una copa para ver detalles)</h3>

        ${trophies.length === 0 ? `
          <div class="empty-cabinet text-center py-5">
            <div style="font-size: 4rem; opacity: 0.4;">🏆</div>
            <h3 class="mt-2">Vitrina en Espera de tu Primer Título</h3>
            <p class="text-sub">Conquista la liga o copa esta temporada para exhibir tus trofeos originales con peana de granito.</p>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 24px; justify-items: center;">
            ${trophies.map((t, idx) => {
              const svgType = t.title.toLowerCase().includes('liga') ? 'LIGA' : (t.title.toLowerCase().includes('continental') || t.title.toLowerCase().includes('libertadores') ? 'CONTINENTAL' : 'COPA');
              const svgMarkup = TROPHY_SVGS[svgType];

              return `
                <div class="trophy-item-card" data-idx="${idx}" style="cursor: pointer; display: flex; flex-direction: column; align-items: center; background: #141d2e; border: 1px solid var(--border-color); padding: 20px 14px; border-radius: 12px; transition: transform 0.2s ease, border-color 0.2s ease; width: 100%;">
                  ${svgMarkup}
                  <h4 style="margin-top: 14px; font-size: 0.92rem; text-align: center; color: #ffffff;">${t.title}</h4>
                  <span class="text-sub" style="font-size: 0.78rem;">Temporada ${t.season}</span>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Historial de Clubes Dirigidos y Palmarés por Equipo -->
      <div class="glass-panel mt-4">
        <h3>🏢 Historial de Equipos Dirigidos y Títulos por Club</h3>
        <p class="text-sub mb-3">Registro de instituciones comandadas durante los 25 años de carrera profesional:</p>
        
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Club Dirigido</th>
                <th>Período / Temporadas</th>
                <th>Títulos Conquistados</th>
                <th>Estado del Vínculo</th>
              </tr>
            </thead>
            <tbody>
              ${clubHistory.map(c => `
                <tr class="${c.teamName === userTeam.name ? 'highlight-row' : ''}">
                  <td><strong>🏰 ${c.teamName}</strong></td>
                  <td>${c.seasons}</td>
                  <td><span class="stat-ovr">${c.trophiesWon} 🏆</span></td>
                  <td>${c.teamName === userTeam.name ? '<span class="text-highlight">Club Actual (DT Activo)</span>' : '<span class="text-sub">Ex-Equipo</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Evento de clic en trofeos para ver modal de detalles
  document.querySelectorAll('.trophy-item-card').forEach(card => {
    card.addEventListener('click', (e) => {
      sfx.playClick();
      const idx = e.currentTarget.dataset.idx;
      const trophy = trophies[idx];
      if (trophy) {
        alert(`🏆 DETALLES DEL TÍTULO:\n\nTrofeo: ${trophy.title}\nClub Campeón: ${trophy.teamName || userTeam.name}\nTemporada: ${trophy.season}\nFecha de Conquista: ${trophy.date}`);
      }
    });
  });
}
