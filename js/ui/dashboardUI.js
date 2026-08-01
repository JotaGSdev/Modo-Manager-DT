// Vista Principal (Dashboard) con Simulación de Jornada Completa para Todos los Equipos y Copas Continentales

import { db } from '../data/db.js';
import { MatchEngine } from '../engine/matchEngine.js';
import { EventsEngine } from '../engine/eventsEngine.js';
import { TrophyRoomEngine } from '../engine/trophyRoom.js';
import { CompetitionsEngine } from '../engine/competitionsEngine.js';
import { TransferEngine } from '../engine/transfers.js';
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

  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- Tarjeta de Partido y Avance de Temporada -->
      <div class="card next-match-card glass-panel">
        <div class="card-header">
          <span class="badge ${isFinalMatch ? 'badge-final' : ''}">
            ${gameState.week === 19 ? '❄️ PARÓN INVERNAL (SEMANA 19)' : `JORNADA ${gameState.week} DE ${gameState.maxWeeks}`}
          </span>
          <span class="league-name">${league.name} (${league.country}) - Temporada ${seasonLabel}</span>
        </div>

        <div class="match-vs-container">
          <div class="team-box">
            <div class="team-badge-circle" style="background: linear-gradient(135deg, ${userTeam.colors[0]}, ${userTeam.colors[1]});">
              ${userTeam.short}
            </div>
            <h4>${userTeam.name}</h4>
            <span class="team-ovr">OVR: ${userTeam.overall}</span>
          </div>

          <div class="vs-divider">
            <span class="vs-text">VS</span>
            <span class="stadium-subtext">🏟️ ${userTeam.stadium}</span>
          </div>

          <div class="team-box">
            <div class="team-badge-circle" style="background: linear-gradient(135deg, ${nextRival.colors[0]}, ${nextRival.colors[1]});">
              ${nextRival.short}
            </div>
            <h4>${nextRival.name}</h4>
            <span class="team-ovr">OVR: ${nextRival.overall}</span>
          </div>
        </div>

        <div class="match-actions">
          <button id="btnPlayMatch" class="btn-primary btn-large">⚽ JUGAR PARTIDO EN VIVO</button>
          <button id="btnSimBlock" class="btn-secondary">⏩ SIMULAR HASTA MITAD / FINAL</button>
        </div>
      </div>

      <!-- Clasificación de la Liga -->
      <div class="card glass-panel">
        <h3>📊 Tabla de Posiciones - ${league.name} (${(league.teams || []).length} Equipos)</h3>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Club</th>
                <th>PJ</th>
                <th>PTS</th>
              </tr>
            </thead>
            <tbody>
              ${(gameState.standings || []).slice(0, 10).map((item, idx) => `
                <tr class="${item.teamId === userTeam.id ? 'highlight-row' : ''}">
                  <td>${idx + 1}</td>
                  <td><strong>${item.name}</strong></td>
                  <td>${item.played}</td>
                  <td><strong>${item.points}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tabla de Goleadores (Pichichi) -->
      <div class="card glass-panel">
        <h3>⚽ Tabla de Goleadores (Pichichi)</h3>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Jugador</th>
                <th>Club</th>
                <th>Goles</th>
              </tr>
            </thead>
            <tbody>
              ${topScorers.length === 0 ? `
                <tr><td colspan="4" class="text-sub text-center">Sin goles registrados aún en la temporada ${seasonLabel}.</td></tr>
              ` : topScorers.slice(0, 8).map((s, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${s.name}</strong></td>
                  <td>${s.teamName}</td>
                  <td><span class="stat-ovr">${s.goals} ⚽</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal de Parón Invernal / Final de Temporada -->
    <div id="seasonModal" class="modal-overlay hidden">
      <div id="seasonModalContent" class="modal-card glass-panel"></div>
    </div>
  `;

  document.getElementById('btnPlayMatch').addEventListener('click', () => {
    sfx.playWhistle();
    navigateTo('match', { rival: nextRival, mode: 'live' });
  });

  // Simular bloque de fechas hasta la Semana 19 (Parón Invernal) o Semana 38 (Final)
  document.getElementById('btnSimBlock').addEventListener('click', () => {
    sfx.playWhistle();
    const targetWeek = gameState.week < 19 ? 19 : gameState.maxWeeks;

    while (gameState.week < targetWeek) {
      const squad = db.getTeamPlayers(userTeam.id);
      const currentRival = otherTeams[(gameState.week - 1) % otherTeams.length] || nextRival;
      const match = new MatchEngine(userTeam, currentRival, userTeam.overall, currentRival.overall, gameState.matchBonus?.moraleBonus || 0);
      const res = match.simulateFullMatch();

      // Taquilla por partido como local
      const ticketRevenue = Math.round(500000 + (userTeam.overall * 20000) + (Math.random() * 500000));
      gameState.budget += ticketRevenue;

      // Actualizar marcador del usuario y su rival
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

      // SIMULAR SIMULTÁNEAMENTE TODOS LOS DEMÁS PARTIDOS DE LA JORNADA RIVAL
      MatchEngine.simulateAllRivalMatches(userTeam.id, currentRival.id);

      // PROCESAR COMPETICIÓN CONTINENTAL O COPA NACIONAL (SEMANAS 6, 12, 18, 24, 30, 36)
      CompetitionsEngine.processCupWeek(gameState.week);

      gameState.week++;
    }

    gameState.standings.sort((a, b) => b.points - a.points || b.gd - a.gd);
    db.saveGame();

    if (gameState.week === 19) {
      TransferEngine.resetWindowLocks(); // Reiniciar negociaciones para la ventana de invierno
      showMidSeasonModal();
    } else if (gameState.week >= gameState.maxWeeks) {
      showEndOfSeasonModal();
    } else {
      renderDashboard(container, navigateTo);
    }
  });

  function showMidSeasonModal() {
    const modal = document.getElementById('seasonModal');
    const content = document.getElementById('seasonModalContent');
    modal.classList.remove('hidden');

    content.innerHTML = `
      <h3>❄️ Parón de Mitad de Temporada ${seasonLabel} (Semana 19)</h3>
      <p class="text-sub">¡Ha comenzado el receso invernal! La <strong>Ventana de Fichajes de Invierno</strong> está abierta. Las negociaciones bloqueadas previamente han sido liberadas.</p>
      
      <div class="mt-3">
        <h4>📊 Tu Posición en la Liga: #${gameState.standings.findIndex(s => s.teamId === userTeam.id) + 1}</h4>
        <p>Puntos: <strong>${gameState.standings.find(s => s.teamId === userTeam.id)?.points || 0}</strong></p>
      </div>

      <div class="modal-actions mt-4">
        <button id="btnGoTransfersModal" class="btn-primary">📝 IR AL MERCADO DE INVIERNO</button>
        <button id="btnCloseSeasonModal" class="btn-secondary">Continuar Temporada</button>
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

    // Premios económicos por posición en la liga
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
        <h3>🏆 ¡CARRERA PROFESIONAL FINALIZADA (25 AÑOS)!</h3>
        <p class="text-sub">Has completado tu trayectoria histórica como Director Técnico (2026 - 2051).</p>
        
        <div class="mt-3">
          <p>Títulos Conquistados: <strong class="text-highlight">${gameState.trophies ? gameState.trophies.length : 0}</strong></p>
          <p>Premio de Fin de Carrera: <strong class="text-highlight">+€${(prizeMoney / 1000000).toFixed(1)}M</strong></p>
        </div>

        <div class="modal-actions mt-4">
          <button id="btnFinish25Years" class="btn-primary">📜 VER PALMARÉS FINAL DE MI CARRERA</button>
        </div>
      `;

      document.getElementById('btnFinish25Years').addEventListener('click', () => {
        modal.classList.add('hidden');
        navigateTo('trophies');
      });
      return;
    }

    content.innerHTML = `
      <h3>🏁 Final de la Temporada ${seasonLabel}</h3>
      <p class="text-sub">${isChampion ? '🏆 ¡FELICIDADES! ¡ERES EL CAMPEÓN DE LA LIGA!' : `Campeón de la liga: <strong>${champion.name}</strong>`}</p>
      
      <div class="mt-3">
        <p class="text-highlight">💰 Premio por posición (#${userRank}): +€${(prizeMoney / 1000000).toFixed(1)}M al presupuesto de traspasos.</p>
        <p>Al avanzar a la siguiente temporada (${gameState.season + 1}/${gameState.season + 2}), las medias de tus jugadores evolucionarán según su edad y minutos disputados.</p>
      </div>

      <div class="modal-actions mt-4">
        <button id="btnAdvanceSeason" class="btn-primary">🚀 EVOLUCIONAR PLANTILLA & TEMPORADA ${gameState.season + 1}/${gameState.season + 2}</button>
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
