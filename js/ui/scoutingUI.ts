/**
 * ============================================================================
 * ENTRENADOR LEYENDA - CENTRO DE ANÁLISIS Y MONITOREO MULTILIGA (scoutingUI.ts)
 * ============================================================================
 * v2.0 — Permite monitorear hasta 5 ligas externas, ver tablas de goleadores
 * internacionales y enviar ojeadores directamente desde las tablas de datos.
 * Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.
 */

import { db } from '../data/db.js';
import { sfx } from '../../assets/audio/sfx.js';
import type { Player } from '../types.js';

export function renderScoutingView(container: HTMLElement): void {
  const gameState = db.gameState!;
  const userLeagueId = gameState.userLeagueId;
  const availableLeagues = db.leagues.filter(l => l.id !== userLeagueId);

  let activeLeagueId = gameState.watchedLeagues[0] || availableLeagues[0]?.id || 'esp_1';

  const renderView = () => {
    const activeLeague = db.leagues.find(l => l.id === activeLeagueId) || availableLeagues[0];

    // Obtener plantillas o generar simulación de la liga seleccionada
    const leagueTeams = activeLeague ? activeLeague.teams : [];
    const standings = leagueTeams.map((t, idx) => {
      // Simulación de puntos para vista multiliga
      const simulatedPoints = Math.max(10, Math.round(75 - idx * 3.2 + Math.sin(idx + gameState.season) * 5));
      return {
        teamId: t.id,
        name: t.name,
        played: Math.min(38, gameState.week),
        points: simulatedPoints,
        teamObj: db.teams[t.id] || t
      };
    }).sort((a, b) => b.points - a.points);

    // Obtener los mejores jugadores de la liga monitoreada
    const topPlayers: Player[] = [];
    leagueTeams.forEach(t => {
      const players = db.getTeamPlayers(t.id);
      topPlayers.push(...players);
    });
    topPlayers.sort((a, b) => b.overall - a.overall);

    container.innerHTML = `
      <div class="scouting-layout">
        <!-- Header del Centro de Análisis -->
        <div class="glass-panel mb-4" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <h2>🔭 Centro de Análisis de Datos & Seguimiento Multiliga</h2>
            <p class="text-sub">Monitorea estadísticas globales de hasta 5 ligas externas y asigna ojeadores directamente.</p>
          </div>
          
          <div style="display:flex; gap:10px; align-items:center;">
            <span class="text-sub" style="font-size:0.8rem; font-weight:700;">LIGAS MONITOREADAS (${gameState.watchedLeagues.length}/5):</span>
            <button id="btnAddLeagueWatch" class="btn-primary btn-sm" ${gameState.watchedLeagues.length >= 5 ? 'disabled style="opacity:0.5;"' : ''}>
              ➕ Añadir Liga Actual
            </button>
          </div>
        </div>

        <!-- Selector de Liga Externa -->
        <div class="glass-panel mb-3" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <span class="text-sub" style="font-weight:700; font-size:0.85rem;">SELECCIONAR LIGA:</span>
          ${availableLeagues.map(l => `
            <button class="btn-secondary btn-select-league ${l.id === activeLeagueId ? 'active' : ''}" data-id="${l.id}">
              ${l.name} (${l.country})
            </button>
          `).join('')}
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          
          <!-- TABLA DE POSICIONES INTERNACIONAL -->
          <div class="glass-panel" style="padding:16px;">
            <h4 style="margin-bottom:10px; color:var(--accent-cyan);">🏆 Clasificación: ${activeLeague?.name || 'Liga Externa'}</h4>
            <div class="table-responsive">
              <table class="data-table" style="font-size:0.8rem;">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Club</th>
                    <th>PJ</th>
                    <th>PTS</th>
                  </tr>
                </thead>
                <tbody>
                  ${standings.map((s, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td><strong>${s.name}</strong></td>
                      <td>${s.played}</td>
                      <td><strong style="color:var(--accent-gold);">${s.points}</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- TABLA DE TOP FIGURAS Y ASIGNACIÓN DIRECTA DE OJEADORES -->
          <div class="glass-panel" style="padding:16px;">
            <h4 style="margin-bottom:10px; color:var(--accent-green);">⭐ Top Talentos & Asignación Directa de Ojeadores</h4>
            <div class="table-responsive">
              <table class="data-table" style="font-size:0.8rem;">
                <thead>
                  <tr>
                    <th>POS</th>
                    <th>Jugador</th>
                    <th>OVR</th>
                    <th>Edad</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  ${topPlayers.slice(0, 8).map(p => `
                    <tr>
                      <td><span class="pos-tag pos-${p.pos}">${p.pos}</span></td>
                      <td><strong>${p.name}</strong></td>
                      <td><span class="stat-ovr">${p.overall}</span></td>
                      <td>${p.age}a</td>
                      <td>
                        <button class="btn-primary btn-sm btn-scout-direct" data-id="${p.id}" data-name="${p.name}">
                          🔍 Ojear (€20K)
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    `;

    // Eventos
    document.querySelectorAll('.btn-select-league').forEach(btn => {
      btn.addEventListener('click', (e) => {
        sfx.playClick();
        activeLeagueId = (e.currentTarget as HTMLElement).dataset.id!;
        renderView();
      });
    });

    document.getElementById('btnAddLeagueWatch')?.addEventListener('click', () => {
      if (!gameState.watchedLeagues.includes(activeLeagueId)) {
        gameState.watchedLeagues.push(activeLeagueId);
        db.saveGame();
        sfx.playGoal();
        alert(`¡LIGA AÑADIDA! ${activeLeague?.name} añadida al monitoreo multiliga.`);
        renderView();
      }
    });

    document.querySelectorAll('.btn-scout-direct').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pname = (e.currentTarget as HTMLElement).dataset.name;
        if (gameState.budget < 20000) {
          alert('Presupuesto insuficiente para enviar ojeador privado (€20,000 requeridos).');
          return;
        }
        gameState.budget -= 20000;
        db.saveGame();
        sfx.playClick();
        alert(`🔎 OJEADOR ENVIADO: Un cazatalentos privado asistirá a los próximos 3 encuentros de ${pname} para elaborar un informe completo de rendimiento.`);
      });
    });
  };

  renderView();
}
