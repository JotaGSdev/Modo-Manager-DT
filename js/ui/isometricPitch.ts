/**
 * ============================================================================
 * ENTRENADOR LEYENDA - MOTOR DE SIMULACIÓN Y CANCHA 2D ISOMÉTRICA (isometricPitch.ts)
 * ============================================================================
 * Renderizado de campo de fútbol isométrico con futbolistas estilo chibi/miniatura.
 * - Proyección isométrica suave a 60fps con sombras y perspectiva de profundidad.
 * - 22 futbolistas miniatura (11 vs 11) con kits de club, números y animaciones.
 * - Balón con física de altura (Z), pases, centros, disparos y atajadas del arquero.
 * - Sincronizado para que 90 minutos de partido duren 90 segundos reales (1s = 1min).
 */

import type { Team, FormationId, MatchEvent } from '../types.js';
import { FORMATIONS } from '../engine/tactics.js';
import { sfx } from '../../assets/audio/sfx.js';

interface ChibiPlayer {
  id: string;
  name: string;
  team: 'home' | 'away';
  isGK: boolean;
  number: number;
  pos: string;
  x: number;       // Posición táctica en cancha (0 - 100)
  y: number;       // Posición lateral en cancha (0 - 65)
  tx: number;      // Destino interpolado X
  ty: number;      // Destino interpolado Y
  vx: number;
  vy: number;
  baseX: number;   // Posición base de formación
  baseY: number;
  facing: number;  // 1 = derecha, -1 = izquierda
  animStep: number;
  isKicking: boolean;
  isDiving: boolean;
  isCelebrating: boolean;
  skinColor: string;
  hairColor: string;
}

interface Ball {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
  holder: ChibiPlayer | null;
  isInGoal: boolean;
}

export class IsometricPitch {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId: number | null = null;
  private homeTeam: Team;
  private awayTeam: Team;
  private players: ChibiPlayer[] = [];
  private ball: Ball;
  private lastTime = 0;
  private goalBannerTimer = 0;
  private goalScorerName = '';
  private goalTeamName = '';

  // Dimensiones del campo en proyección isométrica
  private originX = 450;
  private originY = 85;
  private scaleX = 4.3;
  private scaleY = 4.3;
  private isoAngle = 0.44; // radianes (~25 grados)

  constructor(
    canvas: HTMLCanvasElement,
    homeTeam: Team,
    awayTeam: Team,
    homeFormation: FormationId = '4-3-3',
    awayFormation: FormationId = '4-3-3'
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;

    this.ball = {
      x: 50,
      y: 32.5,
      z: 0,
      tx: 50,
      ty: 32.5,
      tz: 0,
      holder: null,
      isInGoal: false
    };

    this.initPlayers(homeFormation, awayFormation);
    this.setupResolution();
    this.startLoop();
  }

  private setupResolution(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = 900 * dpr;
    this.canvas.height = 520 * dpr;
    this.ctx.scale(dpr, dpr);
    this.originX = 450;
    this.originY = 95;
  }

  /**
   * Proyección isométrica: convierte coordenadas de cancha (x: 0-100, y: 0-65, z: altura)
   * a coordenadas de píxeles en pantalla (px, py).
   */
  private toScreen(x: number, y: number, z = 0): { px: number; py: number } {
    const cosA = Math.cos(this.isoAngle);
    const sinA = Math.sin(this.isoAngle);

    const nx = (x - 50) * this.scaleX;
    const ny = (y - 32.5) * this.scaleY;

    const px = this.originX + (nx - ny) * cosA;
    const py = this.originY + (nx + ny) * sinA * 0.58 - z;

    return { px, py };
  }

  /**
   * Inicializa las 22 miniaturas en sus posiciones tácticas de formación
   */
  private initPlayers(homeFormationId: FormationId, awayFormationId: FormationId): void {
    const homeForm = FORMATIONS[homeFormationId] || FORMATIONS['4-3-3'];
    const awayForm = FORMATIONS[awayFormationId] || FORMATIONS['4-3-3'];

    const skins = ['#f8d5b8', '#e0ac69', '#c68642', '#8d5524', '#f1c27d'];
    const hairs = ['#1a1a1a', '#4a2c11', '#8b5a2b', '#2e1d0f', '#000000'];

    this.players = [];

    // 11 Jugadores Locales (Atacan hacia la derecha: X: 0 -> 100)
    homeForm.positions.forEach((posSlot, idx) => {
      // Normalizar X de formación (en tactics va de 10 a 90) hacia la mitad local (5 a 48)
      const isGK = posSlot.role === 'POR';
      const slotX = isGK ? 6 : Math.round(12 + (posSlot.y / 100) * 36);
      const slotY = Math.round(5 + (posSlot.x / 100) * 55);

      this.players.push({
        id: `home_${idx}`,
        name: isGK ? 'Arquero' : `Titular ${idx + 1}`,
        team: 'home',
        isGK,
        number: idx + 1,
        pos: posSlot.role,
        x: slotX,
        y: slotY,
        tx: slotX,
        ty: slotY,
        vx: 0,
        vy: 0,
        baseX: slotX,
        baseY: slotY,
        facing: 1,
        animStep: Math.random() * 10,
        isKicking: false,
        isDiving: false,
        isCelebrating: false,
        skinColor: skins[idx % skins.length]!,
        hairColor: hairs[idx % hairs.length]!
      });
    });

    // 11 Jugadores Visitantes (Atacan hacia la izquierda: X: 100 -> 0)
    awayForm.positions.forEach((posSlot, idx) => {
      const isGK = posSlot.role === 'POR';
      const slotX = isGK ? 94 : Math.round(88 - (posSlot.y / 100) * 36);
      const slotY = Math.round(5 + (posSlot.x / 100) * 55);

      this.players.push({
        id: `away_${idx}`,
        name: isGK ? 'Arquero Riv' : `Rival ${idx + 1}`,
        team: 'away',
        isGK,
        number: idx + 1,
        pos: posSlot.role,
        x: slotX,
        y: slotY,
        tx: slotX,
        ty: slotY,
        vx: 0,
        vy: 0,
        baseX: slotX,
        baseY: slotY,
        facing: -1,
        animStep: Math.random() * 10,
        isKicking: false,
        isDiving: false,
        isCelebrating: false,
        skinColor: skins[(idx + 2) % skins.length]!,
        hairColor: hairs[(idx + 1) % hairs.length]!
      });
    });
  }

  /**
   * Se ejecuta cada minuto de partido. Mueve el balón y las líneas según el desarrollo del juego.
   */
  public onMinuteTick(
    _minute: number,
    event: MatchEvent | null,
    homePossession: number,
    _homeScore: number,
    _awayScore: number
  ): void {
    const isHomeAttack = Math.random() * 100 < homePossession;
    const attackingTeam = isHomeAttack ? 'home' : 'away';

    // Desplazamiento dinámico de las líneas tácticas según quién tiene la pelota
    this.players.forEach(p => {
      p.isCelebrating = false;
      p.isKicking = false;
      p.isDiving = false;

      const teamAdvantage = p.team === attackingTeam ? 10 : -8;
      const targetDeltaX = p.team === 'home' ? teamAdvantage : -teamAdvantage;
      const wanderY = (Math.random() - 0.5) * 8;

      if (!p.isGK) {
        p.tx = Math.max(8, Math.min(92, p.baseX + targetDeltaX + (Math.random() - 0.5) * 6));
        p.ty = Math.max(5, Math.min(60, p.baseY + wanderY));
      }
    });

    // Eventos especiales (Gol, Tiro, Ocasión)
    if (event) {
      if (event.type === 'goal_home') {
        this.triggerGoalSequence('home', event.scorerName || this.homeTeam.name);
      } else if (event.type === 'goal_away') {
        this.triggerGoalSequence('away', event.scorerName || this.awayTeam.name);
      } else if (event.type === 'shot_home' || event.type === 'shot_away') {
        this.triggerShotSequence(event.type === 'shot_home' ? 'home' : 'away', false);
      } else if (event.type === 'halftime') {
        // En el entretiempo los jugadores vuelven al centro del campo
        this.players.forEach(p => {
          p.tx = p.baseX;
          p.ty = p.baseY;
        });
        this.ball.tx = 50;
        this.ball.ty = 32.5;
        this.ball.tz = 0;
      }
    } else {
      // Minuto de juego ordinario: pase/avance entre compañeros
      const candidates = this.players.filter(p => p.team === attackingTeam && !p.isGK);
      if (candidates.length > 0) {
        const carrier = candidates[Math.floor(Math.random() * candidates.length)]!;
        carrier.isKicking = true;
        this.ball.holder = carrier;
        this.ball.tx = carrier.x + (carrier.team === 'home' ? 4 : -4);
        this.ball.ty = carrier.y + (Math.random() - 0.5) * 4;
        this.ball.tz = Math.random() > 0.6 ? 8 : 0; // Pase elevado ocasional
      }
    }
  }

  /**
   * Secuencia animada de gol: tiro potente, arquero intenta volar, balón en la red y festejos
   */
  private triggerGoalSequence(team: 'home' | 'away', scorerName: string): void {
    const isHome = team === 'home';
    const targetGoalX = isHome ? 98 : 2;
    const targetGoalY = 32.5 + (Math.random() - 0.5) * 8;

    // Buscar al delantero más cercano para el remate
    const attackers = this.players.filter(p => p.team === team && !p.isGK);
    const shooter = attackers[Math.floor(Math.random() * attackers.length)] || attackers[0];

    if (shooter) {
      shooter.tx = isHome ? 84 : 16;
      shooter.ty = 32.5 + (Math.random() - 0.5) * 10;
      shooter.isKicking = true;
    }

    // El arquero rival vuela tarde
    const rivalGK = this.players.find(p => p.team !== team && p.isGK);
    if (rivalGK) {
      rivalGK.isDiving = true;
      rivalGK.ty = targetGoalY + (Math.random() > 0.5 ? 4 : -4);
    }

    // Balón vuela al fondo de la red
    this.ball.tx = targetGoalX;
    this.ball.ty = targetGoalY;
    this.ball.tz = 6;
    this.ball.isInGoal = true;

    // Celebración de gol en el equipo anotador
    this.players.filter(p => p.team === team).forEach(p => {
      p.isCelebrating = true;
    });

    this.goalBannerTimer = 180; // ~3 segundos en pantalla
    this.goalScorerName = scorerName;
    this.goalTeamName = isHome ? this.homeTeam.name : this.awayTeam.name;

    sfx.playGoal();
  }

  /**
   * Secuencia animada de disparo y atajada del arquero
   */
  private triggerShotSequence(team: 'home' | 'away', _onTarget: boolean): void {
    const isHome = team === 'home';
    const targetX = isHome ? 95 : 5;
    const targetY = 32.5 + (Math.random() - 0.5) * 14;

    const shooter = this.players.find(p => p.team === team && !p.isGK);
    if (shooter) {
      shooter.isKicking = true;
      shooter.tx = isHome ? 78 : 22;
    }

    const rivalGK = this.players.find(p => p.team !== team && p.isGK);
    if (rivalGK) {
      rivalGK.isDiving = true;
      rivalGK.tx = isHome ? 96 : 4;
      rivalGK.ty = targetY;
    }

    this.ball.tx = targetX;
    this.ball.ty = targetY;
    this.ball.tz = 5;
  }

  /**
   * Bucle principal de animación a 60 FPS
   */
  private startLoop(): void {
    const loop = (timestamp: number) => {
      const dt = this.lastTime ? Math.min(0.1, (timestamp - this.lastTime) / 1000) : 0.016;
      this.lastTime = timestamp;

      this.update(dt);
      this.draw();

      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  /**
   * Actualiza posiciones interpoladas de jugadores y pelota
   */
  private update(dt: number): void {
    const moveSpeed = 4.5;

    this.players.forEach(p => {
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.2) {
        p.x += (dx / dist) * Math.min(dist, moveSpeed * dt * 10);
        p.y += (dy / dist) * Math.min(dist, moveSpeed * dt * 10);
        p.facing = dx >= 0 ? 1 : -1;
        p.animStep += dt * 12;
      } else {
        p.animStep += dt * 3;
      }
    });

    // Interpolación del balón
    const bdx = this.ball.tx - this.ball.x;
    const bdy = this.ball.ty - this.ball.y;
    const bdz = this.ball.tz - this.ball.z;
    this.ball.x += bdx * 0.12;
    this.ball.y += bdy * 0.12;
    this.ball.z += bdz * 0.14;

    if (this.goalBannerTimer > 0) {
      this.goalBannerTimer--;
    }
  }

  /**
   * Renderizado completo de la escena isométrica
   */
  private draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 900, 520);

    this.drawPitchTurf(ctx);
    this.drawPitchMarkings(ctx);
    this.drawGoalpost(ctx, 'home');
    this.drawGoalpost(ctx, 'away');

    // Orden de dibujo por profundidad isométrica (Y de pantalla)
    const renderQueue: Array<{ type: 'player' | 'ball'; y: number; item: ChibiPlayer | Ball }> = [];

    this.players.forEach(p => {
      const pt = this.toScreen(p.x, p.y);
      renderQueue.push({ type: 'player', y: pt.py, item: p });
    });

    const ballPt = this.toScreen(this.ball.x, this.ball.y);
    renderQueue.push({ type: 'ball', y: ballPt.py, item: this.ball });

    renderQueue.sort((a, b) => a.y - b.y);

    renderQueue.forEach(obj => {
      if (obj.type === 'player') {
        this.drawChibiPlayer(ctx, obj.item as ChibiPlayer);
      } else {
        this.drawBall(ctx, obj.item as Ball);
      }
    });

    // Cartel festivo si hay gol en curso
    if (this.goalBannerTimer > 0) {
      this.drawGoalBanner(ctx);
    }
  }

  /**
   * Césped isométrico con franjas alternadas
   */
  private drawPitchTurf(ctx: CanvasRenderingContext2D): void {
    const c1 = this.toScreen(0, 0);
    const c2 = this.toScreen(100, 0);
    const c3 = this.toScreen(100, 65);
    const c4 = this.toScreen(0, 65);

    // Sombra del estadio
    ctx.beginPath();
    ctx.moveTo(c1.px, c1.py + 10);
    ctx.lineTo(c2.px, c2.py + 10);
    ctx.lineTo(c3.px, c3.py + 10);
    ctx.lineTo(c4.px, c4.py + 10);
    ctx.closePath();
    ctx.fillStyle = '#07120b';
    ctx.fill();

    // Fondo base del césped
    ctx.beginPath();
    ctx.moveTo(c1.px, c1.py);
    ctx.lineTo(c2.px, c2.py);
    ctx.lineTo(c3.px, c3.py);
    ctx.lineTo(c4.px, c4.py);
    ctx.closePath();
    ctx.fillStyle = '#23733f';
    ctx.fill();

    // Franjas alternadas de corte de césped
    const stripes = 10;
    const stripeWidth = 100 / stripes;
    for (let i = 0; i < stripes; i++) {
      if (i % 2 === 0) continue;
      const xStart = i * stripeWidth;
      const xEnd = (i + 1) * stripeWidth;

      const p1 = this.toScreen(xStart, 0);
      const p2 = this.toScreen(xEnd, 0);
      const p3 = this.toScreen(xEnd, 65);
      const p4 = this.toScreen(xStart, 65);

      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.lineTo(p3.px, p3.py);
      ctx.lineTo(p4.px, p4.py);
      ctx.closePath();
      ctx.fillStyle = '#2a874b';
      ctx.fill();
    }
  }

  /**
   * Líneas reglamentarias del campo en perspectiva isométrica
   */
  private drawPitchMarkings(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.5;

    // Perímetro exterior
    const c1 = this.toScreen(0, 0);
    const c2 = this.toScreen(100, 0);
    const c3 = this.toScreen(100, 65);
    const c4 = this.toScreen(0, 65);

    ctx.beginPath();
    ctx.moveTo(c1.px, c1.py);
    ctx.lineTo(c2.px, c2.py);
    ctx.lineTo(c3.px, c3.py);
    ctx.lineTo(c4.px, c4.py);
    ctx.closePath();
    ctx.stroke();

    // Línea del mediocampo
    const m1 = this.toScreen(50, 0);
    const m2 = this.toScreen(50, 65);
    ctx.beginPath();
    ctx.moveTo(m1.px, m1.py);
    ctx.lineTo(m2.px, m2.py);
    ctx.stroke();

    // Círculo central isométrico
    const center = this.toScreen(50, 32.5);
    ctx.beginPath();
    ctx.ellipse(center.px, center.py, 42, 22, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Punto central
    ctx.beginPath();
    ctx.arc(center.px, center.py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Área grande local (izquierda: X=0 a 16, Y=14 a 51)
    this.drawIsoBox(ctx, 0, 14, 16, 51);
    // Área chica local
    this.drawIsoBox(ctx, 0, 23, 6, 42);

    // Área grande visitante (derecha: X=84 a 100, Y=14 a 51)
    this.drawIsoBox(ctx, 84, 14, 100, 51);
    // Área chica visitante
    this.drawIsoBox(ctx, 94, 23, 100, 42);

    ctx.restore();
  }

  private drawIsoBox(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    const p1 = this.toScreen(x1, y1);
    const p2 = this.toScreen(x2, y1);
    const p3 = this.toScreen(x2, y2);
    const p4 = this.toScreen(x1, y2);

    ctx.beginPath();
    ctx.moveTo(p1.px, p1.py);
    ctx.lineTo(p2.px, p2.py);
    ctx.lineTo(p3.px, p3.py);
    ctx.lineTo(p4.px, p4.py);
    ctx.closePath();
    ctx.stroke();
  }

  /**
   * Arcos de fútbol 3D con postes blancos y red con volumen
   */
  private drawGoalpost(ctx: CanvasRenderingContext2D, side: 'home' | 'away'): void {
    const x = side === 'home' ? 0 : 100;
    const depthX = side === 'home' ? -3 : 3;
    const yTop = 27;
    const yBottom = 38;
    const postHeight = 18;

    const pTop = this.toScreen(x, yTop);
    const pBottom = this.toScreen(x, yBottom);
    const pTopBack = this.toScreen(x + depthX, yTop);
    const pBottomBack = this.toScreen(x + depthX, yBottom);

    // Red del arco
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pTop.px, pTop.py - postHeight);
    ctx.lineTo(pTopBack.px, pTopBack.py - postHeight * 0.7);
    ctx.lineTo(pBottomBack.px, pBottomBack.py - postHeight * 0.7);
    ctx.lineTo(pBottom.px, pBottom.py - postHeight);
    ctx.lineTo(pBottom.px, pBottom.py);
    ctx.lineTo(pBottomBack.px, pBottomBack.py);
    ctx.lineTo(pTopBack.px, pTopBack.py);
    ctx.lineTo(pTop.px, pTop.py);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fill();

    // Postes blancos y travesaño frontal
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    // Poste 1
    ctx.beginPath();
    ctx.moveTo(pTop.px, pTop.py);
    ctx.lineTo(pTop.px, pTop.py - postHeight);
    ctx.stroke();

    // Poste 2
    ctx.beginPath();
    ctx.moveTo(pBottom.px, pBottom.py);
    ctx.lineTo(pBottom.px, pBottom.py - postHeight);
    ctx.stroke();

    // Travesaño
    ctx.beginPath();
    ctx.moveTo(pTop.px, pTop.py - postHeight);
    ctx.lineTo(pBottom.px, pBottom.py - postHeight);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Dibuja a cada futbolista estilo chibi / miniatura con su kit de club
   */
  private drawChibiPlayer(ctx: CanvasRenderingContext2D, p: ChibiPlayer): void {
    const pos = this.toScreen(p.x, p.y);
    const teamColors = p.team === 'home' ? (this.homeTeam.colors || ['#0088cc', '#ffffff']) : (this.awayTeam.colors || ['#cc2200', '#ffffff']);
    const kitColor = p.isGK ? '#facc15' : teamColors[0]!;
    const shortsColor = p.isGK ? '#1e293b' : (teamColors[1] || '#ffffff');

    ctx.save();

    // Sombra del jugador en el césped
    ctx.beginPath();
    ctx.ellipse(pos.px, pos.py + 2, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.fill();

    // Animación de rebote al correr o festejar
    let bob = Math.sin(p.animStep) * 2;
    if (p.isCelebrating) {
      bob = -Math.abs(Math.sin(p.animStep * 2)) * 6; // Salto de alegría
    }

    const py = pos.py + bob;

    // Piernas y botines
    const legOffset = Math.sin(p.animStep) * 3;
    ctx.fillStyle = shortsColor;
    // Pierna izquierda
    ctx.fillRect(pos.px - 4, py - 6, 3, 5);
    // Pierna derecha
    ctx.fillRect(pos.px + 1, py - 6, 3, 5);

    // Botines negros
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(pos.px - 5 + legOffset * 0.3, py - 2, 4, 2.5);
    ctx.fillRect(pos.px + 1 - legOffset * 0.3, py - 2, 4, 2.5);

    // Torso con camiseta del club
    ctx.fillStyle = kitColor;
    ctx.beginPath();
    ctx.roundRect(pos.px - 5, py - 16, 10, 11, 2);
    ctx.fill();

    // Número de camiseta
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(p.number), pos.px, py - 8);

    // Cabeza estilo Chibi (grande y redonda)
    ctx.beginPath();
    ctx.arc(pos.px, py - 21, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = p.skinColor;
    ctx.fill();

    // Cabello
    ctx.beginPath();
    ctx.arc(pos.px, py - 23, 6.5, Math.PI, Math.PI * 2);
    ctx.fillStyle = p.hairColor;
    ctx.fill();

    // Ojos orientados a la dirección que mira
    const eyeOffsetX = p.facing * 1.8;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(pos.px + eyeOffsetX - 1, py - 21, 1, 0, Math.PI * 2);
    ctx.arc(pos.px + eyeOffsetX + 2, py - 21, 1, 0, Math.PI * 2);
    ctx.fill();

    // Brazos alzados si festeja gol
    if (p.isCelebrating) {
      ctx.strokeStyle = kitColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pos.px - 5, py - 14);
      ctx.lineTo(pos.px - 8, py - 24);
      ctx.moveTo(pos.px + 5, py - 14);
      ctx.lineTo(pos.px + 8, py - 24);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Dibuja el balón de fútbol con sombra y elevación (Z)
   */
  private drawBall(ctx: CanvasRenderingContext2D, b: Ball): void {
    const shadowPos = this.toScreen(b.x, b.y, 0);
    const ballPos = this.toScreen(b.x, b.y, b.z);

    ctx.save();

    // Sombra del balón
    ctx.beginPath();
    const shadowRadius = Math.max(2, 4.5 - b.z * 0.15);
    ctx.ellipse(shadowPos.px, shadowPos.py + 1, shadowRadius, shadowRadius * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // Esfera del balón
    ctx.beginPath();
    ctx.arc(ballPos.px, ballPos.py, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Detalles de pentágono
    ctx.beginPath();
    ctx.arc(ballPos.px, ballPos.py, 1.6, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    ctx.restore();
  }

  /**
   * Cartel limpio de gol estilo broadcast televisivo (sin emojis)
   */
  private drawGoalBanner(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const bx = 450;
    const by = 260;

    // Fondo dorado broadcast
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = 'var(--accent-gold, #f59e0b)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx - 140, by - 36, 280, 72, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 1.3rem sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ANOTACIÓN DE GOL', bx, by - 10);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 0.85rem sans-serif';
    ctx.fillText(this.goalScorerName, bx, by + 10);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '0.72rem sans-serif';
    ctx.fillText(this.goalTeamName, bx, by + 26);

    ctx.restore();
  }

  public destroy(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }
}
