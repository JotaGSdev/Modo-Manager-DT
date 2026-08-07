// Vista de Partido Estilo PES — Marcador Dinámico en Vivo con Posesión, xG, Tiros, Tarjetas y Selector de Velocidad
// Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.

import { db } from '../data/db.js';
import { MatchEngine } from '../engine/matchEngine.js';
import { CompetitionsEngine } from '../engine/competitionsEngine.js';
import { renderTeamBadgeSVG } from './badgeHelper.js';
import { sfx } from '../../assets/audio/sfx.js';
import { PenaltyEngine } from '../engine/penaltyEngine.js';

import type { MatchEvent, NavigateFn, TacticalOrder, Team, TensionOption } from '../types.js';

/**
 * Evento de partido con `type` ampliado a string: matchUI compara con tipos
 * históricos que el motor ya no emite ('yellow_card', 'shot_on_target_home'...)
 * y crea comentarios sintéticos ('commentary'). La unión estricta MatchEventType
 * se mantiene para el motor.
 */
type LooseMatchEvent = Omit<MatchEvent, 'type'> & { type: string };

/** Partícula de confeti del overlay cinematográfico */
interface Particle {
  x: number;
  y: number;
  r: number;
  speedY: number;
  speedX: number;
  color: string;
  tilt: number;
}

function launchOutcomeParticles(canvas: HTMLCanvasElement | null, outcome: string): void {
  if (!canvas) return;
  const cnv: HTMLCanvasElement = canvas; // const local para conservar el narrow dentro de draw()
  const ctx = cnv.getContext('2d')!;
  cnv.width = window.innerWidth;
  cnv.height = window.innerHeight;
  const particles: Particle[] = [];
  let colors = ['#00c885', '#0096c7', '#e5a93c', '#ffffff'];
  let particleCount = 120;
  if (outcome === 'loss') { colors = ['#d90429', '#64748b', '#334155']; particleCount = 65; }
  else if (outcome === 'draw') { colors = ['#0096c7', '#94a3b8', '#3b82f6']; particleCount = 60; }
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * cnv.width, y: Math.random() * cnv.height - cnv.height,
      r: Math.random() * 5 + 3, speedY: Math.random() * 3 + 2, speedX: (Math.random() - 0.5) * 2,
      color: colors[Math.floor(Math.random() * colors.length)]!, tilt: Math.random() * 10 - 5
    });
  }
  let animationFrame: number | undefined;
  function draw() {
    ctx.clearRect(0, 0, cnv.width, cnv.height);
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
      if (p.y > cnv.height) { p.y = -15; p.x = Math.random() * cnv.width; }
    });
    animationFrame = requestAnimationFrame(draw);
  }
  draw();
  setTimeout(() => { if (animationFrame) cancelAnimationFrame(animationFrame); ctx.clearRect(0, 0, cnv.width, cnv.height); }, 5000);
}

export function renderMatch(container: HTMLElement, rival: Team, _mode = 'live', isFinal = false, navigateTo: NavigateFn): void {
  const gameState = db.gameState!;
  const userTeam = db.teams[gameState.userTeamId]!;
  const engine = new MatchEngine(userTeam, rival, userTeam.overall, rival.overall, gameState.matchBonus?.moraleBonus || 0);

  let simSpeed = 90;
  let simTimer: number | null = null;

  // FIX: idempotencia de la sesión de partido. resolveChoice puede ejecutarse 2 veces
  // (countdown expirado + clic del usuario en el mismo momento de tensión), lo que creaba
  // setInterval(tick) duplicados; el huérfano disparaba finishMatchSession() en bucle y
  // corrompía el save (semana/budget/puntos creciendo sin fin). Este flag hace que la
  // sesión solo se cierre una vez por partido.
  let matchSessionCompleted = false;

  /** Etiquetas de las órdenes tácticas (compartidas por el modal interactivo y el modo AUTO) */
  const TACTICAL_ORDER_LABELS: Record<TacticalOrder, string> = {
    PRESSING: '⚡ PRESIÓN ALTA',
    LOW_BLOCK: '🚌 BLOQUE BAJO',
    COUNTER: '🎯 CONTRAATAQUE'
  };

  /** Decisión táctica registrada en un momento de tensión (para el resumen del final) */
  interface TensionDecision {
    minute: number;
    homeScore: number;
    awayScore: number;
    order: TacticalOrder;
    source: 'manual' | 'automatic';
  }
  const tensionDecisions: TensionDecision[] = [];

  const commentaryPool: Array<(t: number, tm: string) => string> = [
    (_t, tm) => `El estadio vibra con cada toque de bal\u00f3n de ${tm}.`,
    (_t, tm) => `El relator enmudece tras una jugada magistral de ${tm}.`,
    (_t, tm) => `Combinaci\u00f3n letal entre los mediocampistas de ${tm}.`,
    (_t, _tm) => `El juego sigue parejo. Ambos equipos buscan el espacio libre.`,
    (t, _tm) => `Min ${t}' — El ritmo del partido es electrizante.`,
    (_t, _tm) => `El entrenador ajusta la presi\u00f3n alta desde el banquillo.`,
    (_t, tm) => `Intento de combinaci\u00f3n por banda izquierda de ${tm}.`,
    (_t, _tm) => `La defensa rival cierra con una barrida in extremis.`,
    (_t, tm) => `Transici\u00f3n r\u00e1pida de ${tm}. \u00a1El mediocampo corre!`,
    (_t, _tm) => `La afici\u00f3n alienta sin parar desde las gradas.`,
    (_t, _tm) => `El asistente levanta el bander\u00edn. Fuera de juego anulado.`,
    (_t, _tm) => `Duelo intenso en el centro del campo.`,
    (_t, tm) => `El capit\u00e1n de ${tm} exige concentraci\u00f3n al resto.`,
    (t, _tm) => `Min ${t}' — El partido entra en su fase decisiva.`,
    (_t, tm) => `El mediocampo de ${tm} recupera el esf\u00e9rico ante la presi\u00f3n rival.`,
    (_t, _tm) => `VAR revisando una posible jugada. El estadio espera.`,
    (_t, _tm) => `El extremo intenta el uno contra uno por la derecha.`,
    (_t, tm) => `${tm} mantiene el plan de juego propuesto desde el banquillo.`,
    (_t, tm) => `El lateral sube a apoyar. Buena amplitud de ${tm}.`,
    (_t, _tm) => `Los primeros 45 minutos han sido fren\u00e9ticos. Se van al descanso.`,
    (_t, tm) => `Se nota la influencia t\u00e1ctica del DT en la presi\u00f3n de ${tm}.`,
    (t, tm) => `Min ${t}' — El portero de ${tm} est\u00e1 atento ante cualquier remate.`,
    (_t, tm) => `Disputa a\u00e9rea en el \u00e1rea de ${tm}. El \u00e1rbitro no cobra nada.`,
    (_t, tm) => `El pivot de ${tm} gana el duelo en el centro del terreno.`,
    (_t, tm) => `Repliegue defensivo organizado de ${tm} ante la presi\u00f3n rival.`,
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
            <div class="text-sub" style="font-size:0.68rem; margin-bottom:4px; font-weight:700;">POSESIÓN</div>
            <div style="height:6px; background:#1e293b; border-radius:3px; overflow:hidden;">
              <div id="possessionBar" style="height:100%; width:50%; background:linear-gradient(90deg,var(--accent-cyan),var(--accent-green)); border-radius:3px; transition:width 0.4s ease;"></div>
            </div>
          </div>
          <div style="text-align:left;"><span id="awayPossession" style="font-weight:800; color:var(--accent-red);">50%</span></div>
          <div style="text-align:right;"><span id="homeShots" style="font-weight:800;">0</span> <span class="text-sub" style="font-size:0.7rem;">(0 a portería)</span></div>
          <div style="text-align:center;"><div class="text-sub" style="font-size:0.68rem; font-weight:700;">TIROS</div></div>
          <div style="text-align:left;"><span id="awayShots" style="font-weight:800;">0</span> <span class="text-sub" style="font-size:0.7rem;">(0 a portería)</span></div>
          <div style="text-align:right;"><span id="homeXG" style="font-weight:800; color:var(--accent-gold);">0.00</span></div>
          <div style="text-align:center;"><div class="text-sub" style="font-size:0.68rem; font-weight:700;">xG</div></div>
          <div style="text-align:left;"><span id="awayXG" style="font-weight:800; color:var(--accent-gold);">0.00</span></div>
        </div>

        <!-- ── v2.0: LÍNEA DE TIEMPO VISUAL DEL PARTIDO ── -->
        <div style="margin-top:12px; padding-top:10px; border-top:1px dashed rgba(255,255,255,0.08);">
          <div style="display:flex; justify-content:space-between; font-size:0.65rem; color:var(--text-sub); margin-bottom:4px;">
            <span>0'</span><span>15'</span><span>30'</span><span>45' HT</span><span>60'</span><span>75'</span><span>90' FT</span>
          </div>
          <div id="matchTimelineTrack" style="height:10px; background:#0f172a; border-radius:5px; position:relative; overflow:hidden; border:1px solid var(--border-color);">
            <div id="matchTimelineProgress" style="height:100%; width:0%; background:var(--accent-cyan); transition:width 0.2s;"></div>
            <div id="matchTimelineEvents" style="position:absolute; top:0; left:0; width:100%; height:100%;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── v2.0: SELECTOR DE VISTA DE PARTIDO (BITÁCORA vs RADAR 2D) ── -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <div style="display:flex; gap:8px;">
        <button id="tabLogView" class="btn-secondary active" style="padding:6px 14px; font-size:0.8rem;">📜 Bitácora Narrativa</button>
        <button id="tabRadarView" class="btn-secondary" style="padding:6px 14px; font-size:0.8rem;">📡 Radar 2D en Vivo</button>
      </div>
      <div id="activeTacticalOrderBadge" class="text-sub" style="font-size:0.75rem; font-weight:700; color:var(--accent-gold);"></div>
    </div>

    <!-- VISTA BITÁCORA -->
    <div id="logViewContainer" class="glass-panel" style="padding:14px 16px;">
      <h4 style="font-size:0.88rem; margin-bottom:10px; color:var(--text-sub);">🏙️ NARRACIÓN EN VIVO</h4>
      <div id="commentaryLog" style="max-height:240px; overflow-y:auto; display:flex; flex-direction:column; gap:6px;"></div>
    </div>

    <!-- VISTA RADAR 2D (CANVAS) -->
    <div id="radarViewContainer" class="glass-panel hidden" style="padding:14px 16px; text-align:center;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-size:0.8rem; font-weight:800; color:var(--accent-cyan);">📡 RADAR TÁCTICO 2D EN TIEMPO REAL</span>
        <span style="font-size:0.7rem; color:var(--text-sub);">Focos de presión y movimiento de líneas</span>
      </div>
      <canvas id="matchRadarCanvas" width="600" height="340" style="width:100%; max-width:600px; background:#0b192c; border-radius:8px; border:2px solid var(--border-color);"></canvas>
    </div>

    <!-- ── v2.0: MODAL MOMENTO DE TENSIÓN (10s TIMER) ── -->
    <div id="tensionMomentModal" class="modal-overlay hidden" style="z-index:2000;">
      <div class="modal-card glass-panel" style="max-width:540px; border:2px solid var(--accent-gold); text-align:center;">
        <div style="font-size:0.75rem; font-weight:900; color:var(--accent-gold); letter-spacing:1px; margin-bottom:6px;">
          ⏱️ MÁXIMA TENSIÓN — DECISIÓN DEL DT
        </div>
        <h3 id="tensionTitle" style="color:#fff; font-size:1.2rem; margin-bottom:8px;">Momentos Decisivos</h3>
        <p id="tensionDesc" class="text-sub" style="font-size:0.85rem; margin-bottom:14px;"></p>

        <!-- Barra de 10 segundos -->
        <div style="height:6px; background:#1e293b; border-radius:3px; margin-bottom:16px; overflow:hidden;">
          <div id="tensionTimerBar" style="height:100%; width:100%; background:var(--accent-gold); transition:width 0.1s linear;"></div>
        </div>

        <div id="tensionOptionsContainer" style="display:flex; flex-direction:column; gap:10px;"></div>
      </div>
    </div>

    <div id="matchCinematicModal" class="cinematic-overlay hidden">
      <canvas id="cinematicCanvas"></canvas>
      <div id="cinematicCard" class="cinematic-card">
        <h2 id="cinematicTitle" class="cinematic-title">\u00a1PARTIDO FINALIZADO!</h2>
        <p id="cinematicSubtitle" class="cinematic-subtitle">Rendimiento deportivo en la jornada</p>
        <div id="cinematicScore" class="cinematic-score">0 - 0</div>
        <div id="cinematicStats" style="font-size:0.82rem; color:var(--text-sub); margin:10px 0;"></div>
        <div id="cinematicTacticalSummary" style="margin-top:8px; border-top:1px dashed rgba(255,255,255,0.12); padding-top:10px; text-align:left;">
          <div style="font-size:0.68rem; font-weight:900; color:var(--accent-gold); letter-spacing:1px; margin-bottom:8px;">⚙️ GESTIÓN TÁCTICA EN MOMENTOS CLAVE</div>
          <div id="tacticalSummaryList" style="display:flex; flex-direction:column; gap:6px;"></div>
        </div>
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

  const addLog = (event: LooseMatchEvent) => {
    if (!event || !logEl) return;
    const item = document.createElement('div');
    const isGoal = event.type === 'goal_home' || event.type === 'goal_away';
    const isCard = event.type === 'yellow_card' || event.type === 'red_card';
    item.style.cssText = `font-size:0.82rem; padding:7px 10px; border-radius:6px; background:${isGoal ? 'rgba(0,200,133,0.15)' : isCard ? 'rgba(245,158,11,0.1)' : '#0f172a'}; border-left:3px solid ${isGoal ? 'var(--accent-green)' : isCard ? '#f59e0b' : 'var(--border-color)'};`;
    item.innerHTML = `<strong style="color:var(--text-sub);">${event.minute}'</strong> ${event.text}`;
    logEl.prepend(item);
  };

  const showGoalFlash = (scorerName: string, teamName: string) => {
    const el = document.getElementById('goalFlash');
    const txt = document.getElementById('goalFlashText');
    if (!el || !txt) return;
    txt.innerHTML = `&#x26BD; GOOOOOL<br><span style="font-size:1.5rem; color:#fff;">${scorerName}</span><br><span style="font-size:1rem; color:var(--text-sub);">${teamName}</span>`;
    el.classList.remove('hidden');
    el.style.display = 'flex';
    setTimeout(() => { el.classList.add('hidden'); el.style.display = 'none'; }, 1800);
  };

  const updateStats = () => {
    if (hScoreEl) hScoreEl.innerText = String(engine.homeScore);
    if (aScoreEl) aScoreEl.innerText = String(engine.awayScore);
    if (timeEl) timeEl.innerText = `${engine.minute}'`;
    if (possBarEl) possBarEl.style.width = `${engine.homePossession}%`;
    if (homePossEl) homePossEl.innerText = `${engine.homePossession}%`;
    if (awayPossEl) awayPossEl.innerText = `${100 - engine.homePossession}%`;
    if (homeShotsEl) homeShotsEl.innerHTML = `${engine.homeShots} <span class="text-sub" style="font-size:0.7rem;">(${homeShotsOnTarget} a portería)</span>`;
    if (awayShotsEl) awayShotsEl.innerHTML = `${engine.awayShots} <span class="text-sub" style="font-size:0.7rem;">(${awayShotsOnTarget} a portería)</span>`;
    if (homeXGEl) homeXGEl.innerText = engine.homeXG.toFixed(2);
    if (awayXGEl) awayXGEl.innerText = engine.awayXG.toFixed(2);
  };

  document.querySelectorAll<HTMLElement>('.speed-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const speed = parseInt(target.dataset.speed!);
      document.querySelectorAll<HTMLElement>('.speed-btn').forEach(b => { b.style.background = '#0f172a'; b.style.color = '#fff'; b.style.borderColor = 'var(--border-color)'; });
      target.style.background = 'rgba(0,150,199,0.25)';
      target.style.color = 'var(--accent-cyan)';
      target.style.borderColor = 'var(--accent-cyan)';
      if (speed === 0) {
        // AUTO: simulación síncrona de todo el partido sin modales de tensión.
        if (simTimer) clearInterval(simTimer);
        simSpeed = 0;
        // Si AUTO se pulsa con un modal de tensión abierto, resolverlo por contexto
        // para que el partido termine sin un modal flotando sobre el overlay.
        cancelOpenTensionModal();
        while (!engine.isFinished) { const ev = engine.tickMinute(); if (ev) processEvent(ev); }
        updateStats();
        finishMatchSession();
        return;
      }
      simSpeed = speed;
      // Al cambiar de velocidad con el modal de tensión abierto (1x→2x/4x), resolverlo
      // por contexto en lugar de dejar el modal flotando mientras la simulación avanza.
      cancelOpenTensionModal();
      if (simTimer) clearInterval(simTimer);
      simTimer = window.setInterval(tick, simSpeed);
    });
  });

  // ── CONTROLES VISTA BITÁCORA vs RADAR 2D ──────────────────────────
  const btnLog = document.getElementById('tabLogView');
  const btnRadar = document.getElementById('tabRadarView');
  const logContainer = document.getElementById('logViewContainer');
  const radarContainer = document.getElementById('radarViewContainer');
  const radarCanvas = document.getElementById('matchRadarCanvas') as HTMLCanvasElement | null;

  btnLog?.addEventListener('click', () => {
    btnLog.classList.add('active');
    btnRadar?.classList.remove('active');
    logContainer?.classList.remove('hidden');
    radarContainer?.classList.add('hidden');
  });

  btnRadar?.addEventListener('click', () => {
    btnRadar.classList.add('active');
    btnLog?.classList.remove('active');
    radarContainer?.classList.remove('hidden');
    logContainer?.classList.add('hidden');
    drawMatchRadarCanvas(radarCanvas, engine);
  });

  // Renderizador Radar 2D en Canvas puro
  function drawMatchRadarCanvas(canvas: HTMLCanvasElement | null, eng: MatchEngine): void {
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width, h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Cancha verde estilo césped
    ctx.fillStyle = '#0f291e';
    ctx.fillRect(0, 0, w, h);

    // Líneas de cancha
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Línea central y círculo central
    ctx.beginPath();
    ctx.moveTo(w / 2, 10); ctx.lineTo(w / 2, h - 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 45, 0, Math.PI * 2);
    ctx.stroke();

    // Áreas
    ctx.strokeRect(10, h / 2 - 60, 60, 120);
    ctx.strokeRect(w - 70, h / 2 - 60, 60, 120);

    // Posición dinámica del balón basada en posesión y minuto
    const homePossRatio = eng.homePossession / 100;
    const ballX = 40 + homePossRatio * (w - 80) + Math.sin(eng.minute * 0.5) * 40;
    const ballY = h / 2 + Math.cos(eng.minute * 0.7) * 80;

    // Focos de presión / calor del equipo local (cyan) y visitante (red)
    const homeX = 30 + homePossRatio * (w / 2);
    const awayX = w - (30 + (1 - homePossRatio) * (w / 2));

    // Elipse Local
    ctx.fillStyle = 'rgba(0, 200, 133, 0.25)';
    ctx.beginPath();
    ctx.ellipse(homeX, h / 2, 70, 90, 0, 0, Math.PI * 2);
    ctx.fill();

    // Elipse Visitante
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.beginPath();
    ctx.ellipse(awayX, h / 2, 70, 90, 0, 0, Math.PI * 2);
    ctx.fill();

    // Balón (amarillo destellante)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  }

  const addTimelineIcon = (ev: LooseMatchEvent) => {
    const eventsEl = document.getElementById('matchTimelineEvents');
    if (!eventsEl) return;
    const pct = Math.min(100, (ev.minute / 90) * 100);
    let icon = '';
    if (ev.type === 'goal_home' || ev.type === 'goal_away') icon = '⚽';
    else if (ev.type === 'yellow_card') icon = '🟨';
    else if (ev.type === 'red_card') icon = '🟥';
    else if (ev.type === 'tension_moment') icon = '⏱️';

    if (icon) {
      const mark = document.createElement('div');
      mark.style.cssText = `position:absolute; left:${pct}%; top:-2px; transform:translateX(-50%); font-size:0.65rem; z-index:2;`;
      mark.innerText = icon;
      eventsEl.appendChild(mark);
    }
  };

  // ── MANEJO DEL MODAL DE MOMENTO DE TENSIÓN ──────────────────────────
  let tensionCountdownInterval: number | null = null;

  /**
   * Aplica una orden táctica al motor y refleja la orden activa en el badge.
   * Compartida por el modal interactivo y por el modo AUTO (que la aplica por defecto).
   */
  const applyTacticalOrder = (optionId: TacticalOrder, source: 'manual' | 'automatic' = 'manual') => {
    engine.applyTacticalDecision(optionId);
    const badge = document.getElementById('activeTacticalOrderBadge');
    if (badge) {
      badge.innerText = `ORDEN ACTIVA: ${TACTICAL_ORDER_LABELS[optionId] || optionId}`;
    }
    // Registrar para el resumen táctico del final del partido (marcador del momento).
    tensionDecisions.push({
      minute: engine.minute,
      homeScore: engine.homeScore,
      awayScore: engine.awayScore,
      order: optionId,
      source
    });
  };

  /** El equipo del usuario actúa como local (el motor usa userTeam como homeTeam) */
  const isUserHomeTeam = (): boolean => db.gameState?.userTeamId === engine.homeTeam.id;

  /**
   * Orden táctica que AUTO aplica por defecto según el contexto del marcador en el
   * momento de la tensión: ganando → BLOQUE BAJO (asegura el resultado), perdiendo →
   * PRESIÓN ALTA (busca el empate), empatado → CONTRAATAQUE (equilibrio ofensivo).
   */
  const getAutoTacticalDefault = (): TacticalOrder => {
    const userGoals = isUserHomeTeam() ? engine.homeScore : engine.awayScore;
    const rivalGoals = isUserHomeTeam() ? engine.awayScore : engine.homeScore;
    if (userGoals > rivalGoals) return 'LOW_BLOCK';
    if (userGoals < rivalGoals) return 'PRESSING';
    return 'COUNTER';
  };

  /**
   * Decisión automática del modo AUTO: aplica la orden según el contexto del marcador
   * (getAutoTacticalDefault) y la registra en la bitácora para el minuto dado. Compartida
   * por el botón AUTO (momento pendiente cancelado) y por processEvent (momentos durante la simulación).
   */
  const applyAutoDefaultDecision = (minute: number) => {
    const decision = getAutoTacticalDefault();
    applyTacticalOrder(decision, 'automatic');
    addLog({ minute, type: 'commentary', text: `🤖 DECISIÓN AUTOMÁTICA: ${TACTICAL_ORDER_LABELS[decision]} aplicado ante el momento clave del minuto ${minute}'.` });
  };

  /**
   * Cierra el modal de tensión si está abierto, cancela su countdown y aplica la
   * decisión por contexto al momento pendiente. Usado al cambiar de velocidad
   * (1x/2x/4x) y con AUTO, para que la simulación nunca avance con un modal flotando.
   */
  const cancelOpenTensionModal = () => {
    if (tensionCountdownInterval) { clearInterval(tensionCountdownInterval); tensionCountdownInterval = null; }
    const modal = document.getElementById('tensionMomentModal');
    if (modal) modal.classList.add('hidden');
    if (engine.pendingTensionMoment) {
      applyAutoDefaultDecision(engine.pendingTensionMoment.minute);
    }
  };

  const triggerTensionUI = (tensionEvent: MatchEvent) => {
    // FIX: limpiar cualquier countdown previo. Con AUTO el motor lanza 2 momentos de
    // tensión en el mismo tick síncrono; sin esto el 2º triggerTensionUI sobrescribía
    // tensionCountdownInterval y el 1º countdown quedaba huérfano, disparándose cada
    // 100ms para siempre y corrompiendo el save (finishMatchSession en bucle).
    if (tensionCountdownInterval) {
      clearInterval(tensionCountdownInterval);
      tensionCountdownInterval = null;
    }
    if (simTimer) clearInterval(simTimer);

    const modal = document.getElementById('tensionMomentModal');
    const titleEl = document.getElementById('tensionTitle');
    const descEl = document.getElementById('tensionDesc');
    const optionsContainer = document.getElementById('tensionOptionsContainer');
    const timerBar = document.getElementById('tensionTimerBar');

    titleEl!.innerText = tensionEvent.title || '';
    descEl!.innerText = tensionEvent.description || '';
    optionsContainer!.innerHTML = '';

    modal!.classList.remove('hidden');

    let secondsLeft = 10;
    timerBar!.style.width = '100%';

    // FIX: resolver cada momento de tensión una sola vez. Si el countdown expira al
    // mismo instante que el clic del usuario, el 2º resolveChoice ya no aplica nada
    // (evita decisiones duplicadas en el resumen táctico y refuerza el fix anti-corrupción).
    let tensionResolved = false;

    const resolveChoice = (optionId: TacticalOrder, source: 'manual' | 'automatic' = 'manual') => {
      if (tensionResolved) return;
      tensionResolved = true;
      if (tensionCountdownInterval) {
        clearInterval(tensionCountdownInterval);
        tensionCountdownInterval = null;
      }
      applyTacticalOrder(optionId, source);
      modal!.classList.add('hidden');

      // FIX: limpiar SIEMPRE el timer previo antes de recrearlo. Sin esto, un segundo
      // resolveChoice (countdown expirado + clic del usuario) creaba setInterval(tick)
      // duplicados y el huérfano disparaba finishMatchSession() en bucle.
      if (simTimer) clearInterval(simTimer);
      // FIX: solo reanudar la simulación si el partido no terminó.
      if (simSpeed > 0 && !engine.isFinished) {
        simTimer = window.setInterval(tick, simSpeed);
      } else {
        simTimer = null;
      }
    };

    (tensionEvent.options || []).forEach((opt: TensionOption) => {
      const btn = document.createElement('button');
      btn.className = 'btn-secondary';
      btn.style.cssText = 'text-align:left; padding:12px 16px; border-color:var(--accent-cyan); display:flex; flex-direction:column; gap:4px; font-size:0.85rem;';
      btn.innerHTML = `<strong>${opt.label}</strong><span class="text-sub" style="font-size:0.75rem;">${opt.desc}</span>`;
      btn.addEventListener('click', () => resolveChoice(opt.id));
      optionsContainer!.appendChild(btn);
    });

    // FIX: el countdown se limpia a sí mismo con su propio id (no con la variable
    // global, que puede haber sido sobrescrita por un 2º momento de tensión en AUTO).
    const countdownId = window.setInterval(() => {
      secondsLeft -= 0.1;
      const pct = Math.max(0, (secondsLeft / 10) * 100);
      timerBar!.style.width = `${pct}%`;

      if (secondsLeft <= 0) {
        clearInterval(countdownId);
        if (tensionCountdownInterval === countdownId) tensionCountdownInterval = null;
        // Misma decisión por contexto que AUTO: ganando → BLOQUE BAJO, perdiendo →
        // PRESIÓN ALTA, empatado → CONTRAATAQUE.
        resolveChoice(getAutoTacticalDefault(), 'automatic');
      }
    }, 100);
    tensionCountdownInterval = countdownId;
  };

  const processEvent = (ev: LooseMatchEvent | null) => {
    if (!ev) return;

    // Actualizar barra de tiempo de línea de tiempo
    const progressEl = document.getElementById('matchTimelineProgress');
    if (progressEl) progressEl.style.width = `${Math.min(100, (ev.minute / 90) * 100)}%`;

    addTimelineIcon(ev);

    if (ev.type === 'tension_moment') {
      // AUTO: aplicar la decisión táctica por defecto directamente, sin abrir el modal,
      // para que el partido termine sin un modal flotando sobre el overlay cinematográfico.
      if (simSpeed === 0) {
        applyAutoDefaultDecision(ev.minute);
      } else {
        triggerTensionUI(ev as MatchEvent);
      }
      return;
    }

    if (ev.type === 'goal_home') {
      sfx.playGoal && sfx.playGoal();
      homeShotsOnTarget++;
      showGoalFlash(ev.scorerName || '', userTeam.name);
      if (homeGoalsList) homeGoalsList.innerHTML += `<span>⚽ ${ev.minute}' ${ev.scorerName || ''} </span>`;
    } else if (ev.type === 'goal_away') {
      sfx.playGoal && sfx.playGoal();
      awayShotsOnTarget++;
      showGoalFlash(ev.scorerName || '', rival.name);
      if (awayGoalsList) awayGoalsList.innerHTML += `<span>⚽ ${ev.minute}' ${ev.scorerName || ''} </span>`;
    } else if (ev.type === 'shot_on_target_home') { homeShotsOnTarget++; }
    else if (ev.type === 'shot_on_target_away') { awayShotsOnTarget++; }

    if (Math.random() < 0.28) {
      const fn = commentaryPool[Math.floor(Math.random() * commentaryPool.length)]!;
      addLog({ minute: ev.minute, type: 'commentary', text: fn(ev.minute, Math.random() < 0.5 ? userTeam.name : rival.name) });
    }
    addLog(ev);

    // Redibujar radar si está visible
    if (radarContainer && !radarContainer.classList.contains('hidden')) {
      drawMatchRadarCanvas(radarCanvas, engine);
    }
  };

  const tick = () => {
    const ev = engine.tickMinute();
    processEvent(ev);
    updateStats();
    if (engine.isFinished) { if (simTimer) clearInterval(simTimer); finishMatchSession(); }
  };

  simTimer = window.setInterval(tick, simSpeed);

  const finishMatchSession = () => {
    // FIX: la sesión solo se procesa una vez por partido (ver matchSessionCompleted).
    if (matchSessionCompleted) return;
    matchSessionCompleted = true;
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
      userStanding.played = Math.min(gameState.maxWeeks || 38, userStanding.played + 1);
      rivalStanding.played = Math.min(gameState.maxWeeks || 38, rivalStanding.played + 1);
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
    if (gameState.week < gameState.maxWeeks) {
      gameState.week++;
    }
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

  const showMatchCinematicOverlay = (userGoals: number, rivalGoals: number, wasPenalties: boolean) => {
    const modalEl = document.getElementById('matchCinematicModal');
    const cardEl = document.getElementById('cinematicCard');
    const titleEl = document.getElementById('cinematicTitle');
    const subEl = document.getElementById('cinematicSubtitle');
    const scoreEl = document.getElementById('cinematicScore');
    const statsEl = document.getElementById('cinematicStats');
    const canvasEl = document.getElementById('cinematicCanvas') as HTMLCanvasElement | null;
    const btnFinish = document.getElementById('btnFinishMatch');
    if (!modalEl) return;
    scoreEl!.innerText = wasPenalties ? `Penales: ${userGoals} - ${rivalGoals}` : `${userGoals} - ${rivalGoals}`;
    const userRank = (gameState.standings || []).findIndex(s => s.teamId === userTeam.id) + 1;
    const userPts = (gameState.standings || []).find(s => s.teamId === userTeam.id)?.points || 0;
    statsEl!.innerHTML = `Posici\u00f3n: <strong>#${userRank}</strong> &middot; <strong>${userPts} pts</strong> &middot; Jornada ${gameState.week - 1}/${gameState.maxWeeks}`;

    // ── Resumen táctico: decisiones tomadas en cada momento de tensión ──
    const summaryList = document.getElementById('tacticalSummaryList');
    if (summaryList) {
      if (tensionDecisions.length === 0) {
        summaryList.innerHTML = `<div style="font-size:0.72rem; color:var(--text-sub); text-align:center;">No hubo momentos de tensión en este partido.</div>`;
      } else {
        const userIsHome = isUserHomeTeam();
        summaryList.innerHTML = tensionDecisions.map(d => {
          const userGoals = userIsHome ? d.homeScore : d.awayScore;
          const rivalGoals = userIsHome ? d.awayScore : d.homeScore;
          const ctx = userGoals > rivalGoals ? 'GANANDO' : (userGoals < rivalGoals ? 'PERDIENDO' : 'EMPATE');
          const ctxColor = userGoals > rivalGoals ? 'var(--accent-green)' : (userGoals < rivalGoals ? 'var(--accent-red)' : 'var(--accent-gold)');
          const sourceLabel = d.source === 'manual' ? 'DECISIÓN DT' : 'AUTOMÁTICA';
          const sourceColor = d.source === 'manual' ? 'var(--accent-cyan)' : 'var(--text-sub)';
          return `<div style="display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:6px; background:#0f172a; border-left:3px solid ${ctxColor};">
            <span style="font-size:0.72rem; color:var(--text-sub); font-weight:800; min-width:44px;">⏱️ ${d.minute}'</span>
            <span style="display:flex; align-items:baseline; gap:5px; min-width:86px;"><span style="font-size:0.72rem; font-weight:900; color:#fff;">${userGoals} - ${rivalGoals}</span><span style="font-size:0.56rem; font-weight:900; color:${ctxColor}; letter-spacing:0.5px;">${ctx}</span></span>
            <span style="font-size:0.72rem; font-weight:900; color:var(--accent-gold); flex:1;">${TACTICAL_ORDER_LABELS[d.order] || d.order}</span>
            <span style="font-size:0.6rem; font-weight:900; letter-spacing:0.5px; color:${sourceColor}; min-width:80px; text-align:right;">${sourceLabel}</span>
          </div>`;
        }).join('');
      }
    }

    let outcomeClass = 'draw';
    if (userGoals > rivalGoals) {
      outcomeClass = 'win';
      titleEl!.innerText = wasPenalties ? '\u{1F3C6} \u00a1CAMPEONES EN PENALES!' : '\u{1F3C6} \u00a1VICTORIA TRIUNFAL!';
      subEl!.innerText = `\u00a1Espectacular rendimiento de ${userTeam.name}!`;
      sfx.playGoal && sfx.playGoal();
    } else if (userGoals < rivalGoals) {
      outcomeClass = 'loss';
      titleEl!.innerText = '\u{1F494} DERROTA DOLOROSA';
      subEl!.innerText = `Ca\u00edda ante ${rival.name}. El equipo debe reponerse.`;
    } else {
      titleEl!.innerText = '\u2696\uFE0F EMPATE LUCHADO';
      subEl!.innerText = `Reparto de puntos en una intensa batalla.`;
    }
    cardEl!.className = `cinematic-card ${outcomeClass}`;
    modalEl.classList.remove('hidden');
    setTimeout(() => launchOutcomeParticles(canvasEl, outcomeClass), 100);
    btnFinish!.addEventListener('click', () => { sfx.playClick && sfx.playClick(); navigateTo('dashboard'); });
  };
}
