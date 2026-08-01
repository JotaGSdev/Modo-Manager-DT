// Vista de la Cantera (Youth Academy) con Costos Económicos Claros

import { db } from '../data/db.js';
import { YouthAcademyEngine } from '../engine/youthAcademy.js';
import { sfx } from '../../assets/audio/sfx.js';

export function renderYouth(container) {
  const gameState = db.gameState;
  const academy = gameState.youthAcademy || [];

  const renderProspects = () => {
    const listEl = document.getElementById('youthProspectsList');
    if (!listEl) return;

    if (academy.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state glass-panel text-center">
          <p>🌱 No tienes canteranos actualmente. Envía un ojeador a explorar nuevas promesas.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = academy.map(p => `
      <div class="player-market-card youth-card">
        <div class="player-card-left">
          <span class="pos-tag pos-${p.pos}">${p.pos}</span>
          <div class="player-info">
            <h4>${p.name}</h4>
            <span class="club-subtext">Edad: ${p.age} años | Potencial: <strong>${p.potRange || p.potential}</strong></span>
          </div>
        </div>

        <div class="player-card-stats">
          <div class="stat-box"><span class="lbl">OVR ACTUAL</span><span class="val stat-ovr">${p.overall}</span></div>
          <div class="stat-box"><span class="lbl">POTENCIAL</span><span class="val text-highlight">${p.potential}</span></div>
          <div class="stat-box"><span class="lbl">COSTO FICHA</span><span class="val">€100K</span></div>
        </div>

        <button class="btn-primary btn-promote" data-id="${p.id}">⭐ PROMOCIONAR (€100k)</button>
      </div>
    `).join('');

    document.querySelectorAll('.btn-promote').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const player = academy.find(p => p.id === id);
        if (player) {
          const res = YouthAcademyEngine.promoteToFirstTeam(player);
          if (res.success) {
            sfx.playGoal();
            alert(res.message);
            renderYouth(container);
          } else {
            alert(res.reason);
          }
        }
      });
    });
  };

  container.innerHTML = `
    <div class="youth-layout">
      <div class="youth-header glass-panel">
        <div>
          <h2>🌱 Academia de Cantera y Jóvenes Promesas</h2>
          <p class="text-sub">Presupuesto Actual: <strong class="text-highlight">€${(gameState.budget / 1000000).toFixed(1)}M</strong></p>
        </div>

        <div class="scout-actions">
          <button id="btnScoutSouthAmerica" class="btn-primary">🌎 Ojear Sudamérica (€200k)</button>
          <button id="btnScoutEurope" class="btn-secondary">🌍 Ojear Europa (€300k)</button>
        </div>
      </div>

      <div id="youthProspectsList" class="youth-list mt-3"></div>
    </div>
  `;

  renderProspects();

  document.getElementById('btnScoutSouthAmerica').addEventListener('click', () => {
    sfx.playClick();
    const res = YouthAcademyEngine.scoutNewProspects('Sudamérica');
    if (res.success) {
      alert(`¡El ojeador trajo ${res.prospects.length} nuevos prospectos sudamericanos!`);
      renderYouth(container);
    } else {
      alert(res.reason);
    }
  });

  document.getElementById('btnScoutEurope').addEventListener('click', () => {
    sfx.playClick();
    const res = YouthAcademyEngine.scoutNewProspects('Europa');
    if (res.success) {
      alert(`¡El ojeador trajo ${res.prospects.length} nuevos prospectos europeos!`);
      renderYouth(container);
    } else {
      alert(res.reason);
    }
  });
}
