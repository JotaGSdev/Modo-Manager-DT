// Vista de la Cantera (Youth Academy) con Ojeadores por Nivel y Scouting por Regiones del Mundo

import { db } from '../data/db.js';
import { YouthAcademyEngine, SCOUT_LEVEL_DATA } from '../engine/youthAcademy.js';
import { sfx } from '../../assets/audio/sfx.js';

export function renderYouth(container) {
  const gameState = db.gameState;
  const academy = gameState.youthAcademy || [];
  const scoutLevel = gameState.scoutLevel || 1;
  const scoutData = SCOUT_LEVEL_DATA[scoutLevel] || SCOUT_LEVEL_DATA[1];
  const nextScoutData = SCOUT_LEVEL_DATA[scoutLevel + 1];

  const renderProspects = () => {
    const listEl = document.getElementById('youthProspectsList');
    if (!listEl) return;

    if (academy.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state glass-panel text-center py-5">
          <p class="fs-5">🌱 No tienes canteranos en la academia. Elige una región abajo y envía a tu ojeador Nivel ${scoutLevel} (${scoutData.name}) a explorar nuevas promesas.</p>
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
            <span class="club-subtext">📍 ${p.country} (${p.region}) | Edad: ${p.age} años</span>
          </div>
        </div>

        <div class="player-card-stats">
          <div class="stat-box"><span class="lbl">OVR ACTUAL</span><span class="val stat-ovr">${p.overall}</span></div>
          <div class="stat-box"><span class="lbl">POTENCIAL</span><span class="val text-highlight">${p.potRange || p.potential}</span></div>
          <div class="stat-box"><span class="lbl">CONTRATO</span><span class="val">€${(p.promotionCost / 1000).toFixed(0)}K</span></div>
        </div>

        <div class="youth-card-actions">
          <button class="btn-primary btn-promote" data-id="${p.id}">⭐ PROMOCIONAR (€${(p.promotionCost / 1000).toFixed(0)}K)</button>
          <button class="btn-danger btn-dismiss" data-id="${p.id}">❌ DESCARTAR</button>
        </div>
      </div>
    `).join('');

    // Eventos de Promocionar
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

    // Eventos de Descartar
    document.querySelectorAll('.btn-dismiss').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const res = YouthAcademyEngine.dismissProspect(id);
        if (res.success) {
          sfx.playClick();
          renderYouth(container);
        } else {
          alert(res.reason);
        }
      });
    });
  };

  const isTournamentPlayed = gameState.youthTournamentPlayed || false;

  container.innerHTML = `
    <div class="youth-layout">
      <!-- Encabezado de la Cantera -->
      <div class="youth-header glass-panel">
        <div>
          <h2>🌱 Cantera y Cazatalentos de Élite</h2>
          <p class="text-sub">Presupuesto Disponible: <strong class="text-highlight">€${(gameState.budget / 1000000).toFixed(2)}M</strong></p>
        </div>

        <!-- Panel del Ojeador y Mejora -->
        <div class="scout-status-panel">
          <div class="scout-info">
            <span class="scout-badge">🔍 Ojeador Nivel ${scoutLevel}: ${scoutData.name}</span>
            <span class="scout-meta">Rango Potencial: <strong>${scoutData.minPot}-${scoutData.maxPot}</strong> | Precisión: <strong>${scoutData.accuracy}</strong></span>
          </div>
          ${nextScoutData ? `
            <button id="btnUpgradeScout" class="btn-upgrade">
              ⬆️ MEJORAR OJEADOR (Nivel ${scoutLevel + 1} - €${(nextScoutData.upgradeCost / 1000000).toFixed(1)}M)
            </button>
          ` : '<span class="max-scout-tag">⭐ OJEADOR EN NIVEL MÁXIMO</span>'}
        </div>
      </div>

      <!-- Selector de Regiones para Ojear -->
      <div class="scout-regions-bar glass-panel mt-3">
        <h3>🌍 Misiones de Scouting (Costo por viaje: €${(scoutData.scoutCost / 1000).toFixed(0)}K)</h3>
        <p class="text-sub mb-2">Selecciona la región del mundo para descubrir jóvenes promesas autóctonas:</p>
        <div class="region-buttons-grid">
          <button class="btn-region" data-region="Sudamérica">🌎 Sudamérica (Brasil, Arg, Col...)</button>
          <button class="btn-region" data-region="Europa">🌍 Europa (España, Ing, Ita...)</button>
          <button class="btn-region" data-region="Norteamérica">🦅 Norteamérica (USA, Méx, Can)</button>
          <button class="btn-region" data-region="Centroamérica">🌴 Centroamérica (Costa Rica, Hon...)</button>
          <button class="btn-region" data-region="Asia">🌸 Asia (Japón, Arabia Saudita)</button>
        </div>
      </div>

      <!-- Lista de Canteranos y Torneo Sub-19 Unico -->
      <div class="youth-prospects-header mt-4" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <h3>📋 Jugadores en la Cantera del Club (${academy.length})</h3>
        <button id="btnRunYouthTournament" class="btn-primary" 
                style="${isTournamentPlayed ? 'background: #334155; color: #94a3b8; opacity: 0.7; cursor: not-allowed;' : 'background: var(--accent-gold); color: #000; font-weight: 800;'}"
                ${isTournamentPlayed ? 'disabled' : ''}>
          ${isTournamentPlayed ? '✅ TORNEO SUB-19 DISPUTADO (1/1 ESTA TEMPORADA)' : '🏆 SIMULAR TORNEO CANTERA SUB-19 (+1 A +3 OVR)'}
        </button>
      </div>
      <div id="youthProspectsList" class="youth-list mt-2"></div>
    </div>
  `;

  renderProspects();

  // Evento de Torneo Juvenil Sub-19
  document.getElementById('btnRunYouthTournament')?.addEventListener('click', () => {
    sfx.playClick();
    const res = YouthAcademyEngine.runYouthTournamentMatch();
    if (res.success) {
      sfx.playGoal();
      alert(res.message);
      renderYouth(container);
    } else {
      alert(res.reason);
    }
  });

  // Evento de Mejorar Ojeador
  const btnUpgrade = document.getElementById('btnUpgradeScout');
  if (btnUpgrade) {
    btnUpgrade.addEventListener('click', () => {
      sfx.playClick();
      const res = YouthAcademyEngine.upgradeScoutLevel();
      if (res.success) {
        sfx.playGoal();
        alert(res.message);
        renderYouth(container);
      } else {
        alert(res.reason);
      }
    });
  }

  // Eventos de Botones de Región
  document.querySelectorAll('.btn-region').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const region = e.target.dataset.region;
      sfx.playClick();
      const res = YouthAcademyEngine.scoutNewProspects(region);
      if (res.success) {
        alert(`¡Tu ojeador Nivel ${scoutLevel} (${scoutData.name}) regresó de ${region} con ${res.prospects.length} nuevos talentos juveniles!`);
        renderYouth(container);
      } else {
        alert(res.reason);
      }
    });
  });
}
