// Vista de la Sala de Trofeos y Palmarés Histórico

import { db } from '../data/db.js';
import { TrophyRoomEngine } from '../engine/trophyRoom.js';

export function renderTrophyRoom(container) {
  const career = TrophyRoomEngine.getCareerSummary();

  container.innerHTML = `
    <div class="trophy-layout">
      <div class="trophy-header glass-panel">
        <div>
          <h2>🏆 Sala de Trofeos & Palmarés de ${career.managerName}</h2>
          <p class="text-sub">Puntuación de Manager: <strong>${career.managerScore} PTS</strong> | Reputación: <strong>${career.reputation}/99</strong></p>
        </div>
      </div>

      <div class="trophy-cabinet-grid mt-3">
        ${career.trophies.length === 0 ? `
          <div class="empty-cabinet glass-panel">
            <div class="trophy-icon-placeholder">🏆</div>
            <h3>Gana tu primer título esta temporada</h3>
            <p>Compite en la liga y copa nacional para llenar tu vitrina de trofeos.</p>
          </div>
        ` : career.trophies.map(t => `
          <div class="trophy-card glass-panel">
            <div class="trophy-badge-icon">🏆</div>
            <h3>${t.title}</h3>
            <p class="trophy-season">Temporada ${t.season}</p>
            <span class="trophy-date">Conseguido el: ${t.date}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
