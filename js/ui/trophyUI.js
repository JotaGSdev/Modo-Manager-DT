// Vista de la Sala de Trofeos, Vitrina 3D con Sombras SVG e Historial de Clubes Dirigidos

import { db } from '../data/db.js';
import { TrophyRoomEngine } from '../engine/trophyRoom.js';
import { renderCountryFlagSVG, renderTeamBadgeSVG } from './badgeHelper.js';
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
  `,
  MUNDIAL: `
    <svg viewBox="0 0 100 120" style="filter: drop-shadow(0 10px 14px rgba(245,158,11,0.6)); width: 85px; height: 105px;">
      <!-- Base Verde Malaquita -->
      <rect x="25" y="94" width="50" height="18" rx="4" fill="#047857" stroke="#10b981" stroke-width="2"/>
      <rect x="28" y="85" width="44" height="10" rx="2" fill="#065f46"/>
      <!-- Atletas Sosteniendo el Mundo -->
      <path d="M 38 45 L 34 85 L 66 85 L 62 45 Z" fill="url(#goldGrad)" stroke="#f59e0b" stroke-width="2"/>
      <!-- Globo Terráqueo Dorado -->
      <circle cx="50" cy="30" r="22" fill="url(#worldGrad)" stroke="#fbbf24" stroke-width="2"/>
      <path d="M 32 30 Q 50 20 68 30 Q 50 40 32 30" fill="none" stroke="#d97706" stroke-width="2"/>
      <defs>
        <linearGradient id="worldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="50%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#78350f"/>
        </linearGradient>
      </defs>
    </svg>
  `
};

export function renderTrophyRoom(container) {
  const gameState = db.gameState;
  const trophies = gameState.trophies || [];
  const careerHistory = gameState.careerHistory || [];
  const userTeam = db.teams[gameState.userTeamId];

  container.innerHTML = `
    <div class="trophy-layout">
      <!-- Encabezado de Leyenda -->
      <div class="glass-panel mb-4 text-center" style="background: linear-gradient(135deg, #0d1320 0%, #162032 100%); padding: 24px;">
        <div style="display: flex; justify-content: center; align-items: center; gap: 12px; margin-bottom: 8px;">
          ${renderCountryFlagSVG(gameState.managerCountry, 28)}
          <h2 style="font-size: 1.8rem; margin: 0; color: #fff;">🏆 Salón de la Fama & Palmarés del Entrenador</h2>
        </div>
        <p class="text-sub" style="font-size: 0.9rem;">
          Director Técnico: <strong style="color: var(--accent-gold);">${gameState.managerName}</strong> | 
          Años de Carrera: <strong>${gameState.season - 2026 + 1} de 25 Temporadas</strong> | 
          Títulos Conquistados: <strong style="color: var(--accent-green);">${trophies.length} Títulos</strong>
        </p>
      </div>

      <!-- Vitrina de Trofeos Conquistados -->
      <div class="glass-panel mb-4" style="padding: 20px;">
        <h3 style="color: var(--accent-gold); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          🏛️ Vitrina de Trofeos Conquistados (${trophies.length})
        </h3>

        ${trophies.length === 0 ? `
          <div class="text-center py-5" style="background: #0f172a; border: 1px dashed var(--border-color); border-radius: 12px;">
            <div style="font-size: 3rem; margin-bottom: 8px; opacity: 0.5;">🏆</div>
            <h4 class="text-sub">Aún no has conquistado trofeos en tu carrera.</h4>
            <p class="text-sub" style="font-size: 0.8rem;">Lucha por la Liga, la Copa Nacional y la Champions/Libertadores para llenar tu vitrina.</p>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px;">
            ${trophies.map(t => {
              const isMundial = t.title.toLowerCase().includes('mundial');
              const isCont = t.title.toLowerCase().includes('champions') || t.title.toLowerCase().includes('libertadores');
              const isCup = t.title.toLowerCase().includes('copa') && !isCont;
              const trophyType = isMundial ? 'MUNDIAL' : (isCont ? 'CONTINENTAL' : (isCup ? 'COPA' : 'LIGA'));

              return `
                <div class="glass-panel text-center trophy-card" style="padding: 16px; border: 1px solid var(--accent-gold); background: #0f172a; border-radius: 12px; transition: transform 0.2s ease;">
                  <div style="margin-bottom: 8px;">
                    ${TROPHY_SVGS[trophyType] || TROPHY_SVGS.LIGA}
                  </div>
                  <h4 style="font-size: 0.88rem; color: #fff; margin-bottom: 4px;">${t.title}</h4>
                  <span class="badge" style="background: var(--accent-gold); color: #000; font-weight: 900; font-size: 0.72rem;">${t.season}</span>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- HISTORIAL MULTI-CLUB DE TEMPORADAS PASADAS -->
      <div class="glass-panel" style="padding: 20px;">
        <h3 style="color: var(--accent-cyan); margin-bottom: 16px;">📋 Historial Anual de Trayectoria</h3>
        
        ${careerHistory.length === 0 ? `
          <p class="text-sub">Completarás tu primer registro al finalizar la Temporada 2026/2027.</p>
        ` : `
          <div class="table-responsive">
            <table class="data-table" style="font-size: 0.82rem;">
              <thead>
                <tr>
                  <th>Año</th>
                  <th>Club Dirigido</th>
                  <th>Posición</th>
                  <th>Paso Copa</th>
                  <th>MVP del Club</th>
                  <th>Presupuesto Fin</th>
                </tr>
              </thead>
              <tbody>
                ${careerHistory.map(h => `
                  <tr>
                    <td><strong>${h.season}/${h.season + 1}</strong></td>
                    <td><strong>${h.club}</strong> ${h.isTitleWon ? '🏆' : ''}</td>
                    <td><span class="badge ${h.isTitleWon ? 'badge-final' : ''}">Puesto #${h.leagueRank}</span></td>
                    <td>${h.cupPhase || 'N/A'}</td>
                    <td>${h.mvpPlayer || 'N/A'}</td>
                    <td><strong class="text-highlight">€${((h.budgetEnd || 0) / 1000000).toFixed(1)}M</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;
}
