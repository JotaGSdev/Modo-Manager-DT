// Vista de Partido Estilo PES — Marcador Dinámico en Vivo con Posesión, xG, Tiros, Tarjetas y Selector de Velocidad

import { db } from '../data/db.js';
import { MatchEngine } from '../engine/matchEngine.js';
import { CompetitionsEngine } from '../engine/competitionsEngine.js';
import { renderTeamBadgeSVG } from './badgeHelper.js';
import { sfx } from '../../assets/audio/sfx.js';
import { PenaltyEngine } from '../engine/penaltyEngine.js';

function launchOutcomeParticles(canvas, outcome) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const particles = [];
  let colors = ['#00c885', '#0096c7', '#e5a93c', '#ffffff'];
  let particleCount = 120;
  if (outcome === 'loss') { colors = ['#d90429', '#64748b', '#334155']; particleCount = 65; }
  else if (outcome === 'draw') { colors = ['#0096c7', '#94a3b8', '#3b82f6']; particleCount = 60; }
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 5 + 3, speedY: Math.random() * 3 + 2, speedX: (Math.random() - 0.5) * 2,
      color: colors[Math.floor(Math.random() * colors.length)], tilt: Math.random() * 10 - 5
    });
  }
  let animationFrame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      if (outcome === 'loss') {
        ctx.strokeStyle = p.color; ctx.lineWidth = 2;
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + 12); ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x + p.tilt, p.y, p.r, p.r * 1.4);
      }
      p.y += p.speedY; p.x += p.speedX;
      if (p.y > canvas.height) { p.y = -15; p.x = Math.random() * canvas.width; }
    });
    animationFrame = requestAnimationFrame(draw);
  }
  draw();
  setTimeout(() => { cancelAnimationFrame(animationFrame); ctx.clearRect(0, 0, canvas.width, canvas.height); }, 5000);
}

export function renderMatch(container, rival, mode = 'live', isFinal = false, navigateTo) {
  const gameState = db.gameState;
  const userTeam = db.teams[gameState.userTeamId];
  const engine = new MatchEngine(userTeam, rival, userTeam.overall, rival.overall, gameState.matchBonus?.moraleBonus || 0);

  let simSpeed = 90;
  let simTimer = null;

  const commentaryPool = [
    (t, tm) => `El estadio vibra con cada toque de bal\u00f3n de ${tm}.`,
    (t, tm) => `El relator enmudece tras una jugada magistral de ${tm}.`,
    (t, tm) => `Combinaci\u00f3n letal entre los mediocampistas de ${tm}.`,
    (t, tm) => `El juego sigue parejo. Ambos equipos buscan el espacio libre.`,
    (t, tm) => `Min ${t}' — El ritmo del partido es electrizante.`,
    (t, tm) => `El entrenador ajusta la presi\u00f3n alta desde el banquillo.`,
    (t, tm) => `Intento de combinaci\u00f3n por banda izquierda de ${tm}.`,
    (t, tm) => `La defensa rival cierra con una barrida in extremis.`,
    (t, tm) => `Transici\u00f3n r\u00e1pida de ${tm}. \u00a1El mediocampo corre!`,
    (t, tm) => `La afici\u00f3n alienta sin parar desde las gradas.`,
    (t, tm) => `El asistente levanta el bander\u00edn. Fuera de juego anulado.`,
    (t, tm) => `Duelo intenso en el centro del campo.`,
    (t, tm) => `El capit\u00e1n de ${tm} exige concentraci\u00f3n al resto.`,
    (t, tm) => `Min ${t}' — El partido entra en su fase decisiva.`,
    (t, tm) => `El mediocampo de ${tm} recupera el esf\u00e9rico ante la presi\u00f3n rival.`,
    (t, tm) => `VAR revisando una posible jugada. El estadio espera.`,
    (t, tm) => `El extremo intenta el uno contra uno por la derecha.`,
    (t, tm) => `${tm} mantiene el plan de juego propuesto desde el banquillo.`,
    (t, tm) => `El lateral sube a apoyar. Buena amplitud de ${tm}.`,
    (t, tm) => `Los primeros 45 minutos han sido fren\u00e9ticos. Se van al descanso.`,
    (t, tm) => `Se nota la influencia t\u00e1ctica del DT en la presi\u00f3n de ${tm}.`,
    (t, tm) => `Min ${t}' — El portero de ${tm} est\u00e1 atento ante cualquier remate.`,
    (t, tm) => `Disputa a\u00e9rea en el área de ${tm}. El árbitro no cobra nada.`,
    (t, tm) => `El pivot de ${tm} gana el duelo en el centro del terreno.`,
    (t, tm) => `Repliegue defensivo organizado de ${tm} ante la presi\u00f3n rival.`,
  ];

  container.innerHTML = `
    <div class="glass-panel" style="padding:0; overflow:hidden; margin-bottom:14px;">
      <div style="background:linear-gradient(135deg,#0a0e1a 0%,#101827 100%); padding:16px 24px;">
        <div style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:16px;">
          <div style="display:flex; flex-direction:column; align-items:flex-start; gap:6px;">
            <div style="display:flex; align-items:center; gap:10px;">
              ${renderTeamBadgeSVG(userTeam, 48)}
              <div>
                <div style="font-size:1rem; font-weight:900; color:#fff;">${userTeam.name}</div>
                <div class="text-sub" style="font-size:0.72rem;">OVR ${userTeam.overall}</div>
              </div>
            </div>
            <div id="homeGoalsList" style="font-size:0.72rem; color:var(--accent-green); min-height:16px;"></div>
          </div>
          <div style="text-align:center;">
            <div style="display:flex; align-items:center; gap:16px;">
              <span id="homeScoreDisplay" style="font-size:3.5rem; font-weight:900; color:#fff; line-height:1; min-width:48px; text-align:center;">0</span>
              <div style="display:flex; flex-direction:column; align-items:center;">
                <span style="font-size:1rem; color:var(--text-sub); font-weight:900;">:</span>
                <div id="matchTimeDisplay" style="background:var(--accent-cyan); color:#000; font-weight:900; font-size:0.7rem; padding:3px 8px; border-radius:4px; margin-top:4px;">0'</div>
              </div>
              <span id="awayScoreDisplay" style="font-size:3.5rem; font-weight:900; color:#fff; line-height:1; min-width:48px; text-align:center;">0</span>
            </div>
            <div style="display:flex; gap:6px; justify-content:center; margin-top:10px;">
              <button class="speed-btn active" data-speed="90" style="padding:3px 9px; font-size:0.7rem; border-radius:4px; border:1px solid var(--border-color); background:#0f172a; color:#fff; cursor:pointer;">1x</button>
              <button class="speed-btn" data-speed="45" style="padding:3px 9px; font-size:0.7rem; border-radius:4px; border:1px solid var(--border-color); background:#0f172a; color:#fff; cursor:pointer;">2x</button>
              <button class="speed-btn" data-speed="20" style="padding:3px 9px; font-size:0.7rem; border-radius:4px; border:1px solid var(--border-color); background:#0f172a; color:#fff; cursor:pointer;">4x</button>
              <button class="speed-btn" data-speed="0" style="padding:3px 9px; font-size:0.7rem; border-radius:4px; border:1px solid var(--accent-gold); background:rgba(245,158,11,0.15); color:var(--accent-gold); cursor:pointer;">AUTO</button>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="text-align:right;">
                <div style="font-size:1rem; font-weight:900; color:#fff;">${rival.name}</div>
                <div class="text-sub" style="font-size:0.72rem;">OVR ${rival.overall}</div>
              </div>
              ${renderTeamBadgeSVG(rival, 48)}
            </div>
            <div id="awayGoalsList" style="font-size:0.72rem; color:var(--accent-red); min-height:16px; text-align:right;"></div>
          </div>
        </div>
      </div>
      <div style="background:#0a0e1a; padding:12px 24px; border-top:1px solid var(--border-color);">
        <div style="display:grid; grid-template-columns:1fr 120px 1fr; gap:8px; align-items:center; font-size:0.8rem;">
          <div style="text-align:right;"><span id="homePossession" style="font-weight:800; color:var(--accent-cyan);">50%</span></div>
          <div style="text-align:center;">
            <div class="text-sub" style="font-size:0.68rem; margin-bottom:4px; font-weight:700;">POSESI\u00d3N</div>
            <div style="height:6px; background:#1e293b; border-radius:3px; overflow:hidden;">
              <div id="possessionBar" style="height:100%; width:50%; background:linear-gradient(90deg,var(--accent-cyan),var(--accent-green)); border-radius:3px; transition:width 0.4s ease;"></div>
            </div>
          </div>
          <div style="text-align:left;"><span id="awayPossession" style="font-weight:800; color:var(--accent-red);">50%</span></div>
          <div style="text-align:right;"><span id="homeShots" style="font-weight:800;">0</span> <span class="text-sub" style="font-size:0.7rem;">(0 a porter\u00eda)</span></div>
          <div style="text-align:center;"><div class="text-sub" style="font-size:0.68rem; font-weight:700;">TIROS</div></div>
          <div style="text-align:left;"><span id="awayShots" style="font-weight:800;">0</span> <span class="text-sub" style="font-size:0.7rem;">(0 a porter\u00eda)</span></div>
          <div style="text-align:right;"><span id="homeXG" style="font-weight:800; color:var(--accent-gold);">0.00</span></div>
          <div style="text-align:center;"><div class="text-sub" style="font-size:0.68rem; font-weight:700;">xG</div></div>
          <div style="text-align:left;"><span id="awayXG" style="font-weight:800; color:var(--accent-gold);">0.00</span></div>
        </div>
      </div>
    </div>

    <div id="goalFlash" class="hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,200,133,0.12); display:flex; align-items:center; justify-content:center; z-index:1000; pointer-events:none;">
      <div style="font-size:4rem; font-weight:900; color:var(--accent-green); text-shadow:0 0 40px rgba(0,200,133,0.8);" id="goalFlashText">&#x26BD; GOOOOOL</div>
    </div>

    <div class="glass-panel" style="padding:14px 16px;">
      <h4 style="font-size:0.88rem; margin-bottom:10px; color:var(--text-sub);">&#x1F3D9; NARRACI\u00d3N EN VIVO</h4>
      <div id="commentaryLog" style="max-height:240px; overflow-y:auto; display:flex; flex-direction:column; gap:6px;"></div>
    </div>

    <div id="matchCinematicModal" class="cinematic-overlay hidden">
      <canvas id="cinematicCanvas"></canvas>
      <div id="cinematicCard" class="cinematic-card">
        <h2 id="cinematicTitle" class="cinematic-title">\u00a1PARTIDO FINALIZADO!</h2>
        <p id="cinematicSubtitle" class="cinematic-subtitle">Rendimiento deportivo en la jornada</p>
        <div id="cinematicScore" class="cinematic-score">0 - 0</div>
        <div id="cinematicStats" style="font-size:0.82rem; color:var(--text-sub); margin:10px 0;"></div>
        <button id="btnFinishMatch" class="btn-primary btn-large" style="width:100%; margin-top:14px;">CONTINUAR AL DASHBOARD &#x26BD;</button>
      </div>
    </div>
  `;

  const hScoreEl = document.getElementById('homeScoreDisplay');
  const aScoreEl = document.getElementById('awayScoreDisplay');
  const timeEl = document.getElementById('matchTimeDisplay');
  const logEl = document.getElementById('commentaryLog');
  const possBarEl = document.getElementById('possessionBar');
  const homePossEl = document.getElementById('homePossession');
  const awayPossEl = document.getElementById('awayPossession');
  const homeShotsEl = document.getElementById('homeShots');
  const awayShotsEl = document.getElementById('awayShots');
  const homeXGEl = document.getElementById('homeXG');
  const awayXGEl = document.getElementById('awayXG');
  const homeGoalsList = document.getElementById('homeGoalsList');
  const awayGoalsList = document.getElementById('awayGoalsList');

  let homeShotsOnTarget = 0, awayShotsOnTarget = 0;

  const addLog = (event) => {
    if (!event || !logEl) return;
    const item = document.createElement('div');
    const isGoal = event.type === 'goal_home' || event.type === 'goal_away';
    const isCard = event.type === 'yellow_card' || event.type === 'red_card';
    item.style.cssText = `font-size:0.82rem; padding:7px 10px; border-radius:6px; background:${isGoal ? 'rgba(0,200,133,0.15)' : isCard ? 'rgba(245,158,11,0.1)' : '#0f172a'}; border-left:3px solid ${isGoal ? 'var(--accent-green)' : isCard ? '#f59e0b' : 'var(--border-color)'};`;
    item.innerHTML = `<strong style="color:var(--text-sub);">${event.minute}'</strong> ${event.text}`;
    logEl.prepend(item);
  };

  const showGoalFlash = (scorerName, teamName) => {
    const el = document.getElementById('goalFlash');
    const txt = document.getElementById('goalFlashText');
    if (!el || !txt) return;
    txt.innerHTML = `&#x26BD; GOOOOOL<br><span style="font-size:1.5rem; color:#fff;">${scorerName}</span><br><span style="font-size:1rem; color:var(--text-sub);">${teamName}</span>`;
    el.classList.remove('hidden');
    el.style.display = 'flex';
    setTimeout(() => { el.classList.add('hidden'); el.style.display = 'none'; }, 1800);
  };

  const updateStats = () => {
    if (hScoreEl) hScoreEl.innerText = engine.homeScore;
    if (aScoreEl) aScoreEl.innerText = engine.awayScore;
    if (timeEl) timeEl.innerText = `${engine.minute}'`;
    if (possBarEl) possBarEl.style.width = `${engine.homePossession}%`;
    if (homePossEl) homePossEl.innerText = `${engine.homePossession}%`;
    if (awayPossEl) awayPossEl.innerText = `${100 - engine.homePossession}%`;
    if (homeShotsEl) homeShotsEl.innerHTML = `${engine.homeShots} <span class="text-sub" style="font-size:0.7rem;">(${homeShotsOnTarget} a portería)</span>`;
    if (awayShotsEl) awayShotsEl.innerHTML = `${engine.awayShots} <span class="text-sub" style="font-size:0.7rem;">(${awayShotsOnTarget} a portería)</span>`;
    if (homeXGEl) homeXGEl.innerText = engine.homeXG.toFixed(2);
    if (awayXGEl) awayXGEl.innerText = engine.awayXG.toFixed(2);
  };

  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const speed = parseInt(e.currentTarget.dataset.speed);
      document.querySelectorAll('.speed-btn').forEach(b => { b.style.background = '#0f172a'; b.style.color = '#fff'; b.style.borderColor = 'var(--border-color)'; });
      e.currentTarget.style.background = 'rgba(0,150,199,0.25)';
      e.currentTarget.style.color = 'var(--accent-cyan)';
      e.currentTarget.style.borderColor = 'var(--accent-cyan)';
      if (speed === 0) {
        if (simTimer) clearInterval(simTimer);
        while (!engine.isFinished) { const ev = engine.tickMinute(); if (ev) processEvent(ev); }
        updateStats();
        finishMatchSession();
        return;
      }
      simSpeed = speed;
      if (simTimer) clearInterval(simTimer);
      simTimer = setInterval(tick, simSpeed);
    });
  });

  const processEvent = (ev) => {
    if (!ev) return;
    if (ev.type === 'goal_home') {
      sfx.playGoal && sfx.playGoal();
      homeShotsOnTarget++;
      showGoalFlash(ev.scorerName || '', userTeam.name);
      if (homeGoalsList) homeGoalsList.innerHTML += `<span>&#x26BD; ${ev.minute}' ${ev.scorerName || ''} </span>`;
    } else if (ev.type === 'goal_away') {
      sfx.playGoal && sfx.playGoal();
      awayShotsOnTarget++;
      showGoalFlash(ev.scorerName || '', rival.name);
      if (awayGoalsList) awayGoalsList.innerHTML += `<span>&#x26BD; ${ev.minute}' ${ev.scorerName || ''} </span>`;
    } else if (ev.type === 'shot_on_target_home') { homeShotsOnTarget++; }
    else if (ev.type === 'shot_on_target_away') { awayShotsOnTarget++; }
    if (Math.random() < 0.28) {
      const fn = commentaryPool[Math.floor(Math.random() * commentaryPool.length)];
      addLog({ minute: ev.minute, type: 'commentary', text: fn(ev.minute, Math.random() < 0.5 ? userTeam.name : rival.name) });
    }
    addLog(ev);
  };

  const tick = () => {
    const ev = engine.tickMinute();
    processEvent(ev);
    updateStats();
    if (engine.isFinished) { clearInterval(simTimer); finishMatchSession(); }
  };

  simTimer = setInterval(tick, simSpeed);

  const finishMatchSession = () => {
    const totalTicketRevenue = Math.round(500000 + (userTeam.overall * 20000) + (Math.random() * 500000));
    gameState.budget += Math.round(totalTicketRevenue * 0.25);
    if (gameState.finances) {
      gameState.finances.ticketRevenue = (gameState.finances.ticketRevenue || 0) + totalTicketRevenue;
      const squad = db.getTeamPlayers(userTeam.id);
      const weeklyWage = squad.reduce((sum, p) => sum + (p.salary || 5000), 0);
      gameState.finances.weeklyWageTotal = (gameState.finances.weeklyWageTotal || 0) + weeklyWage;
    }
    const userStanding = gameState.standings?.find(s => s.teamId === userTeam.id);
    const rivalStanding = gameState.standings?.find(s => s.teamId === rival.id);
    if (userStanding && rivalStanding) {
      userStanding.played++; rivalStanding.played++;
      userStanding.gf += engine.homeScore; userStanding.ga += engine.awayScore;
      userStanding.gd = userStanding.gf - userStanding.ga;
      rivalStanding.gf += engine.awayScore; rivalStanding.ga += engine.homeScore;
      rivalStanding.gd = rivalStanding.gf - rivalStanding.ga;
      if (engine.homeScore > engine.awayScore) {
        userStanding.won++; userStanding.points += 3; rivalStanding.lost++;
        gameState.currentStreak = (gameState.currentStreak || 0) + 1;
        if (gameState.currentStreak > (gameState.bestWinStreak || 0)) gameState.bestWinStreak = gameState.currentStreak;
      } else if (engine.homeScore < engine.awayScore) {
        rivalStanding.won++; rivalStanding.points += 3; userStanding.lost++;
        gameState.currentStreak = 0;
      } else {
        userStanding.drawn++; userStanding.points += 1;
        rivalStanding.drawn++; rivalStanding.points += 1;
        gameState.currentStreak = 0;
      }
    }
    MatchEngine.simulateAllRivalMatches(userTeam.id, rival.id);
    CompetitionsEngine.processCupWeek(gameState.week);
    CompetitionsEngine.processNationalCupWeek(gameState.week);
    gameState.week++;
    gameState.standings.sort((a, b) => b.points - a.points || b.gd - a.gd);
    db.saveGame();
    if (isFinal && engine.homeScore === engine.awayScore) {
      PenaltyEngine.startPenaltyShootout(userTeam, rival, (userWon) => {
        showMatchCinematicOverlay(userWon ? 1 : 0, userWon ? 0 : 1, true);
      });
      return;
    }
    showMatchCinematicOverlay(engine.homeScore, engine.awayScore, false);
  };

  const showMatchCinematicOverlay = (userGoals, rivalGoals, wasPenalties) => {
    const modalEl = document.getElementById('matchCinematicModal');
    const cardEl = document.getElementById('cinematicCard');
    const titleEl = document.getElementById('cinematicTitle');
    const subEl = document.getElementById('cinematicSubtitle');
    const scoreEl = document.getElementById('cinematicScore');
    const statsEl = document.getElementById('cinematicStats');
    const canvasEl = document.getElementById('cinematicCanvas');
    const btnFinish = document.getElementById('btnFinishMatch');
    if (!modalEl) return;
    scoreEl.innerText = wasPenalties ? `Penales: ${userGoals} - ${rivalGoals}` : `${userGoals} - ${rivalGoals}`;
    const userRank = (gameState.standings || []).findIndex(s => s.teamId === userTeam.id) + 1;
    const userPts = (gameState.standings || []).find(s => s.teamId === userTeam.id)?.points || 0;
    statsEl.innerHTML = `Posici\u00f3n: <strong>#${userRank}</strong> &middot; <strong>${userPts} pts</strong> &middot; Jornada ${gameState.week - 1}/${gameState.maxWeeks}`;
    let outcomeClass = 'draw';
    if (userGoals > rivalGoals) {
      outcomeClass = 'win';
      titleEl.innerText = wasPenalties ? '\u{1F3C6} \u00a1CAMPEONES EN PENALES!' : '\u{1F3C6} \u00a1VICTORIA TRIUNFAL!';
      subEl.innerText = `\u00a1Espectacular rendimiento de ${userTeam.name}!`;
      sfx.playGoal && sfx.playGoal();
    } else if (userGoals < rivalGoals) {
      outcomeClass = 'loss';
      titleEl.innerText = '\u{1F494} DERROTA DOLOROSA';
      subEl.innerText = `Ca\u00edda ante ${rival.name}. El equipo debe reponerse.`;
    } else {
      titleEl.innerText = '\u2696\uFE0F EMPATE LUCHADO';
      subEl.innerText = `Reparto de puntos en una intensa batalla.`;
    }
    cardEl.className = `cinematic-card ${outcomeClass}`;
    modalEl.classList.remove('hidden');
    setTimeout(() => launchOutcomeParticles(canvasEl, outcomeClass), 100);
    btnFinish.addEventListener('click', () => { sfx.playClick && sfx.playClick(); navigateTo('dashboard'); });
  };
}
