// Vista Principal (Dashboard Integrado en 1 Sola Pantalla - Zero Scroll)

import { db } from '../data/db.js';
import { MatchEngine } from '../engine/matchEngine.js';
import { TrophyRoomEngine } from '../engine/trophyRoom.js';
import { CompetitionsEngine } from '../engine/competitionsEngine.js';
import { TransferEngine } from '../engine/transfers.js';
import { EventsEngine } from '../engine/eventsEngine.js';
import { renderTeamBadgeSVG } from './badgeHelper.js';
import { sfx } from '../../assets/audio/sfx.js';

export function renderDashboard(container, navigateTo) {
  const gameState = db.gameState;
  const userTeam = db.teams[gameState.userTeamId] || { name: 'Mi Club', short: 'DT', overall: 75, colors: ['#00aaff', '#00ffaa'], stadium: 'Estadio Principal', leagueId: 'arg_1' };
  const league = db.leagues.find(l => l.id === userTeam.leagueId) || db.leagues[0] || { name: 'Liga Principal', country: 'Sudamérica' };

  const otherTeams = (league.teams || []).filter(t => t.id !== userTeam.id);
  const nextRival = otherTeams.length > 0 
    ? otherTeams[(gameState.week - 1) % otherTeams.length]
    : { id: 'rival_gen', name: 'Rival FC', short: 'RIV', overall: 73, colors: ['#cc0000', '#000000'], stadium: 'Estadio Rival' };

  const isFinalMatch = gameState.week === gameState.maxWeeks || gameState.week === 19;
  const topScorers = gameState.topScorers || [];
  const seasonLabel = `${gameState.season}/${gameState.season + 1}`;

  const userStanding = (gameState.standings || []).find(s => s.teamId === userTeam.id);
  const userRank = (gameState.standings || []).findIndex(s => s.teamId === userTeam.id) + 1;
  const userPosLabel = userRank > 0 ? `#${userRank} lugar` : 'Competidor';

  const squad = db.getTeamPlayers(userTeam.id);
  const topClubScorer = [...squad].sort((a, b) => (b.seasonGoals || 0) - (a.seasonGoals || 0))[0] || { name: 'Sin registros', seasonGoals: 0 };
  const topClubAssister = squad[1] || squad[0] || { name: 'Sin registros', overall: 75 };

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

    <!-- 2. REJILLA TRI-COLUMNA EN 1 SOLA PANTALLA (PRÓXIMO PARTIDO + TABLA POSICIONES + PICHICHI) -->
    <div style="display: grid; grid-template-columns: 1.1fr 1fr 0.9fr; gap: 14px; align-items: stretch;">
      
      <!-- Columna 1: Tarjeta de Partido -->
      <div class="card glass-panel" style="padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
        <div class="card-header" style="margin-bottom: 8px;">
          <span class="badge ${isFinalMatch ? 'badge-final' : ''}" style="font-size: 0.75rem; padding: 3px 8px;">
            ${gameState.week === 19 ? '❄️ PARÓN INVERNAL' : `JORNADA ${gameState.week} / ${gameState.maxWeeks}`}
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
          <button id="btnPlayMatch" class="btn-primary" style="width: 100%; padding: 10px; font-size: 0.88rem;">⚽ JUGAR PARTIDO EN VIVO</button>
          <button id="btnSimBlock" class="btn-secondary" style="width: 100%; padding: 9px; font-size: 0.84rem;">⏩ SIMULAR HASTA MITAD / FINAL</button>
        </div>
      </div>

      <!-- Columna 2: Tabla de Posiciones -->
      <div class="card glass-panel" style="padding: 14px 16px;">
        <h4 style="margin-bottom: 8px; font-size: 0.92rem; color: #ffffff;">📊 Tabla de Posiciones</h4>
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
      </div>

      <!-- Columna 3: Tabla de Goleadores (Pichichi) -->
      <div class="card glass-panel" style="padding: 14px 16px;">
        <h4 style="margin-bottom: 8px; font-size: 0.92rem; color: #ffffff;">⚽ Pichichi de la Liga</h4>
        <div class="table-responsive">
          <table class="data-table" style="font-size: 0.80rem;">
            <thead>
              <tr>
                <th style="padding: 4px 6px;">#</th>
                <th style="padding: 4px 6px;">Jugador</th>
                <th style="padding: 4px 6px;">Goles</th>
              </tr>
            </thead>
            <tbody>
              ${topScorers.length === 0 ? `
                <tr><td colspan="3" class="text-sub text-center py-3">Sin goles registrados aún.</td></tr>
              ` : topScorers.slice(0, 6).map((s, idx) => `
                <tr>
                  <td style="padding: 5px 6px;">${idx + 1}</td>
                  <td style="padding: 5px 6px;"><strong>${s.name}</strong></td>
                  <td style="padding: 5px 6px;"><span class="stat-ovr" style="padding: 2px 6px; font-size: 0.75rem;">${s.goals} ⚽</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- Modal de Parón Invernal / Final de Temporada -->
    <div id="seasonModal" class="modal-overlay hidden">
      <div id="seasonModalContent" class="modal-card glass-panel text-center"></div>
    </div>
  `;

  // Botón Jugar Partido (Verifica si hay evento narrativo pendiente)
  document.getElementById('btnPlayMatch').addEventListener('click', () => {
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

  // Simular bloque de fechas hasta la Semana 19 (Parón Invernal) o Semana 38 (Final)
  document.getElementById('btnSimBlock').addEventListener('click', () => {
    sfx.playWhistle();
    const targetWeek = gameState.week < 19 ? 19 : gameState.maxWeeks;

    let pendingEvent = null;

    while (gameState.week < targetWeek) {
      const event = EventsEngine.getEventForWeek(gameState.week);
      if (event && !pendingEvent) {
        pendingEvent = event;
      }

      const squad = db.getTeamPlayers(userTeam.id);
      const currentRival = otherTeams[(gameState.week - 1) % otherTeams.length] || nextRival;
      const match = new MatchEngine(userTeam, currentRival, userTeam.overall, currentRival.overall, gameState.matchBonus?.moraleBonus || 0);
      const res = match.simulateFullMatch();

      // Distribución Financiera Directiva EA FC: 25% Fichajes | 75% Gastos Operativos
      const totalTicketRevenue = Math.round(500000 + (userTeam.overall * 20000) + (Math.random() * 500000));
      const transferAllocation = Math.round(totalTicketRevenue * 0.25);
      gameState.budget += transferAllocation;

      const userStanding = gameState.standings.find(s => s.teamId === userTeam.id);
      const rivalStanding = gameState.standings.find(s => s.teamId === currentRival.id);

      if (userStanding && rivalStanding) {
        userStanding.played++; rivalStanding.played++;
        userStanding.gf += res.homeScore; userStanding.ga += res.awayScore;
        userStanding.gd = userStanding.gf - userStanding.ga;
        rivalStanding.gf += res.awayScore; rivalStanding.ga += res.homeScore;
        rivalStanding.gd = rivalStanding.gf - rivalStanding.ga;

        if (res.homeScore > res.awayScore) {
          userStanding.won++; userStanding.points += 3; rivalStanding.lost++;
        } else if (res.homeScore < res.awayScore) {
          rivalStanding.won++; rivalStanding.points += 3; userStanding.lost++;
        } else {
          userStanding.drawn++; userStanding.points += 1;
          rivalStanding.drawn++; rivalStanding.points += 1;
        }
      }

      MatchEngine.simulateAllRivalMatches(userTeam.id, currentRival.id);

      CompetitionsEngine.processCupWeek(gameState.week);
      CompetitionsEngine.processNationalCupWeek(gameState.week);

      gameState.week++;

      if (pendingEvent) {
        break;
      }
    }

    gameState.standings.sort((a, b) => b.points - a.points || b.gd - a.gd);
    db.saveGame();

    const proceedNextStep = () => {
      if (gameState.week === 19) {
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

  function showMidSeasonModal() {
    const modal = document.getElementById('seasonModal');
    const content = document.getElementById('seasonModalContent');
    modal.classList.remove('hidden');

    content.innerHTML = `
      <h2>❄️ Parón de Mitad de Temporada ${seasonLabel} (Semana 19)</h2>
      <p class="text-sub mt-2">¡Ha comenzado el receso invernal! La <strong>Ventana de Fichajes de Invierno</strong> está abierta. Las negociaciones bloqueadas previamente han sido liberadas.</p>
      
      <div class="mt-3">
        <h4>📊 Tu Posición en la Liga: #${gameState.standings.findIndex(s => s.teamId === userTeam.id) + 1}</h4>
        <p>Puntos Acumulados: <strong class="text-highlight">${gameState.standings.find(s => s.teamId === userTeam.id)?.points || 0} PTS</strong></p>
      </div>

      <div class="modal-actions mt-4" style="display: flex; gap: 14px; justify-content: center;">
        <button id="btnGoTransfersModal" class="btn-primary">📝 IR AL MERCADO DE INVIERNO</button>
        <button id="btnCloseSeasonModal" class="btn-secondary">CONTINUAR TEMPORADA</button>
      </div>
    `;

    document.getElementById('btnGoTransfersModal').addEventListener('click', () => {
      modal.classList.add('hidden');
      navigateTo('transfers');
    });

    document.getElementById('btnCloseSeasonModal').addEventListener('click', () => {
      modal.classList.add('hidden');
      renderDashboard(container, navigateTo);
    });
  }

  function showEndOfSeasonModal() {
    const modal = document.getElementById('seasonModal');
    const content = document.getElementById('seasonModalContent');
    modal.classList.remove('hidden');

    const champion = gameState.standings[0];
    const isChampion = champion.teamId === userTeam.id;

    const userRank = gameState.standings.findIndex(s => s.teamId === userTeam.id) + 1;
    let prizeMoney = 10000000;
    if (userRank === 1) prizeMoney = 40000000;
    else if (userRank <= 4) prizeMoney = 25000000;
    else if (userRank <= 8) prizeMoney = 18000000;

    gameState.budget += prizeMoney;

    if (isChampion) {
      TrophyRoomEngine.recordTrophy(`${league.name} - Campeón`, seasonLabel);
    }

    const is25YearCareerFinished = gameState.season >= 2050;

    if (is25YearCareerFinished) {
      gameState.isCareerFinished = true;
      db.saveGame();

      const tipBtn = document.getElementById('supportTipBtn');
      if (tipBtn) tipBtn.classList.remove('hidden');

      content.innerHTML = `
        <h2>🏆 ¡CARRERA PROFESIONAL FINALIZADA (25 AÑOS)!</h2>
        <p class="text-sub mt-2">Has completado tu trayectoria histórica como Director Técnico (2026 - 2051).</p>
        
        <div class="mt-3">
          <p>Títulos Conquistados: <strong class="text-highlight">${gameState.trophies ? gameState.trophies.length : 0} Títulos</strong></p>
          <p>Premio de Fin de Carrera: <strong class="text-highlight">+€${(prizeMoney / 1000000).toFixed(1)}M</strong></p>
        </div>

        <div class="modal-actions mt-4">
          <button id="btnFinish25Years" class="btn-primary btn-large">📜 VER PALMARÉS FINAL DE MI CARRERA</button>
        </div>
      `;

      document.getElementById('btnFinish25Years').addEventListener('click', () => {
        modal.classList.add('hidden');
        navigateTo('trophies');
      });
      return;
    }

    content.innerHTML = `
      <h2>🏁 Final de la Temporada ${seasonLabel}</h2>
      <p class="text-sub mt-2">${isChampion ? '🏆 ¡FELICIDADES! ¡ERES EL CAMPEÓN OFICIAL DE LA LIGA!' : `Campeón de la liga: <strong>${champion.name}</strong>`}</p>
      
      <div class="mt-3">
        <p class="text-highlight">💰 Premio por posición (#${userRank}): +€${(prizeMoney / 1000000).toFixed(1)}M ingresados al presupuesto.</p>
        <p class="text-sub mt-1">Al avanzar a la temporada ${gameState.season + 1}/${gameState.season + 2}, las medias de tus jugadores evolucionarán según su edad y partidos disputados.</p>
      </div>

      <div class="modal-actions mt-4">
        <button id="btnAdvanceSeason" class="btn-primary btn-large">🚀 EVOLUCIONAR PLANTILLA & TEMPORADA ${gameState.season + 1}/${gameState.season + 2}</button>
      </div>
    `;

    document.getElementById('btnAdvanceSeason').addEventListener('click', () => {
      sfx.playGoal();
      db.processSeasonPlayerEvolution();
      modal.classList.add('hidden');
      renderDashboard(container, navigateTo);
    });
  }
}
