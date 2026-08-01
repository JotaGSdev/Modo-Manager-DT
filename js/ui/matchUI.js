// Vista de Partido en Vivo con Simulación Simultánea de Equipos Rivales y Copas

import { db } from '../data/db.js';
import { MatchEngine } from '../engine/matchEngine.js';
import { CompetitionsEngine } from '../engine/competitionsEngine.js';
import { sfx } from '../../assets/audio/sfx.js';

export function renderMatch(container, rival, mode = 'live', navigateTo) {
  const gameState = db.gameState;
  const userTeam = db.teams[gameState.userTeamId];
  const engine = new MatchEngine(userTeam, rival, userTeam.overall, rival.overall, 0);

  container.innerHTML = `
    <div class="match-layout">
      <!-- Panel de Marcador Principal -->
      <div class="scoreboard-panel glass-panel">
        <div class="team-box">
          <div class="team-badge-circle" style="background: linear-gradient(135deg, ${userTeam.colors[0]}, ${userTeam.colors[1]});">${userTeam.short}</div>
          <h3>${userTeam.name}</h3>
        </div>

        <div class="score-display">
          <span id="homeScoreDisplay" class="score-num">0</span>
          <span class="score-colon">:</span>
          <span id="awayScoreDisplay" class="score-num">0</span>
          <div id="matchTimeDisplay" class="match-time-badge">0'</div>
        </div>

        <div class="team-box">
          <div class="team-badge-circle" style="background: linear-gradient(135deg, ${rival.colors[0]}, ${rival.colors[1]});">${rival.short}</div>
          <h3>${rival.name}</h3>
        </div>
      </div>

      <!-- Log de Comentarios del Partido -->
      <div class="glass-panel">
        <h3>🎙️ Transmisión en Vivo y Relato</h3>
        <div id="commentaryLog" class="commentary-log"></div>
      </div>
    </div>
  `;

  const hScoreEl = document.getElementById('homeScoreDisplay');
  const aScoreEl = document.getElementById('awayScoreDisplay');
  const timeEl = document.getElementById('matchTimeDisplay');
  const logEl = document.getElementById('commentaryLog');

  const addLog = (event) => {
    if (!event || !logEl) return;
    const item = document.createElement('div');
    item.className = `log-entry log-${event.type}`;
    item.innerHTML = `<strong>Min ${event.minute}':</strong> ${event.text}`;
    logEl.prepend(item);
  };

  const finishMatchSession = () => {
    // 1. Ingrese ingresos por taquilla de estadio al presupuesto (+€600k a +€2.5M)
    const ticketRevenue = Math.round(500000 + (userTeam.overall * 20000) + (Math.random() * 500000));
    gameState.budget += ticketRevenue;

    // 2. Actualizar la tabla de posiciones para el usuario y su rival
    const userStanding = gameState.standings.find(s => s.teamId === userTeam.id);
    const rivalStanding = gameState.standings.find(s => s.teamId === rival.id);

    if (userStanding && rivalStanding) {
      userStanding.played++; rivalStanding.played++;
      userStanding.gf += engine.homeScore; userStanding.ga += engine.awayScore;
      userStanding.gd = userStanding.gf - userStanding.ga;
      rivalStanding.gf += engine.awayScore; rivalStanding.ga += engine.homeScore;
      rivalStanding.gd = rivalStanding.gf - rivalStanding.ga;

      if (engine.homeScore > engine.awayScore) {
        userStanding.won++; userStanding.points += 3; rivalStanding.lost++;
      } else if (engine.homeScore < engine.awayScore) {
        rivalStanding.won++; rivalStanding.points += 3; userStanding.lost++;
      } else {
        userStanding.drawn++; userStanding.points += 1;
        rivalStanding.drawn++; rivalStanding.points += 1;
      }
    }

    // 3. SIMULAR LA JORNADA SIMULTÁNEA PARA TODOS LOS DEMÁS EQUIPOS RIVALES DE LA LIGA
    MatchEngine.simulateAllRivalMatches(userTeam.id, rival.id);

    // 4. PROCESAR COMPETICIÓN CONTINENTAL O COPA NACIONAL (SEMANAS 6, 12, 18, 24, 30, 36)
    CompetitionsEngine.processCupWeek(gameState.week);

    gameState.week++;
    gameState.standings.sort((a, b) => b.points - a.points || b.gd - a.gd);
    db.saveGame();

    setTimeout(() => {
      alert(`🏁 Partido finalizado. Taquilla recaudada: +€${(ticketRevenue / 1000000).toFixed(1)}M. Resultados de la jornada de liga y copas actualizados.`);
      navigateTo('dashboard');
    }, 1200);
  };

  // Temporizador de simulación en vivo
  const timer = setInterval(() => {
    const ev = engine.tickMinute();
    if (ev) {
      if (ev.type === 'goal_home' || ev.type === 'goal_away') sfx.playGoal();
      addLog(ev);
    }

    if (hScoreEl) hScoreEl.innerText = engine.homeScore;
    if (aScoreEl) aScoreEl.innerText = engine.awayScore;
    if (timeEl) timeEl.innerText = `${engine.minute}'`;

    if (engine.isFinished) {
      clearInterval(timer);
      finishMatchSession();
    }
  }, 100);
}
