// Vista Principal (Dashboard Integrado en 1 Sola Pantalla - Zero Scroll)
// Incluye Tabla de Posiciones Interactiva por Competición & Carrusel de Fases de Copas
// Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.

import { db } from '../data/db.js';
import { MatchEngine } from '../engine/matchEngine.js';
import { CompetitionsEngine } from '../engine/competitionsEngine.js';
import { TransferEngine } from '../engine/transfers.js';
import { EventsEngine } from '../engine/eventsEngine.js';
import { ContractEngine } from '../engine/contracts.js';
import { renderTeamBadgeSVG } from './badgeHelper.js';
import { sfx } from '../../assets/audio/sfx.js';

import type { CupPhase, EvolutionReportEntry, GameEvent, League, NavigateFn, Team } from '../types.js';

/** Pestañas del selector de competición del dashboard */
type CompTab = 'LEAGUE' | 'NATIONAL_CUP' | 'CONTINENTAL_CUP';

let activeCompTab: CompTab = 'LEAGUE'; // 'LEAGUE' | 'NATIONAL_CUP' | 'CONTINENTAL_CUP'
let currentCupPhaseIdx = 0;

export function renderDashboard(container: HTMLElement, navigateTo: NavigateFn): void {
  const gameState = db.gameState!;
  CompetitionsEngine.initCupProgressIfMissing();

  const userTeam: Team = db.teams[gameState.userTeamId] || { id: gameState.userTeamId, name: 'Mi Club', short: 'DT', overall: 75, colors: ['#00aaff', '#00ffaa'], stadium: 'Estadio Principal', leagueId: 'arg_1', budget: 0, reputation: 50 };
  const league: League = db.leagues.find(l => l.id === userTeam.leagueId) || db.leagues[0] || { id: 'lig_1', name: 'Liga Principal', country: 'Sudamérica', region: 'Sudamérica', tier: 1, reputation: 60, teams: [] };

  const otherTeams = (league.teams || []).filter(t => t.id !== userTeam.id);
  const nextRival: Team = otherTeams.length > 0
    ? otherTeams[(gameState.week - 1) % otherTeams.length]!
    : { id: 'rival_gen', name: 'Rival FC', short: 'RIV', overall: 73, colors: ['#cc0000', '#000000'], stadium: 'Estadio Rival', budget: 0, reputation: 50 };

  const midSeasonWeek = Math.floor((gameState.maxWeeks || 38) / 2);
  const isSeasonCompleted = gameState.week >= gameState.maxWeeks;
  const isFinalMatch = isSeasonCompleted || gameState.week === midSeasonWeek;
  const topScorers = gameState.topScorers || [];
  const seasonLabel = `${gameState.season}/${gameState.season + 1}`;

  const userStanding = (gameState.standings || []).find(s => s.teamId === userTeam.id);
  const userRank = (gameState.standings || []).findIndex(s => s.teamId === userTeam.id) + 1;
  const userPosLabel = userRank > 0 ? `#${userRank} lugar` : 'Competidor';

  const squad = db.getTeamPlayers(userTeam.id);
  const topClubScorer: { name: string; seasonGoals: number } = [...squad].sort((a, b) => (b.seasonGoals || 0) - (a.seasonGoals || 0))[0] || { name: 'Sin registros', seasonGoals: 0 };
  const topClubAssister: { name: string; overall: number } = squad[1] || squad[0] || { name: 'Sin registros', overall: 75 };

  const natCupName = CompetitionsEngine.getNationalCupName(userTeam.country || '');
  let contCupName = 'Copa CONMEBOL Libertadores';
  if (userTeam.region === 'Europa') contCupName = 'UEFA Champions League';
  else if (userTeam.region === 'Norteamérica') contCupName = 'Concacaf Champions Cup';

  container.innerHTML = `
    <!-- 1. BANDA SUPERIOR DE KPIs DEL CLUB -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px;">
      <div class="glass-panel text-center" style="padding: 10px 12px;">
        <span class="text-sub" style="font-size: 0.75rem; font-weight: 800;">PJ TEMPORADA</span>
        <h4 style="margin: 2px 0 0 0; font-size: 1.25rem; color: var(--accent-green);">${userStanding ? userStanding.played : 0} PJ</h4>
        <span class="text-sub" style="font-size: 0.72rem;">Jornada ${gameState.week}/${gameState.maxWeeks}</span>
      </div>

      <div class="glass-panel text-center" style="padding: 10px 12px;">
        <span class="text-sub" style="font-size: 0.75rem; font-weight: 800;">MÁXIMO GOLEADOR</span>
        <h4 style="margin: 2px 0 0 0; font-size: 1.05rem; color: #ffffff; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${topClubScorer.name}</h4>
        <span class="stat-ovr mt-1" style="font-size: 0.72rem; padding: 2px 6px;">${topClubScorer.seasonGoals || 0} Goles ⚽</span>
      </div>

      <div class="glass-panel text-center" style="padding: 10px 12px;">
        <span class="text-sub" style="font-size: 0.75rem; font-weight: 800;">LÍDER ASISTENCIAS</span>
        <h4 style="margin: 2px 0 0 0; font-size: 1.05rem; color: #ffffff; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${topClubAssister.name}</h4>
        <span class="text-highlight mt-1" style="font-size: 0.75rem;">${Math.floor((topClubAssister.overall - 65) / 4) + 1} Asistencias 👟</span>
      </div>

      <div class="glass-panel text-center" style="padding: 10px 12px;">
        <span class="text-sub" style="font-size: 0.75rem; font-weight: 800;">ESTADO DE TORNEOS</span>
        <h4 style="margin: 2px 0 0 0; font-size: 1.05rem; color: var(--accent-gold); font-weight: 800;">${userPosLabel}</h4>
        <span class="text-sub" style="font-size: 0.72rem;">Liga / Copa 🏆</span>
      </div>
    </div>

    <!-- 2. REJILLA TRI-COLUMNA EN 1 SOLA PANTALLA -->
    <div style="display: grid; grid-template-columns: 1.1fr 1.1fr 0.8fr; gap: 14px; align-items: stretch;">
      
      <!-- Columna 1: Tarjeta de Partido -->
      <div class="card glass-panel" style="padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
        <div class="card-header" style="margin-bottom: 8px;">
          <span class="badge ${isFinalMatch ? 'badge-final' : ''}" style="font-size: 0.75rem; padding: 3px 8px;">
            ${isSeasonCompleted ? '🏆 TEMPORADA CONCLUIDA' : (gameState.week === midSeasonWeek ? '❄️ PARÓN INVERNAL' : `JORNADA ${gameState.week} / ${gameState.maxWeeks}`)}
          </span>
          <span class="league-name" style="font-size: 0.80rem;">${league.name} (${seasonLabel})</span>
        </div>

        <div class="match-vs-container" style="margin: 12px 0;">
          <div class="team-box text-center">
            ${renderTeamBadgeSVG(userTeam, 52)}
            <h4 style="font-size: 0.95rem; margin-top: 4px;">${userTeam.name}</h4>
            <span class="team-ovr text-sub" style="font-size: 0.78rem;">OVR: ${userTeam.overall}</span>
          </div>

          <div class="vs-divider text-center">
            <span class="vs-text" style="font-size: 1.4rem; font-weight: 900; color: var(--accent-cyan);">VS</span>
            <span class="stadium-subtext text-sub d-block" style="font-size: 0.74rem;">🏟️ ${userTeam.stadium}</span>
          </div>

          <div class="team-box text-center">
            ${renderTeamBadgeSVG(nextRival, 52)}
            <h4 style="font-size: 0.95rem; margin-top: 4px;">${nextRival.name}</h4>
            <span class="team-ovr text-sub" style="font-size: 0.78rem;">OVR: ${nextRival.overall}</span>
          </div>
        </div>

        <div class="match-actions" style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
          ${isSeasonCompleted ? `
            <button id="btnFinishSeasonDirect" class="btn-primary" style="width: 100%; padding: 12px; font-size: 0.95rem; background: var(--accent-gold); color: #000; font-weight: 900;">
              🏆 VER EVALUACIÓN DE FIN DE TEMPORADA ➔
            </button>
          ` : `
            <button id="btnPlayMatch" class="btn-primary" style="width: 100%; padding: 10px; font-size: 0.88rem;">⚽ JUGAR PARTIDO EN VIVO</button>
            <button id="btnSimBlock" class="btn-secondary" style="width: 100%; padding: 9px; font-size: 0.84rem;">⏩ SIMULAR HASTA MITAD / FINAL</button>
          `}
        </div>
      </div>

      <!-- Columna 2: Panel Interactivo de Tabla / Copas con Carrusel de Fases -->
      <div class="card glass-panel" style="padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between;">
        
        <!-- SELECTOR DE COMPETICIÓN (LIGA / COPA NACIONAL / COPA CONTINENTAL) -->
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
            <h4 style="margin:0; font-size: 0.92rem; color: #ffffff;">📊 Competición</h4>
            <select id="selectCompetitionTab" class="input-select" style="font-size: 0.76rem; padding: 3px 8px; border-radius: 6px; background: #0f172a; color: var(--accent-cyan); font-weight: 800;">
              <option value="LEAGUE" ${activeCompTab === 'LEAGUE' ? 'selected' : ''}>🏆 ${league.name}</option>
              <option value="NATIONAL_CUP" ${activeCompTab === 'NATIONAL_CUP' ? 'selected' : ''}>🥊 ${natCupName}</option>
              <option value="CONTINENTAL_CUP" ${activeCompTab === 'CONTINENTAL_CUP' ? 'selected' : ''}>🌐 ${contCupName}</option>
            </select>
          </div>

          <!-- CONTENIDO DINÁMICO: TABLA LIGA O CARRUSEL DE COPAS -->
          <div id="compTabContent"></div>
        </div>

      </div>

      <!-- Columna 3: Tabla de Goleadores & The Feed (Red Social de Noticias) (v2.0) -->
      <div class="card glass-panel" style="padding: 14px 16px; display:flex; flex-direction:column; justify-content:space-between;">
        
        <!-- PICHICHI -->
        <div style="margin-bottom:12px;">
          <h4 style="margin-bottom: 8px; font-size: 0.92rem; color: #ffffff;">⚽ Pichichi de la Liga</h4>
          <div class="table-responsive">
            <table class="data-table" style="font-size: 0.78rem;">
              <thead>
                <tr>
                  <th style="padding: 4px 6px;">#</th>
                  <th style="padding: 4px 6px;">Jugador</th>
                  <th style="padding: 4px 6px;">Goles</th>
                </tr>
              </thead>
              <tbody>
                ${topScorers.length === 0 ? `
                  <tr><td colspan="3" class="text-sub text-center py-2">Sin goles registrados aún.</td></tr>
                ` : topScorers.slice(0, 4).map((s, idx) => `
                  <tr>
                    <td style="padding: 4px 6px;">${idx + 1}</td>
                    <td style="padding: 4px 6px;"><strong>${s.name}</strong></td>
                    <td style="padding: 4px 6px;"><span class="stat-ovr" style="padding: 1px 5px; font-size: 0.72rem;">${s.goals} ⚽</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- THE FEED (RED SOCIAL DE NOTICIAS) — v2.0 Exclusivo Dashboard -->
        <div style="border-top:1px solid var(--border-color); padding-top:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <h4 style="margin:0; font-size:0.85rem; color:var(--accent-cyan);">📲 THE FEED (RED SOCIAL)</h4>
            <span class="badge" style="font-size:0.65rem; background:#1e293b; color:var(--text-sub);">NOTICIAS DT</span>
          </div>

          <div id="feedListContainer" style="max-height:170px; overflow-y:auto; display:flex; flex-direction:column; gap:6px;">
            ${(gameState.feedItems || []).length === 0 ? `
              <div class="text-sub text-center" style="font-size:0.75rem; padding:10px;">
                📰 Sin publicaciones recientes en el Feed. Avanza la temporada para recibir rumores y noticias.
              </div>
            ` : (gameState.feedItems || []).slice(0, 10).map(f => `
              <div style="background:#0f172a; border:1px solid var(--border-color); border-radius:6px; padding:6px 8px; font-size:0.75rem; display:flex; gap:8px; align-items:flex-start;">
                <span style="font-size:1.1rem; line-height:1;">${f.icon || '📰'}</span>
                <div>
                  <div style="color:var(--text-sub); font-size:0.65rem; font-weight:800;">Semana ${f.week} · T${f.season}</div>
                  <div style="color:#fff; line-height:1.3;">${f.text}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

    </div>

    <!-- Modal de Parón Invernal / Final de Temporada -->
    <div id="seasonModal" class="modal-overlay hidden">
      <div id="seasonModalContent" class="modal-card glass-panel text-center"></div>
    </div>
  `;

  // RENDERIZAR VISTA DE TABLA O CARRUSEL SEGÚN LA PESTAÑA ACTIVA
  const renderCompTab = () => {
    const contentEl = document.getElementById('compTabContent');
    if (!contentEl) return;

    if (activeCompTab === 'LEAGUE') {
      contentEl.innerHTML = `
        <div class="table-responsive">
          <table class="data-table" style="font-size: 0.80rem;">
            <thead>
              <tr>
                <th style="padding: 4px 6px;">#</th>
                <th style="padding: 4px 6px;">Club</th>
                <th style="padding: 4px 6px;">PJ</th>
                <th style="padding: 4px 6px;">PTS</th>
              </tr>
            </thead>
            <tbody>
              ${(gameState.standings || []).slice(0, 8).map((item, idx) => `
                <tr class="${item.teamId === userTeam.id ? 'highlight-row' : ''}">
                  <td style="padding: 5px 6px;">${idx + 1}</td>
                  <td style="padding: 5px 6px;"><strong>${item.name}</strong></td>
                  <td style="padding: 5px 6px;">${item.played}</td>
                  <td style="padding: 5px 6px;"><strong>${item.points}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      const progressList = activeCompTab === 'NATIONAL_CUP' ? gameState.nationalCupProgress : gameState.continentalCupProgress;
      const totalPhases = progressList ? progressList.length : 0;
      currentCupPhaseIdx = Math.max(0, Math.min(currentCupPhaseIdx, totalPhases - 1));

      const phase: CupPhase = progressList?.[currentCupPhaseIdx] || { phaseIndex: 0, week: 0, phaseName: 'Fase Inicial', cupName: '', status: 'PENDIENTE', score: '- -', rivalName: 'Por definir' };

      let statusBadge = '<span style="background: #334155; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 0.72rem;">PENDIENTE ⏳</span>';
      if (phase.status === 'CLASIFICADO' || phase.status === 'VICTORIA') {
        statusBadge = '<span style="background: var(--accent-green); color: #000; padding: 2px 8px; border-radius: 4px; font-weight: 900; font-size: 0.72rem;">CLASIFICADO 🟢</span>';
      } else if (phase.status === 'ELIMINADO' || phase.status === 'DERROTA') {
        statusBadge = '<span style="background: var(--accent-red); color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 0.72rem;">ELIMINADO 🔴</span>';
      } else if (phase.status === 'CAMPEÓN') {
        statusBadge = '<span style="background: var(--accent-gold); color: #000; padding: 2px 8px; border-radius: 4px; font-weight: 900; font-size: 0.72rem;">🥇 ¡CAMPEÓN!</span>';
      }

      contentEl.innerHTML = `
        <div style="background: #0f172a; border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; text-align: center;">
          
          <!-- CONTROLES NAVEGADORES DEL CARRUSEL DE FASES -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <button id="btnPrevCupPhase" class="btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;" ${currentCupPhaseIdx === 0 ? 'disabled style="opacity:0.3;"' : ''}>◀ Anterior</button>
            <span style="font-size: 0.82rem; font-weight: 900; color: var(--accent-cyan);">${phase.phaseName}</span>
            <button id="btnNextCupPhase" class="btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;" ${currentCupPhaseIdx === totalPhases - 1 ? 'disabled style="opacity:0.3;"' : ''}>Siguiente ▶</button>
          </div>

          <!-- TARJETA DEL CRUCE DE LA FASE -->
          <div style="background: #141d2e; border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; margin-bottom: 10px;">
            <div style="font-size: 0.75rem; color: var(--text-sub); margin-bottom: 4px;">Semana ${phase.week} — ${phase.cupName}</div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin: 8px 0;">
              <strong style="font-size: 0.95rem; color: #fff;">${userTeam.name}</strong>
              <span style="background: #090d16; padding: 4px 10px; border-radius: 6px; font-weight: 900; font-size: 1rem; color: var(--accent-gold);">${phase.score}</span>
              <strong style="font-size: 0.95rem; color: var(--text-sub);">${phase.rivalName}</strong>
            </div>
            <div style="margin-top: 6px;">${statusBadge}</div>
          </div>

          <!-- PUNTOS INDICADORES DE FASES DE COPA -->
          <div style="display: flex; gap: 6px; justify-content: center;">
            ${(progressList || []).map((_p, idx) => `
              <div style="width: 8px; height: 8px; border-radius: 50%; background: ${idx === currentCupPhaseIdx ? 'var(--accent-green)' : '#334155'}; transition: background 0.2s ease;"></div>
            `).join('')}
          </div>

        </div>
      `;

      document.getElementById('btnPrevCupPhase')?.addEventListener('click', () => {
        if (currentCupPhaseIdx > 0) {
          sfx.playClick();
          currentCupPhaseIdx--;
          renderCompTab();
        }
      });

      document.getElementById('btnNextCupPhase')?.addEventListener('click', () => {
        if (currentCupPhaseIdx < totalPhases - 1) {
          sfx.playClick();
          currentCupPhaseIdx++;
          renderCompTab();
        }
      });
    }
  };

  renderCompTab();

  document.getElementById('selectCompetitionTab')?.addEventListener('change', (e) => {
    sfx.playClick();
    activeCompTab = (e.target as HTMLSelectElement).value as CompTab;
    currentCupPhaseIdx = 0;
    renderCompTab();
  });

  if (isSeasonCompleted) {
    document.getElementById('btnFinishSeasonDirect')?.addEventListener('click', () => {
      sfx.playClick();
      showEndOfSeasonModal();
    });
  } else {
    document.getElementById('btnPlayMatch')?.addEventListener('click', () => {
      sfx.playWhistle();
      const event = EventsEngine.getEventForWeek(gameState.week);
      if (event) {
        EventsEngine.renderEventModal(event, () => {
          navigateTo('match', { rival: nextRival, mode: 'live' });
        });
      } else {
        navigateTo('match', { rival: nextRival, mode: 'live' });
      }
    });

    document.getElementById('btnSimBlock')?.addEventListener('click', () => {
      sfx.playWhistle();
      const targetWeek = gameState.week < midSeasonWeek ? midSeasonWeek : gameState.maxWeeks;

      let pendingEvent: GameEvent | null = null;

      while (gameState.week < targetWeek && gameState.week < gameState.maxWeeks) {
        const event = EventsEngine.getEventForWeek(gameState.week);
        if (event && !pendingEvent) {
          pendingEvent = event;
        }

        const currentRival = otherTeams[(gameState.week - 1) % otherTeams.length] || nextRival;
        const match = new MatchEngine(userTeam, currentRival, userTeam.overall, currentRival.overall, gameState.matchBonus?.moraleBonus || 0);
        const res = match.simulateFullMatch();

        const totalTicketRevenue = Math.round(500000 + (userTeam.overall * 20000) + (Math.random() * 500000));
        const transferAllocation = Math.round(totalTicketRevenue * 0.25);
        gameState.budget += transferAllocation;

        if (gameState.finances) {
          gameState.finances.ticketRevenue = (gameState.finances.ticketRevenue || 0) + totalTicketRevenue;
          const squadLocal = db.getTeamPlayers(userTeam.id);
          const weeklyWage = squadLocal.reduce((sum, p) => sum + (p.salary || 5000), 0);
          gameState.finances.weeklyWageTotal = (gameState.finances.weeklyWageTotal || 0) + weeklyWage;
        }

        const userStanding = gameState.standings.find(s => s.teamId === userTeam.id);
        const rivalStanding = gameState.standings.find(s => s.teamId === currentRival.id);

        if (userStanding && rivalStanding) {
          userStanding.played = Math.min(gameState.maxWeeks, userStanding.played + 1);
          rivalStanding.played = Math.min(gameState.maxWeeks, rivalStanding.played + 1);
          userStanding.gf += res.homeScore; userStanding.ga += res.awayScore;
          userStanding.gd = userStanding.gf - userStanding.ga;
          rivalStanding.gf += res.awayScore; rivalStanding.ga += res.homeScore;
          rivalStanding.gd = rivalStanding.gf - rivalStanding.ga;

          if (res.homeScore > res.awayScore) {
            userStanding.won++; userStanding.points += 3; rivalStanding.lost++;
            gameState.currentStreak = (gameState.currentStreak || 0) + 1;
            if (gameState.currentStreak > (gameState.bestWinStreak || 0)) gameState.bestWinStreak = gameState.currentStreak;
          } else if (res.homeScore < res.awayScore) {
            rivalStanding.won++; rivalStanding.points += 3; userStanding.lost++;
            gameState.currentStreak = 0;
          } else {
            userStanding.drawn++; userStanding.points += 1;
            rivalStanding.drawn++; rivalStanding.points += 1;
            gameState.currentStreak = 0;
          }
        }

        MatchEngine.simulateAllRivalMatches(userTeam.id, currentRival.id);

        CompetitionsEngine.processCupWeek(gameState.week);
        CompetitionsEngine.processNationalCupWeek(gameState.week);

        if (gameState.week < gameState.maxWeeks) {
          gameState.week++;
        }

        if (pendingEvent) {
          break;
        }
      }

      gameState.standings.sort((a, b) => b.points - a.points || b.gd - a.gd);
      db.saveGame();

      const proceedNextStep = () => {
        if (gameState.week === midSeasonWeek) {
          TransferEngine.resetWindowLocks();
          showMidSeasonModal();
        } else if (gameState.week >= gameState.maxWeeks) {
          showEndOfSeasonModal();
        } else {
          renderDashboard(container, navigateTo);
        }
      };

      if (pendingEvent) {
        EventsEngine.renderEventModal(pendingEvent, proceedNextStep);
      } else {
        proceedNextStep();
      }
    });
  }

  function showMidSeasonModal(): void {
    const modal = document.getElementById('seasonModal')!;
    const content = document.getElementById('seasonModalContent')!;
    modal.classList.remove('hidden');

    content.innerHTML = `
      <h2>❄️ Parón de Mitad de Temporada ${seasonLabel} (Semana ${midSeasonWeek})</h2>
      <p class="text-sub mt-2">¡Ha comenzado el receso invernal! La <strong>Ventana de Fichajes de Invierno</strong> está abierta. Las negociaciones bloqueadas previamente han sido liberadas.</p>
      
      <div class="mt-3">
        <h4>📊 Tu Posición en la Liga: #${gameState.standings.findIndex(s => s.teamId === userTeam.id) + 1}</h4>
        <p>Puntos Acumulados: <strong class="text-highlight">${gameState.standings.find(s => s.teamId === userTeam.id)?.points || 0} PTS</strong></p>
      </div>

      <div class="modal-actions mt-4" style="display: flex; gap: 14px; justify-content: center;">
        <button id="btnContinueFromMidSeason" class="btn-primary btn-large">CONTINUAR TEMPORADA ⚽</button>
      </div>
    `;

    document.getElementById('btnContinueFromMidSeason')!.addEventListener('click', () => {
      sfx.playClick();
      modal.classList.add('hidden');
      renderDashboard(container, navigateTo);
    });
  }

  function showEndOfSeasonModal(): void {
    const modal = document.getElementById('seasonModal')!;
    const content = document.getElementById('seasonModalContent')!;
    modal.classList.remove('hidden');

    const isChampion = userRank === 1;
    const prizeMoney = isChampion ? 15000000 : (userRank <= 4 ? 8000000 : 3000000);
    gameState.budget += prizeMoney;

    if (gameState.season >= 2050) {
      gameState.isCareerFinished = true;
      content.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 10px;">🏆👑</div>
        <h2>¡CARRERA PROFESIONAL COMPLETADA DE 25 TEMPORADAS!</h2>
        <p class="text-sub mt-2">Has culminado tu brillante trayectoria de 25 años como Director Técnico (2026 - 2051).</p>
        <div class="mt-4">
          <button id="btnFinish25Years" class="btn-primary btn-large" style="width: 100%;">VER PALMARÉS Y REGISTRO DE LEYENDA 📜</button>
        </div>
      `;

      document.getElementById('btnFinish25Years')!.addEventListener('click', () => {
        modal.classList.add('hidden');
        navigateTo('trophies');
      });
      return;
    }

    // El contrato existe siempre: app.js lo inicializa en el arranque (evaluatePerformance || startClubContract)
    const contract = ContractEngine.evaluatePerformance()!;
    const isContractExpired = (contract.yearsRemaining || 0) <= 0;

    const squad = db.getTeamPlayers(userTeam.id);
    const topScorer = [...squad].sort((a, b) => (b.seasonGoals || 0) - (a.seasonGoals || 0))[0] || squad[0];
    const mvpName = topScorer ? `${topScorer.name} (${topScorer.pos}, ${topScorer.seasonGoals || 0} Goles)` : 'Sin destacar';

    const seasonGradeNum = Math.min(10, Math.max(1, (10 - userRank * 0.4) + (isChampion ? 2.5 : 0)));
    const seasonGrade = seasonGradeNum.toFixed(1);

    let headline = 'EL RIVAL LE PASÓ EL TRAPO';
    let headlineColor = 'var(--accent-red)';
    if (isChampion) {
      headline = '🏆 CAMPEONES DE GLORIA: TEMPORADA LEGENDARIA';
      headlineColor = 'var(--accent-gold)';
    } else if (userRank <= 4) {
      headline = '🔥 CAMPAÑA EXTRAORDINARIA EN LA ZONA ALTA';
      headlineColor = 'var(--accent-green)';
    } else if (userRank <= 8) {
      headline = '⚽ BALANCE REGULAR Y PROTAGONISMO TÁCTICO';
      headlineColor = 'var(--accent-cyan)';
    }

    content.innerHTML = `
      <div style="text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 12px;">
          <span style="font-weight: 900; letter-spacing: 1px; color: var(--text-sub); font-size: 0.85rem;">POTRERO DEPORTIVO</span>
          <span class="text-sub" style="font-size: 0.8rem;">TEMPORADA ${seasonLabel}</span>
        </div>

        <h1 style="font-size: 1.8rem; font-weight: 900; color: ${headlineColor}; margin-bottom: 6px;">${headline}</h1>
        <p class="text-sub mb-3" style="font-size: 0.88rem;">${userTeam.name} concluyó la temporada regular en el <strong>Puesto #${userRank}</strong> de la tabla general.</p>

        <div style="background: #0f172a; border: 1px solid var(--border-color); padding: 12px 18px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <span style="font-weight: 800; font-size: 0.95rem; color: #fff;">NOTA DE LA TEMPORADA</span>
          <strong style="font-size: 2.2rem; color: ${seasonGradeNum >= 7 ? 'var(--accent-green)' : 'var(--accent-gold)'}; font-weight: 900;">${seasonGrade}</strong>
        </div>

        <div style="background: #141d2e; border: 1px solid var(--border-color); padding: 14px; border-radius: 10px; margin-bottom: 16px; font-size: 0.85rem;">
          <p style="margin-bottom: 6px;">🌟 <strong>MVP del Club:</strong> ${mvpName}</p>
          <p style="margin-bottom: 6px;">🏆 <strong>Posición Final:</strong> Puesto #${userRank} (${userStanding ? userStanding.points : 0} Pts | ${userStanding ? userStanding.won : 0} Victorias)</p>
          <p style="margin-bottom: 6px;">💰 <strong>Premio por Posición:</strong> <strong class="text-highlight">+€${(prizeMoney / 1000000).toFixed(1)}M</strong></p>
          <p style="margin-bottom: 6px;">🔥 <strong>Racha Más Larga:</strong> ${gameState.bestWinStreak || 0} victorias consecutivas esta temporada.</p>
          <p style="margin-bottom: 6px;">⚽ <strong>Victorias en el Clásico:</strong> ${gameState.classicWins || 0} triunfos ante el rival histórico.</p>
          <p style="margin-bottom: 0;">📋 <strong>Fichajes de la Temporada:</strong> ${(gameState.seasonPlayersIn || []).length} entradas · ${(gameState.seasonPlayersOut || []).length} salidas.</p>
        </div>

        <div style="background: #0f172a; border: 1px solid var(--accent-cyan); padding: 14px; border-radius: 10px; margin-bottom: 16px;">
          <h4 style="color: var(--accent-cyan); font-size: 0.9rem; margin-bottom: 6px;">🎤 Rueda de Prensa de Cierre (Estilo José Mourinho)</h4>
          <p style="font-size: 0.82rem;" class="text-sub mb-3">La prensa internacional te pregunta: <em>"¿Cuál es su respuesta a las críticas tras esta campaña?"</em></p>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="btn-secondary btn-mourinho-answer" data-bonus="board" style="text-align: left; font-size: 0.78rem; padding: 10px;">
              👉 "Respeto, respeto y más respeto. Soy el Special One y los números hablan solos." (+5% Confianza Directiva)
            </button>
            <button class="btn-secondary btn-mourinho-answer" data-bonus="morale" style="text-align: left; font-size: 0.78rem; padding: 10px;">
              👉 "Si hablo de los arbitrajes y del presupuesto rival, me sancionan. No tengo nada que decir." (+5% Moral Plantilla)
            </button>
          </div>
          <div id="mourinhoFeedback" class="mt-2 text-highlight hidden" style="font-size: 0.8rem; text-align: center;"></div>
        </div>

        ${isContractExpired ? `
          <div style="background: #0f172a; border: 1px solid var(--accent-gold); padding: 12px; border-radius: 8px; text-align: left; margin-bottom: 14px;">
            <h4 style="color: var(--accent-gold); margin-bottom: 4px; font-size: 0.88rem;">📜 Vínculo Contractual de 3 Años Finalizado</h4>
            <p style="font-size: 0.8rem;" class="text-sub">Confianza Directiva: <strong>${contract.boardConfidence}%</strong>.</p>
          </div>
        ` : ''}

        <div class="modal-actions mt-3" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          ${isContractExpired && contract.renewalChance >= 60 ? `
            <button id="btnRenew3Years" class="btn-primary">✍️ RENOVAR POR 3 AÑOS MÁS (${userTeam.name})</button>
            <button id="btnSearchJobOffersSeason" class="btn-secondary">💼 FIRMAR POR UN NUEVO CLUB</button>
          ` : isContractExpired ? `
            <button id="btnSearchJobOffersSeason" class="btn-primary">💼 EXPLORAR OFERTAS Y CAMBIAR DE CLUB</button>
          ` : `
            <button id="btnAdvanceSeason" class="btn-primary btn-large">🚀 EVOLUCIONAR PLANTILLA & TEMPORADA ${gameState.season + 1}/${gameState.season + 2}</button>
          `}
        </div>
      </div>
    `;

    document.querySelectorAll<HTMLButtonElement>('.btn-mourinho-answer').forEach(btn => {
      btn.addEventListener('click', (e) => {
        sfx.playClick();
        const bonusType = (e.currentTarget as HTMLElement).dataset.bonus;
        const feedback = document.getElementById('mourinhoFeedback')!;
        if (bonusType === 'board') {
          if (gameState.contract) gameState.contract.boardConfidence = Math.min(100, gameState.contract.boardConfidence + 5);
          feedback.innerText = '¡Declaración icónica! La directiva valoró tu contundencia (+5% Confianza).';
        } else {
          gameState.matchBonus.moraleBonus += 5;
          feedback.innerText = '¡Tensión en la sala de prensa! El vestuario cerró filas contigo (+5% Moral).';
        }
        feedback.classList.remove('hidden');
        document.querySelectorAll<HTMLButtonElement>('.btn-mourinho-answer').forEach(b => b.disabled = true);
      });
    });

    document.getElementById('btnRenew3Years')?.addEventListener('click', () => {
      sfx.playGoal();
      ContractEngine.startClubContract(gameState.userTeamId, 3);
      db.processSeasonPlayerEvolution();
      showEvolutionReportModal(gameState.lastSeasonEvolutionReport, () => {
        renderDashboard(container, navigateTo);
      });
    });

    document.getElementById('btnSearchJobOffersSeason')?.addEventListener('click', () => {
      sfx.playClick();
      modal.classList.add('hidden');
      navigateTo('contract');
    });

    document.getElementById('btnAdvanceSeason')?.addEventListener('click', () => {
      sfx.playGoal();
      db.processSeasonPlayerEvolution();
      showEvolutionReportModal(gameState.lastSeasonEvolutionReport, () => {
        renderDashboard(container, navigateTo);
      });
    });
  }

  function showEvolutionReportModal(report: EvolutionReportEntry[] | null | undefined, onContinue?: () => void): void {
    const modal = document.getElementById('seasonModal')!;
    const content = document.getElementById('seasonModalContent')!;
    modal.classList.remove('hidden');

    content.innerHTML = `
      <div style="text-align: left;">
        <h2 style="color: var(--accent-green); margin-bottom: 6px;">📈 REPORTE DE EVOLUCIÓN DE PLANTILLA (${gameState.season}/${gameState.season + 1})</h2>
        <p class="text-sub mb-3">Tus futbolistas han envejecido +1 año. Revisa los crecimientos de media y desarrollos alcanzados:</p>

        <div class="table-responsive mb-4" style="max-height: 280px; overflow-y: auto;">
          <table class="data-table" style="font-size: 0.80rem;">
            <thead>
              <tr>
                <th>POS</th>
                <th>Jugador</th>
                <th>Edad</th>
                <th>OVR Previo</th>
                <th>Nuevo OVR</th>
                <th>Progreso</th>
              </tr>
            </thead>
            <tbody>
              ${(report || []).map(p => `
                <tr>
                  <td><span class="pos-tag pos-${p.pos}">${p.pos}</span></td>
                  <td><strong>${p.name}</strong></td>
                  <td>${p.age}a</td>
                  <td>${p.oldOvr}</td>
                  <td><strong style="color: var(--accent-cyan);">${p.newOvr}</strong></td>
                  <td>
                    ${p.delta > 0 
                      ? `<span class="stat-ovr" style="background: var(--accent-green); color: #000; font-weight: 900; padding: 2px 6px;">+${p.delta} 🚀</span>`
                      : (p.delta < 0 ? `<span style="background: var(--accent-red); color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: 800;">${p.delta} 🔻</span>` : `<span class="text-sub">= CERO</span>`)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="modal-actions text-center">
          <button id="btnContinueToNewSeasonDashboard" class="btn-primary btn-large" style="width: 100%;">
            🚀 INICIAR NUEVA TEMPORADA ${gameState.season}/${gameState.season + 1}
          </button>
        </div>
      </div>
    `;

    document.getElementById('btnContinueToNewSeasonDashboard')?.addEventListener('click', () => {
      sfx.playClick();
      modal.classList.add('hidden');
      if (onContinue) onContinue();
    });
  }
}
