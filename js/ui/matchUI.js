// Vista de Partido en Vivo con Simulación Simultánea, Relato y Cinemáticas de Resultado

import { db } from '../data/db.js';
import { MatchEngine } from '../engine/matchEngine.js';
import { CompetitionsEngine } from '../engine/competitionsEngine.js';
import { sfx } from '../../assets/audio/sfx.js';

/**
 * Lanza partículas de confeti en el canvas cuando hay victoria
 */
function launchConfetti(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth || 600;
  canvas.height = canvas.offsetHeight || 400;

  const particles = [];
  const colors = ['#00e5a3', '#00b4d8', '#ffc107', '#ffffff', '#e67e22'];

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 3,
      d: Math.random() * 80,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngleIncremental: Math.random() * 0.07 + 0.05,
      tiltAngle: 0
    });
  }

  let animationFrame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();

      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.tilt = Math.sin(p.tiltAngle) * 15;

      if (p.y > canvas.height) {
        p.y = -10;
        p.x = Math.random() * canvas.width;
      }
    });
    animationFrame = requestAnimationFrame(draw);
  }
  draw();

  setTimeout(() => {
    cancelAnimationFrame(animationFrame);
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
          <div class="team-badge-circle" style="background: linear-gradient(135deg, ${userTeam.colors[0]}, ${userTeam.colors[1]}); width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #fff; margin: 0 auto 8px auto;">${userTeam.short}</div>
          <h3>${userTeam.name}</h3>
        </div>

        <div class="score-display">
          <span id="homeScoreDisplay" class="score-num">0</span>
          <span class="score-colon">:</span>
          <span id="awayScoreDisplay" class="score-num">0</span>
          <div id="matchTimeDisplay" class="match-time-badge">0'</div>
        </div>

        <div class="team-box text-center">
          <div class="team-badge-circle" style="background: linear-gradient(135deg, ${rival.colors[0]}, ${rival.colors[1]}); width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #fff; margin: 0 auto 8px auto;">${rival.short}</div>
          <h3>${rival.name}</h3>
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
      <div id="cinematicCard" class="cinematic-card">
        <canvas id="cinematicCanvas"></canvas>
        <div style="position: relative; z-index: 2;">
          <h2 id="cinematicTitle" class="cinematic-title">¡PARTIDO FINALIZADO!</h2>
          <p id="cinematicSubtitle" class="cinematic-subtitle">Rendimiento deportivo en la jornada</p>
          <div id="cinematicScore" class="cinematic-score">0 - 0</div>
          <p id="cinematicTicketText" class="text-sub mb-4">Ingresos por Taquilla: +€0M</p>
          <button id="btnFinishMatch" class="btn-primary btn-large">CONTINUAR AL DASHBOARD ⚽</button>
        </div>
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

  const showMatchCinematicOverlay = (userGoals, rivalGoals, ticketRevenue) => {
    const modalEl = document.getElementById('matchCinematicModal');
    const cardEl = document.getElementById('cinematicCard');
    const titleEl = document.getElementById('cinematicTitle');
    const subEl = document.getElementById('cinematicSubtitle');
    const scoreEl = document.getElementById('cinematicScore');
    const ticketEl = document.getElementById('cinematicTicketText');
    const canvasEl = document.getElementById('cinematicCanvas');
    const btnFinish = document.getElementById('btnFinishMatch');

    if (!modalEl) return;

    scoreEl.innerText = `${userGoals} - ${rivalGoals}`;
    ticketEl.innerText = `🎟️ Recaudación de Taquilla de Estadio: +€${(ticketRevenue / 1000000).toFixed(2)}M`;

    let outcomeClass = 'draw';
    if (userGoals > rivalGoals) {
      outcomeClass = 'win';
      titleEl.innerText = '¡VICTORIA TRIUNFAL!';
      subEl.innerText = `¡Espectacular rendimiento de ${userTeam.name}! Tres puntos clave para la tabla.`;
      sfx.playGoal();
      setTimeout(() => launchConfetti(canvasEl), 100);
    } else if (userGoals < rivalGoals) {
      outcomeClass = 'loss';
      titleEl.innerText = 'DERROTA DOLOROSA';
      subEl.innerText = `Caída en la jornada. El equipo deberá corregir errores tácticos para el próximo encuentro.`;
    } else {
      outcomeClass = 'draw';
      titleEl.innerText = 'EMPATE LUCHADO';
      subEl.innerText = `Reparto de puntos tras una intensa batalla sobre el terreno de juego.`;
    }

    cardEl.className = `cinematic-card ${outcomeClass}`;
    modalEl.classList.remove('hidden');

    btnFinish.addEventListener('click', () => {
      sfx.playClick();
      navigateTo('dashboard');
    });
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

    // 4. PROCESAR COMPETICIÓN CONTINENTAL O COPA NACIONAL
    CompetitionsEngine.processCupWeek(gameState.week);
    CompetitionsEngine.processNationalCupWeek(gameState.week);

    gameState.week++;
    gameState.standings.sort((a, b) => b.points - a.points || b.gd - a.gd);
    db.saveGame();

    // Lanzar cinemática
    showMatchCinematicOverlay(engine.homeScore, engine.awayScore, ticketRevenue);
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
