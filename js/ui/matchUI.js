// Vista de Partido en Vivo con Simulación Simultánea, Relato, Distribución Financiera de Taquilla Estilo EA FC y Cinemáticas

import { db } from '../data/db.js';
import { MatchEngine } from '../engine/matchEngine.js';
import { CompetitionsEngine } from '../engine/competitionsEngine.js';
import { renderTeamBadgeSVG } from './badgeHelper.js';
import { sfx } from '../../assets/audio/sfx.js';

/**
 * Lanza partículas avanzadas en canvas según el resultado del encuentro (Victoria, Derrota o Empate)
 */
function launchOutcomeParticles(canvas, outcome) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  let colors = ['#00c885', '#0096c7', '#e5a93c', '#ffffff'];
  let particleCount = 120;

  if (outcome === 'loss') {
    colors = ['#d90429', '#64748b', '#334155'];
    particleCount = 65;
  } else if (outcome === 'draw') {
    colors = ['#0096c7', '#94a3b8', '#3b82f6'];
    particleCount = 60;
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 5 + 3,
      speedY: outcome === 'loss' ? Math.random() * 4 + 2 : Math.random() * 3 + 2,
      speedX: outcome === 'draw' ? (Math.random() - 0.5) * 4 : (Math.random() - 0.5) * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5
    });
  }

  let animationFrame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      if (outcome === 'loss') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + 12);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x + p.tilt, p.y, p.r, p.r * 1.4);
      }

      p.y += p.speedY;
      p.x += p.speedX;

      if (p.y > canvas.height) {
        p.y = -15;
        p.x = Math.random() * canvas.width;
      }
    });
    animationFrame = requestAnimationFrame(draw);
  }
  draw();

  setTimeout(() => {
    cancelAnimationFrame(animationFrame);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, 4500);
}

export function renderMatch(container, rival, mode = 'live', navigateTo) {
  const gameState = db.gameState;
  const userTeam = db.teams[gameState.userTeamId];
  const engine = new MatchEngine(userTeam, rival, userTeam.overall, rival.overall, 0);

  container.innerHTML = `
    <div class="match-layout">
      <!-- Panel de Marcador Principal -->
      <div class="scoreboard-panel glass-panel">
        <div class="team-box text-center">
          ${renderTeamBadgeSVG(userTeam, 64)}
          <h3 class="mt-2">${userTeam.name}</h3>
        </div>

        <div class="score-display">
          <span id="homeScoreDisplay" class="score-num">0</span>
          <span class="score-colon">:</span>
          <span id="awayScoreDisplay" class="score-num">0</span>
          <div id="matchTimeDisplay" class="match-time-badge">0'</div>
        </div>

        <div class="team-box text-center">
          ${renderTeamBadgeSVG(rival, 64)}
          <h3 class="mt-2">${rival.name}</h3>
        </div>
      </div>

      <!-- Log de Comentarios del Partido -->
      <div class="glass-panel">
        <h3>🎙️ Transmisión en Vivo y Relato</h3>
        <div id="commentaryLog" class="commentary-log"></div>
      </div>
    </div>

    <!-- Modal Cinemático de Final de Partido -->
    <div id="matchCinematicModal" class="cinematic-overlay hidden">
      <canvas id="cinematicCanvas"></canvas>
      <div id="cinematicCard" class="cinematic-card">
        <h2 id="cinematicTitle" class="cinematic-title">¡PARTIDO FINALIZADO!</h2>
        <p id="cinematicSubtitle" class="cinematic-subtitle">Rendimiento deportivo en la jornada</p>
        <div id="cinematicScore" class="cinematic-score">0 - 0</div>
        <p id="cinematicTicketText" class="text-sub mb-4">Ingresos por Taquilla: +€0M</p>
        <button id="btnFinishMatch" class="btn-primary btn-large" style="width: 100%;">CONTINUAR AL DASHBOARD ⚽</button>
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

  const showMatchCinematicOverlay = (userGoals, rivalGoals, totalTicketRevenue, weeklySalaryExpenses, weeklyAdminExpenses) => {
    const modalEl = document.getElementById('matchCinematicModal');
    const cardEl = document.getElementById('cinematicCard');
    const titleEl = document.getElementById('cinematicTitle');
    const subEl = document.getElementById('cinematicSubtitle');
    const scoreEl = document.getElementById('cinematicScore');
    const ticketEl = document.getElementById('cinematicTicketText');
    const canvasEl = document.getElementById('cinematicCanvas');
    const btnFinish = document.getElementById('btnFinishMatch');

    if (!modalEl) return;

    // Distribución Financiera Directiva Estilo EA FC
    const transferAllocation = Math.round(totalTicketRevenue * 0.25);
    const operatingExpenses = totalTicketRevenue - transferAllocation;
    const totalWeeklyDeduction = weeklySalaryExpenses + weeklyAdminExpenses;

    scoreEl.innerText = `${userGoals} - ${rivalGoals}`;
    ticketEl.innerHTML = `
      <div style="background: #0f172a; padding: 12px; border-radius: 8px; margin-bottom: 14px; text-align: left; font-size: 0.85rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>🎟️ Taquilla del Estadio:</span>
          <strong style="color: var(--accent-green);">+€${(totalTicketRevenue / 1000000).toFixed(2)}M (+€${(transferAllocation / 1000000).toFixed(2)}M a Fichajes)</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>👥 Salarios de Plantilla (-):</span>
          <strong style="color: var(--accent-red);">-€${(weeklySalaryExpenses / 1000).toFixed(0)}K /sem</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>🏢 Gastos Administrativos (-):</span>
          <strong style="color: var(--accent-red);">-€${(weeklyAdminExpenses / 1000).toFixed(0)}K /sem</strong>
        </div>
      </div>
    `;

    let outcomeClass = 'draw';
    if (userGoals > rivalGoals) {
      outcomeClass = 'win';
      titleEl.innerText = '🏆 ¡VICTORIA TRIUNFAL!';
      subEl.innerText = `¡Espectacular rendimiento de ${userTeam.name}! Tres puntos clave para la tabla.`;
      sfx.playGoal();
    } else if (userGoals < rivalGoals) {
      outcomeClass = 'loss';
      titleEl.innerText = '💔 DERROTA DOLOROSA';
      subEl.innerText = `Caída en la jornada. El equipo deberá corregir errores tácticos para el próximo encuentro.`;
    } else {
      outcomeClass = 'draw';
      titleEl.innerText = '⚖️ EMPATE LUCHADO';
      subEl.innerText = `Reparto de puntos tras una intensa batalla sobre el terreno de juego.`;
    }

    cardEl.className = `cinematic-card ${outcomeClass}`;
    modalEl.classList.remove('hidden');

    setTimeout(() => launchOutcomeParticles(canvasEl, outcomeClass), 100);

    btnFinish.addEventListener('click', () => {
      sfx.playClick();
      navigateTo('dashboard');
    });
  };

  const finishMatchSession = () => {
    // 1. Recaudación de Taquilla del Estadio (€600K a €2.5M)
    const totalTicketRevenue = Math.round(500000 + (userTeam.overall * 20000) + (Math.random() * 500000));
    
    // Distribución Financiera EA FC: 25% Presupuesto de Traspasos | 75% Gastos Operativos / Salarios
    const transferAllocation = Math.round(totalTicketRevenue * 0.25);
    gameState.budget += transferAllocation;

    // 2. DEDUCCIÓN SEMANAL REALISTA DE SALARIOS Y GASTOS ADMINISTRATIVOS
    const squad = db.getTeamPlayers(userTeam.id);
    const weeklySalaryExpenses = squad.reduce((sum, p) => sum + (p.salary || 5000), 0);
    const weeklyAdminExpenses = Math.round(userTeam.overall * 2000 + squad.length * 1500);
    const totalWeeklyDeduction = weeklySalaryExpenses + weeklyAdminExpenses;

    gameState.budget = Math.max(0, gameState.budget - totalWeeklyDeduction);

    // Actualizar la tabla de posiciones para el usuario y su rival
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

    // SIMULAR LA JORNADA SIMULTÁNEA PARA TODOS LOS DEMÁS EQUIPOS RIVALES DE LIGA
    MatchEngine.simulateAllRivalMatches(userTeam.id, rival.id);

    // PROCESAR COMPETICIÓN CONTINENTAL O COPA NACIONAL
    CompetitionsEngine.processCupWeek(gameState.week);
    CompetitionsEngine.processNationalCupWeek(gameState.week);

    gameState.week++;
    gameState.standings.sort((a, b) => b.points - a.points || b.gd - a.gd);
    db.saveGame();

    // Lanzar cinemática con desglose de taquilla, salarios y gastos operativos
    showMatchCinematicOverlay(engine.homeScore, engine.awayScore, totalTicketRevenue, weeklySalaryExpenses, weeklyAdminExpenses);
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
  }, 90);
}
