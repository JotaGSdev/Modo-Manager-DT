/**
 * ============================================================================
 * ENTRENADOR LEYENDA - MOTOR DE SIMULACIÓN Y CANCHA 2D ISOMÉTRICA (isometricPitch.ts)
 * ============================================================================
 * Renderizado de campo de fútbol isométrico con 22 futbolistas miniatura estilo chibi.
 * - Proyección isométrica centrada y calibrada a 60fps con sombras y profundidad.
 * - Simulación continua: futbolistas corriendo, pasándose el balón, presionando y rematando.
 * - Sincronizado para que los 90 minutos de partido duren 90 segundos reales (1s = 1min).
 * - Secuencias dinámicas en goles, remates al arco, atajadas de arqueros y festejos.
 * - Totalmente libre de emojis con rótulos y badges vectoriales profesionales.
 */

import type { Team, FormationId, MatchEvent } from '../types.js';
import { FORMATIONS } from '../engine/tactics.js';
import { sfx } from '../../assets/audio/sfx.js';

export interface ChibiPlayer {
  id: string;
  name: string;
  team: 'home' | 'away';
  isGK: boolean;
  number: number;
  pos: string;
  x: number;          // Posición táctica en cancha (X: 0 - 100)
  y: number;          // Posición lateral en cancha (Y: 0 - 65)
  tx: number;         // Destino interpolado X
  ty: number;         // Destino interpolado Y
  vx: number;
  vy: number;
  baseX: number;      // Posición base táctica según formación
  baseY: number;
  speed: number;      // Velocidad de movimiento
  facing: number;     // 1 = derecha, -1 = izquierda
  animStep: number;   // Ciclo de animación de piernas y brazos
  state: 'idle' | 'running' | 'kicking' | 'diving' | 'celebrating';
  diveTimer: number;
  kickTimer: number;
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
  vx: number;
  vy: number;
  vz: number;
  holder: ChibiPlayer | null;
  targetReceiver: ChibiPlayer | null;
  isShot: boolean;
  trail: Array<{ x: number; y: number; z: number; alpha: number }>;
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

  // Dimensiones del campo centradas en el lienzo de 900x520
  private originX = 450;
  private originY = 245;
  private scaleX = 5.8;
  private scaleY = 4.8;
  private isoAngle = 0.46; // radianes

  // Control de flujo autónomo de jugadas
  private currentAttackingTeam: 'home' | 'away' = 'home';
  private possessionCooldown = 0;
  private passCooldown = 0;
  private specialPlayQueue: Array<{
    type: 'goal' | 'shot';
    team: 'home' | 'away';
    scorerName?: string;
  }> = [];

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
      vx: 0,
      vy: 0,
      vz: 0,
      holder: null,
      targetReceiver: null,
      isShot: false,
      trail: []
    };

    this.initPlayers(homeFormation, awayFormation);
    this.setupResolution();
    this.giveBallToTeam('home');
    this.startLoop();
  }

  private setupResolution(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = 900 * dpr;
    this.canvas.height = 520 * dpr;
    this.ctx.scale(dpr, dpr);
    this.originX = 450;
    this.originY = 245;
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
   * Inicializa a los 22 futbolistas estilo chibi en sus posiciones tácticas
   */
  private initPlayers(homeFormationId: FormationId, awayFormationId: FormationId): void {
    const homeForm = FORMATIONS[homeFormationId] || FORMATIONS['4-3-3'];
    const awayForm = FORMATIONS[awayFormationId] || FORMATIONS['4-3-3'];

    const skins = ['#f8d5b8', '#e0ac69', '#c68642', '#8d5524', '#f1c27d'];
    const hairs = ['#1a1a1a', '#4a2c11', '#8b5a2b', '#2e1d0f', '#000000'];

    this.players = [];

    // 11 Jugadores Locales (Atacan hacia la derecha: X: 0 -> 100)
    homeForm.positions.forEach((posSlot, idx) => {
      const isGK = posSlot.role === 'POR';
      const slotX = isGK ? 5 : Math.round(14 + (posSlot.y / 100) * 35);
      const slotY = Math.round(6 + (posSlot.x / 100) * 53);

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
        speed: isGK ? 8 : (['DC', 'ED', 'EI'].includes(posSlot.role) ? 14 : 11),
        facing: 1,
        animStep: Math.random() * 10,
        state: 'idle',
        diveTimer: 0,
        kickTimer: 0,
        skinColor: skins[idx % skins.length]!,
        hairColor: hairs[idx % hairs.length]!
      });
    });

    // 11 Jugadores Visitantes (Atacan hacia la izquierda: X: 100 -> 0)
    awayForm.positions.forEach((posSlot, idx) => {
      const isGK = posSlot.role === 'POR';
      const slotX = isGK ? 95 : Math.round(86 - (posSlot.y / 100) * 35);
      const slotY = Math.round(6 + (posSlot.x / 100) * 53);

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
        speed: isGK ? 8 : (['DC', 'ED', 'EI'].includes(posSlot.role) ? 14 : 11),
        facing: -1,
        animStep: Math.random() * 10,
        state: 'idle',
        diveTimer: 0,
        kickTimer: 0,
        skinColor: skins[(idx + 2) % skins.length]!,
        hairColor: hairs[(idx + 1) % hairs.length]!
      });
    });
  }

  /**
   * Asigna la posesión inicial o tras recuperación al equipo indicado
   */
  private giveBallToTeam(team: 'home' | 'away'): void {
    this.currentAttackingTeam = team;
    const candidates = this.players.filter(p => p.team === team && !p.isGK);
    const mid = candidates.find(p => ['MC', 'MCD', 'MCO', 'MI', 'MD'].includes(p.pos)) || candidates[0];
    if (mid) {
      this.ball.holder = mid;
      this.ball.targetReceiver = null;
      this.ball.x = mid.x + (mid.facing * 1.5);
      this.ball.y = mid.y;
      this.ball.z = 0;
      this.ball.isShot = false;
      this.passCooldown = 0.8;
    }
  }

  /**
   * Sincronización invocada cada minuto real (o tick de simulación)
   */
  public onMinuteTick(
    minute: number,
    event: MatchEvent | null,
    homePossession: number,
    _homeScore: number,
    _awayScore: number
  ): void {
    // Alternar posesión basándose en el porcentaje táctico
    if (this.specialPlayQueue.length === 0) {
      const favorsHome = Math.random() * 100 < homePossession;
      const targetTeam = favorsHome ? 'home' : 'away';
      if (targetTeam !== this.currentAttackingTeam && Math.random() < 0.35) {
        this.giveBallToTeam(targetTeam);
      }
    }

    // Gestionar eventos específicos
    if (event) {
      if (event.type === 'goal_home') {
        this.specialPlayQueue.push({
          type: 'goal',
          team: 'home',
          scorerName: event.scorerName || 'Goleador'
        });
      } else if (event.type === 'goal_away') {
        this.specialPlayQueue.push({
          type: 'goal',
          team: 'away',
          scorerName: event.scorerName || 'Goleador Riv'
        });
      } else if (event.type === 'shot_home') {
        this.specialPlayQueue.push({
          type: 'shot',
          team: 'home'
        });
      } else if (event.type === 'shot_away') {
        this.specialPlayQueue.push({
          type: 'shot',
          team: 'away'
        });
      } else if (event.type === 'halftime' || minute === 45) {
        this.resetPositionsToHalf();
      }
    }

    // Actualizar objetivos dinámicos de líneas
    this.updateTacticalLines();
  }

  /**
   * Ajusta las posiciones de apoyo y repliegue de los 22 jugadores
   */
  private updateTacticalLines(): void {
    const ballX = this.ball.x;

    this.players.forEach(p => {
      if (p.state === 'celebrating' || p.state === 'diving') return;

      if (p.isGK) {
        // El arquero sigue el ángulo del balón
        const gkBaseX = p.team === 'home' ? 5 : 95;
        p.tx = gkBaseX;
        p.ty = Math.max(24, Math.min(41, 32.5 + (this.ball.y - 32.5) * 0.45));
        return;
      }

      const isMyTeamAttacking = p.team === this.currentAttackingTeam;

      if (isMyTeamAttacking) {
        // Equipo en ataque: adelantar líneas hacia el arco rival
        const forwardPush = p.team === 'home' ? 14 : -14;
        const driftY = (Math.random() - 0.5) * 10;
        p.tx = Math.max(8, Math.min(92, p.baseX + forwardPush + (ballX - 50) * 0.25));
        p.ty = Math.max(6, Math.min(59, p.baseY + driftY));
      } else {
        // Equipo en defensa: replegar y presionar el balón
        const retreat = p.team === 'home' ? -10 : 10;
        p.tx = Math.max(6, Math.min(94, p.baseX + retreat + (ballX - 50) * 0.2));
        p.ty = Math.max(6, Math.min(59, p.baseY + (this.ball.y - 32.5) * 0.2));

        // El defensor más cercano presiona activamente al portador
        if (this.ball.holder && this.ball.holder.team !== p.team) {
          const distToBall = Math.hypot(p.x - this.ball.x, p.y - this.ball.y);
          if (distToBall < 18) {
            p.tx = this.ball.x + (p.team === 'home' ? -2 : 2);
            p.ty = this.ball.y + (Math.random() - 0.5) * 2;
          }
        }
      }
    });
  }

  private resetPositionsToHalf(): void {
    this.players.forEach(p => {
      p.tx = p.baseX;
      p.ty = p.baseY;
      p.state = 'idle';
    });
    this.ball.holder = null;
    this.ball.targetReceiver = null;
    this.ball.x = 50;
    this.ball.y = 32.5;
    this.ball.z = 0;
  }

  /**
   * Bucle principal de animación a 60 FPS
   */
  private startLoop(): void {
    const loop = (timestamp: number) => {
      const dt = this.lastTime ? Math.min(0.06, (timestamp - this.lastTime) / 1000) : 0.016;
      this.lastTime = timestamp;

      this.update(dt);
      this.draw();

      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  /**
   * Actualización continua de física, pases, regates y jugadas
   */
  private update(dt: number): void {
    this.possessionCooldown = Math.max(0, this.possessionCooldown - dt);
    this.passCooldown = Math.max(0, this.passCooldown - dt);

    // 1) Ejecutar jugadas especiales pendientes (Gol o Tiro con peligro)
    if (this.specialPlayQueue.length > 0 && this.passCooldown <= 0) {
      const special = this.specialPlayQueue.shift()!;
      this.executeSpecialPlay(special);
    }

    // 2) IA de Pases y Avances del portador del balón
    if (this.ball.holder) {
      const carrier = this.ball.holder;
      const isHome = carrier.team === 'home';

      // El portador avanza hacia la portería rival
      carrier.tx = isHome ? Math.min(92, carrier.x + 8) : Math.max(8, carrier.x - 8);
      carrier.ty = Math.max(8, Math.min(57, carrier.y + (Math.random() - 0.5) * 6));
      carrier.state = 'running';

      // Posicionar el balón en los pies del jugador con rebote leve
      this.ball.x = carrier.x + (carrier.facing * 1.6);
      this.ball.y = carrier.y;
      this.ball.z = Math.abs(Math.sin(carrier.animStep * 2)) * 1.2;

      // Evaluar remate si está en zona de definición
      const inShootingZone = isHome ? carrier.x > 76 : carrier.x < 24;
      if (inShootingZone && this.passCooldown <= 0 && Math.random() < 0.04) {
        this.shootAtGoal(carrier, Math.random() < 0.35);
      } else if (this.passCooldown <= 0) {
        // Buscar compañero para pase
        const teammates = this.players.filter(p => p.team === carrier.team && p.id !== carrier.id && !p.isGK);
        const forwardTeammates = teammates.filter(p => isHome ? p.x > carrier.x - 4 : p.x < carrier.x + 4);
        const pool = forwardTeammates.length > 0 ? forwardTeammates : teammates;
        const receiver = pool[Math.floor(Math.random() * pool.length)];

        if (receiver && Math.random() < 0.06) {
          this.passBallTo(carrier, receiver);
        }
      }

      // Presión del defensor rival: posible intercepción
      const rivals = this.players.filter(p => p.team !== carrier.team && !p.isGK);
      for (const rival of rivals) {
        const dist = Math.hypot(rival.x - carrier.x, rival.y - carrier.y);
        if (dist < 2.2 && Math.random() < 0.05) {
          // El rival roba el balón
          carrier.state = 'idle';
          this.giveBallToTeam(rival.team);
          break;
        }
      }
    }

    // 3) Balón en trayectoria aérea o pase libre
    if (!this.ball.holder) {
      const bdx = this.ball.tx - this.ball.x;
      const bdy = this.ball.ty - this.ball.y;
      const dist = Math.hypot(bdx, bdy);

      const ballSpeed = this.ball.isShot ? 38 : 22;
      if (dist > 1.0) {
        this.ball.x += (bdx / dist) * Math.min(dist, ballSpeed * dt);
        this.ball.y += (bdy / dist) * Math.min(dist, ballSpeed * dt);
      } else {
        // Llegó al destino
        if (this.ball.targetReceiver) {
          this.ball.holder = this.ball.targetReceiver;
          this.ball.targetReceiver = null;
          this.ball.isShot = false;
          this.ball.z = 0;
          this.passCooldown = 0.6;
        }
      }

      // Efecto parabólico en la altura del balón
      if (this.ball.tz > 0 || this.ball.z > 0) {
        const progress = Math.max(0, 1 - (dist / 20));
        this.ball.z = Math.max(0, Math.sin(progress * Math.PI) * (this.ball.tz || 4));
      }

      // Rastro visual para tiros potentes
      if (this.ball.isShot) {
        this.ball.trail.push({ x: this.ball.x, y: this.ball.y, z: this.ball.z, alpha: 0.65 });
        if (this.ball.trail.length > 8) this.ball.trail.shift();
      } else {
        this.ball.trail.length = 0;
      }
    }

    // 4) Interpolación suave de los 22 futbolistas
    this.players.forEach(p => {
      if (p.kickTimer > 0) p.kickTimer -= dt;
      if (p.diveTimer > 0) p.diveTimer -= dt;

      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.4) {
        const moveDist = Math.min(dist, p.speed * dt);
        p.x += (dx / dist) * moveDist;
        p.y += (dy / dist) * moveDist;
        p.facing = dx >= 0 ? 1 : -1;
        p.animStep += dt * 14;
        p.state = p.state === 'celebrating' || p.state === 'diving' ? p.state : 'running';
      } else {
        p.animStep += dt * 2.5;
        if (p.state !== 'celebrating' && p.state !== 'diving') {
          p.state = 'idle';
        }
      }
    });

    if (this.goalBannerTimer > 0) {
      this.goalBannerTimer--;
    }
  }

  /**
   * Realiza un pase de balón entre compañeros
   */
  private passBallTo(kicker: ChibiPlayer, receiver: ChibiPlayer): void {
    kicker.state = 'kicking';
    kicker.kickTimer = 0.3;
    this.ball.holder = null;
    this.ball.targetReceiver = receiver;
    this.ball.tx = receiver.x;
    this.ball.ty = receiver.y;
    this.ball.tz = Math.random() < 0.25 ? 5 : 0;
    this.ball.isShot = false;
    this.passCooldown = 1.0;
  }

  /**
   * Ejecuta un disparo a portería con reacción del arquero
   */
  private shootAtGoal(shooter: ChibiPlayer, isGoal: boolean): void {
    shooter.state = 'kicking';
    shooter.kickTimer = 0.4;

    const isHome = shooter.team === 'home';
    const goalX = isHome ? 99 : 1;
    const goalY = 32.5 + (Math.random() - 0.5) * 10;

    this.ball.holder = null;
    this.ball.targetReceiver = null;
    this.ball.tx = isGoal ? goalX : (isHome ? 98 : 2);
    this.ball.ty = isGoal ? goalY : (goalY + (Math.random() > 0.5 ? 8 : -8));
    this.ball.tz = 4 + Math.random() * 4;
    this.ball.isShot = true;

    // Arquero rival intenta atajar
    const rivalGK = this.players.find(p => p.team !== shooter.team && p.isGK);
    if (rivalGK) {
      rivalGK.state = 'diving';
      rivalGK.diveTimer = 0.8;
      rivalGK.ty = Math.max(25, Math.min(40, goalY));
    }

    if (isGoal) {
      setTimeout(() => {
        this.triggerGoalCelebration(shooter.team, shooter.name);
      }, 350);
    } else {
      setTimeout(() => {
        // Balón despejado o fuera
        this.giveBallToTeam(isHome ? 'away' : 'home');
      }, 700);
    }
  }

  /**
   * Ejecución de jugadas especiales desde eventos del partido
   */
  private executeSpecialPlay(special: { type: 'goal' | 'shot'; team: 'home' | 'away'; scorerName?: string }): void {
    const isHome = special.team === 'home';
    const attackers = this.players.filter(p => p.team === special.team && !p.isGK);
    const shooter = attackers.find(p => ['DC', 'ED', 'EI'].includes(p.pos)) || attackers[0];

    if (!shooter) return;

    // Colocar al atacante en carrera hacia el área
    shooter.x = isHome ? 72 : 28;
    shooter.y = 32.5 + (Math.random() - 0.5) * 8;
    this.ball.holder = shooter;
    this.ball.x = shooter.x;
    this.ball.y = shooter.y;

    if (special.type === 'goal') {
      this.shootAtGoal(shooter, true);
      this.goalScorerName = special.scorerName || shooter.name;
    } else {
      this.shootAtGoal(shooter, false);
    }
  }

  /**
   * Festejo de gol: celebración grupal del equipo y cartel broadcast
   */
  private triggerGoalCelebration(team: 'home' | 'away', scorerName: string): void {
    this.players.filter(p => p.team === team).forEach(p => {
      p.state = 'celebrating';
    });
    this.goalBannerTimer = 180;
    this.goalScorerName = scorerName || (team === 'home' ? 'Goleador' : 'Goleador Riv');
    this.goalTeamName = team === 'home' ? this.homeTeam.name : this.awayTeam.name;
    sfx.playWhistle && sfx.playWhistle();

    setTimeout(() => {
      this.resetPositionsToHalf();
      this.giveBallToTeam(team === 'home' ? 'away' : 'home');
    }, 2800);
  }

  /**
   * Renderizado completo de la escena isométrica
   */
  private draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 900, 520);

    // Fondo del estadio / césped exterior
    this.drawStadiumSurround(ctx);

    // Césped isométrico y franjas
    this.drawPitchTurf(ctx);
    this.drawPitchMarkings(ctx);
    this.drawGoalpost(ctx, 'home');
    this.drawGoalpost(ctx, 'away');

    // Rastro del balón en tiros
    this.drawBallTrail(ctx);

    // Ordenamiento por profundidad isométrica (Z-index por Y en pantalla)
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
   * Fondo perimetral del estadio para un encuadre visual completo
   */
  private drawStadiumSurround(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createRadialGradient(450, 260, 100, 450, 260, 480);
    grad.addColorStop(0, '#102d20');
    grad.addColorStop(0.7, '#0b1f16');
    grad.addColorStop(1, '#06110c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 520);
  }

  /**
   * Césped isométrico con franjas alternadas
   */
  private drawPitchTurf(ctx: CanvasRenderingContext2D): void {
    const c1 = this.toScreen(0, 0);
    const c2 = this.toScreen(100, 0);
    const c3 = this.toScreen(100, 65);
    const c4 = this.toScreen(0, 65);

    // Sombra del terreno
    ctx.beginPath();
    ctx.moveTo(c1.px, c1.py + 12);
    ctx.lineTo(c2.px, c2.py + 12);
    ctx.lineTo(c3.px, c3.py + 12);
    ctx.lineTo(c4.px, c4.py + 12);
    ctx.closePath();
    ctx.fillStyle = '#050c08';
    ctx.fill();

    // Superficie del campo
    ctx.beginPath();
    ctx.moveTo(c1.px, c1.py);
    ctx.lineTo(c2.px, c2.py);
    ctx.lineTo(c3.px, c3.py);
    ctx.lineTo(c4.px, c4.py);
    ctx.closePath();
    ctx.fillStyle = '#1e733b';
    ctx.fill();

    // Franjas de corte alternadas
    const stripes = 12;
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
      ctx.fillStyle = '#248545';
      ctx.fill();
    }
  }

  /**
   * Líneas reglamentarias del campo en perspectiva isométrica
   */
  private drawPitchMarkings(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.8;

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
    ctx.ellipse(center.px, center.py, 52, 26, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Punto central
    ctx.beginPath();
    ctx.arc(center.px, center.py, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Área grande local (X=0 a 16, Y=14 a 51)
    this.drawIsoBox(ctx, 0, 14, 16, 51);
    // Área chica local
    this.drawIsoBox(ctx, 0, 23, 6, 42);

    // Área grande visitante (X=84 a 100, Y=14 a 51)
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
    const depthX = side === 'home' ? -3.5 : 3.5;
    const yTop = 26;
    const yBottom = 39;
    const postHeight = 22;

    const pTop = this.toScreen(x, yTop);
    const pBottom = this.toScreen(x, yBottom);
    const pTopBack = this.toScreen(x + depthX, yTop);
    const pBottomBack = this.toScreen(x + depthX, yBottom);

    // Malla tridimensional del arco
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pTop.px, pTop.py - postHeight);
    ctx.lineTo(pTopBack.px, pTopBack.py - postHeight * 0.75);
    ctx.lineTo(pBottomBack.px, pBottomBack.py - postHeight * 0.75);
    ctx.lineTo(pBottom.px, pBottom.py - postHeight);
    ctx.lineTo(pBottom.px, pBottom.py);
    ctx.lineTo(pBottomBack.px, pBottomBack.py);
    ctx.lineTo(pTopBack.px, pTopBack.py);
    ctx.lineTo(pTop.px, pTop.py);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fill();

    // Postes frontales y travesaño
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Poste izquierdo
    ctx.beginPath();
    ctx.moveTo(pTop.px, pTop.py);
    ctx.lineTo(pTop.px, pTop.py - postHeight);
    ctx.stroke();

    // Poste derecho
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
   * Dibuja a cada futbolista estilo chibi / miniatura con su kit oficial
   */
  private drawChibiPlayer(ctx: CanvasRenderingContext2D, p: ChibiPlayer): void {
    const pos = this.toScreen(p.x, p.y);
    const teamColors = p.team === 'home'
      ? (this.homeTeam.colors || ['#0088cc', '#ffffff'])
      : (this.awayTeam.colors || ['#cc2200', '#ffffff']);
    const kitColor = p.isGK ? '#facc15' : teamColors[0]!;
    const shortsColor = p.isGK ? '#1e293b' : (teamColors[1] || '#ffffff');

    ctx.save();

    // Sombra en el césped
    ctx.beginPath();
    ctx.ellipse(pos.px, pos.py + 2, 8, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();

    // Animación de rebote (correr, patear o festejar)
    let bob = Math.sin(p.animStep) * 2.2;
    if (p.state === 'celebrating') {
      bob = -Math.abs(Math.sin(p.animStep * 2.5)) * 8; // Salto alegre
    } else if (p.state === 'diving') {
      bob = 6; // Tendido en el césped
    }

    const py = pos.py + bob;

    // Piernas y botines con movimiento alternado
    const legSwing = Math.sin(p.animStep) * 4;
    ctx.fillStyle = shortsColor;
    ctx.fillRect(pos.px - 5, py - 7, 3.5, 6);
    ctx.fillRect(pos.px + 1.5, py - 7, 3.5, 6);

    // Botines con desplazamiento
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(pos.px - 6 + (p.state === 'running' ? legSwing * 0.4 : 0), py - 2, 4.5, 3);
    ctx.fillRect(pos.px + 1.5 - (p.state === 'running' ? legSwing * 0.4 : 0), py - 2, 4.5, 3);

    // Torso con camiseta del club
    ctx.fillStyle = kitColor;
    ctx.beginPath();
    ctx.roundRect(pos.px - 6, py - 18, 12, 12, 2.5);
    ctx.fill();

    // Número de dorsal en la espalda
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(p.number), pos.px, py - 9);

    // Cabeza estilo Chibi
    ctx.beginPath();
    ctx.arc(pos.px, py - 24, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = p.skinColor;
    ctx.fill();

    // Cabello
    ctx.beginPath();
    ctx.arc(pos.px, py - 26, 7.5, Math.PI, Math.PI * 2);
    ctx.fillStyle = p.hairColor;
    ctx.fill();

    // Ojos según la dirección de carrera
    const eyeOffsetX = p.facing * 2.2;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(pos.px + eyeOffsetX - 1.2, py - 24, 1.2, 0, Math.PI * 2);
    ctx.arc(pos.px + eyeOffsetX + 2.2, py - 24, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Brazos alzados si festeja gol
    if (p.state === 'celebrating') {
      ctx.strokeStyle = kitColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pos.px - 6, py - 16);
      ctx.lineTo(pos.px - 10, py - 28);
      ctx.moveTo(pos.px + 6, py - 16);
      ctx.lineTo(pos.px + 10, py - 28);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Dibuja el balón de fútbol con sombra, elevación y pentágonos
   */
  private drawBall(ctx: CanvasRenderingContext2D, b: Ball): void {
    const shadowPos = this.toScreen(b.x, b.y, 0);
    const ballPos = this.toScreen(b.x, b.y, b.z);

    ctx.save();

    // Sombra del balón
    ctx.beginPath();
    const shadowRadius = Math.max(2, 5 - b.z * 0.2);
    ctx.ellipse(shadowPos.px, shadowPos.py + 1.5, shadowRadius, shadowRadius * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();

    // Esfera del balón
    ctx.beginPath();
    ctx.arc(ballPos.px, ballPos.py, 4.8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Centro clásico
    ctx.beginPath();
    ctx.arc(ballPos.px, ballPos.py, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    ctx.restore();
  }

  private drawBallTrail(ctx: CanvasRenderingContext2D): void {
    if (this.ball.trail.length < 2) return;
    ctx.save();
    for (let i = 0; i < this.ball.trail.length - 1; i++) {
      const p1 = this.toScreen(this.ball.trail[i]!.x, this.ball.trail[i]!.y, this.ball.trail[i]!.z);
      const p2 = this.toScreen(this.ball.trail[i + 1]!.x, this.ball.trail[i + 1]!.y, this.ball.trail[i + 1]!.z);
      ctx.strokeStyle = `rgba(255, 255, 255, ${this.ball.trail[i]!.alpha * 0.5})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Cartel limpio de gol estilo broadcast televisivo (sin emojis)
   */
  private drawGoalBanner(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const bx = 450;
    const by = 245;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = 'var(--accent-gold, #f59e0b)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(bx - 150, by - 40, 300, 80, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 1.35rem sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ANOTACIÓN DE GOL', bx, by - 12);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 0.95rem sans-serif';
    ctx.fillText(this.goalScorerName, bx, by + 12);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '0.78rem sans-serif';
    ctx.fillText(this.goalTeamName, bx, by + 28);

    ctx.restore();
  }

  public destroy(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }
}
