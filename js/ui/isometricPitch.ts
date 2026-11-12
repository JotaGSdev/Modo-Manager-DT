/**
 * ============================================================================
 * ENTRENADOR LEYENDA - MOTOR DE SIMULACIÓN Y CANCHA 2D ISOMÉTRICA (isometricPitch.ts)
 * ============================================================================
 * VISTA TÁCTICA INTERACTIVA ESTILO EA SPORTS FC / FIFA CON FUTBOLISTAS CHIBI
 * - Proyección isométrica broadcast calibrada y centrada a 60 FPS.
 * - Indicador de control de jugador activo (cursor triangular + nametag flotante FIFA).
 * - Barra de Momentum y Peligro Táctico en vivo (Momentum Meter).
 * - Jugadas reales: desbordes por banda con centros al área, remates de cabeza en salto,
 *   pases filtrados entre líneas, disparos de media distancia, barridas defensivas (tackles)
 *   y atajadas en vuelo horizontal de los arqueros.
 * - Respeta órdenes tácticas en vivo (Presión Alta, Bloque Bajo, Contraataque, Tiqui-taca).
 * - 90 minutos reglamentarios en 90 segundos reales sincronizados.
 * - Cero emojis: badges y marcadores tipográficos profesionales.
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
  x: number;          // Posición en cancha (0 - 100)
  y: number;          // Posición lateral (0 - 65)
  z: number;          // Elevación / salto (cabezazo, atajada)
  tx: number;         // Destino interpolado X
  ty: number;         // Destino interpolado Y
  tz: number;
  vx: number;
  vy: number;
  baseX: number;      // Posición base según formación
  baseY: number;
  speed: number;      // Velocidad de desplazamiento
  facing: number;     // 1 = derecha, -1 = izquierda
  animStep: number;   // Ciclo de animación
  state: 'idle' | 'running' | 'kicking' | 'diving' | 'sliding' | 'celebrating';
  diveTimer: number;
  kickTimer: number;
  slideTimer: number;
  stamina: number;    // % de energía en vivo
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
  isCross: boolean;
  trail: Array<{ x: number; y: number; z: number; alpha: number }>;
}

export type TacticalStyle = 'NORMAL' | 'PRESSING' | 'LOW_BLOCK' | 'COUNTER' | 'CONTROL';

export class IsometricPitch {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId: number | null = null;
  private homeTeam: Team;
  private awayTeam: Team;
  private players: ChibiPlayer[] = [];
  private ball: Ball;
  private lastTime = 0;
  private gameTime = 0;

  // Rótulos de estado y celebración
  private goalBannerTimer = 0;
  private goalScorerName = '';
  private goalTeamName = '';

  // Dimensiones del campo calibradas al lienzo de 900x520
  private originX = 450;
  private originY = 245;
  private scaleX = 5.8;
  private scaleY = 4.8;
  private isoAngle = 0.46;

  // Dinámica de cámara y Momentum Táctico EA Sports FC
  private cameraPanX = 0;
  private momentum = 15; // -100 (dominio visitante) a +100 (dominio local)
  private currentPlayText = '[JUGADA] INICIO DE ENCUENTRO EN MITAD DE CANCHA';
  private playTextTimer = 3.0;
  private activeTacticalStyle: TacticalStyle = 'NORMAL';

  // Flujo autónomo de jugadas
  private currentAttackingTeam: 'home' | 'away' = 'home';
  private passCooldown = 0;
  private phaseTimer = 0;

  private specialPlayQueue: Array<{
    type: 'goal' | 'shot';
    team: 'home' | 'away';
    scorerName?: string;
  }> = [];

  // Colores calibrados con prevención de choques visuales
  private homeKitColor = '#0088cc';
  private homeAccentColor = '#ffffff';
  private awayKitColor = '#cc2200';
  private awayAccentColor = '#ffffff';

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

    // Resolución de colores con prevención de choque de equipaciones (Kit Clash)
    const h1 = (homeTeam.colors && homeTeam.colors[0]) || '#0088cc';
    const h2 = (homeTeam.colors && homeTeam.colors[1]) || '#ffffff';
    let a1 = (awayTeam.colors && awayTeam.colors[0]) || '#cc2200';
    let a2 = (awayTeam.colors && awayTeam.colors[1]) || '#ffffff';

    if (this.isColorClash(h1, a1)) {
      a1 = (awayTeam.colors && awayTeam.colors[1] && !this.isColorClash(h1, awayTeam.colors[1]))
        ? awayTeam.colors[1]
        : '#facc15'; // Amarillo eléctrico alternativo para máximo contraste
      a2 = '#0f172a';
    }

    this.homeKitColor = h1;
    this.homeAccentColor = h2;
    this.awayKitColor = a1;
    this.awayAccentColor = a2;

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
      isCross: false,
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
   * Proyección isométrica con seguimiento suave de cámara sobre la acción
   */
  private toScreen(x: number, y: number, z = 0): { px: number; py: number } {
    const cosA = Math.cos(this.isoAngle);
    const sinA = Math.sin(this.isoAngle);

    const nx = (x - 50) * this.scaleX;
    const ny = (y - 32.5) * this.scaleY;

    const px = this.originX + this.cameraPanX + (nx - ny) * cosA;
    const py = this.originY + (nx + ny) * sinA * 0.58 - z;

    return { px, py };
  }

  /**
   * Inicializa a los 22 futbolistas chibi con sus roles y características
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
        z: 0,
        tx: slotX,
        ty: slotY,
        tz: 0,
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
        slideTimer: 0,
        stamina: 96 - idx * 2,
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
        z: 0,
        tx: slotX,
        ty: slotY,
        tz: 0,
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
        slideTimer: 0,
        stamina: 94 - idx * 2,
        skinColor: skins[(idx + 2) % skins.length]!,
        hairColor: hairs[(idx + 1) % hairs.length]!
      });
    });
  }

  /**
   * Cambia o aplica una orden táctica del DT en tiempo real
   */
  public setTacticalOrder(order: TacticalStyle): void {
    this.activeTacticalStyle = order;
    if (order === 'PRESSING') {
      this.momentum = Math.min(100, this.momentum + 18);
      this.currentPlayText = '[ORDEN ACTIVA] PRESIÓN ASFIXIANTE: BLOQUE ALTO ADELANTADO';
    } else if (order === 'LOW_BLOCK') {
      this.momentum = Math.max(-100, this.momentum - 12);
      this.currentPlayText = '[ORDEN ACTIVA] REPLIEGUE DEFENSIVO: CERROJO EN ÁREA PROPIA';
    } else if (order === 'COUNTER') {
      this.currentPlayText = '[ORDEN ACTIVA] CONTRAATAQUE DIRECTO: BALONES LARGOS A ESPALDA RIVAL';
    } else if (order === 'CONTROL') {
      this.currentPlayText = '[ORDEN ACTIVA] PAUSA Y TIQUI-TACA: CONTROL PACIENTE DE LA POSESIÓN';
    } else {
      this.currentPlayText = '[ORDEN ACTIVA] ESTRUCTURA TÁCTICA EQUILIBRADA';
    }
    this.playTextTimer = 2.5;
    this.updateTacticalLines();
  }

  /**
   * Entrega la posesión a un equipo tras recuperación o saque
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
      this.ball.isCross = false;
      this.passCooldown = 0.7;
    }
  }

  /**
   * Sincronización invocada cada minuto simulado
   */
  public onMinuteTick(
    minute: number,
    event: MatchEvent | null,
    homePossession: number,
    _homeScore: number,
    _awayScore: number
  ): void {
    // Sincronizar Momentum con la posesión y peligro
    const targetMomentum = (homePossession - 50) * 1.8;
    this.momentum += (targetMomentum - this.momentum) * 0.25;

    // Alternar posesión dinámica según porcentaje
    if (this.specialPlayQueue.length === 0) {
      const favorsHome = Math.random() * 100 < homePossession;
      const targetTeam = favorsHome ? 'home' : 'away';
      if (targetTeam !== this.currentAttackingTeam && Math.random() < 0.4) {
        this.giveBallToTeam(targetTeam);
      }
    }

    if (event) {
      if (event.type === 'goal_home') {
        this.specialPlayQueue.push({
          type: 'goal',
          team: 'home',
          scorerName: event.scorerName || 'Goleador'
        });
        this.currentPlayText = `[PELIGRO CRÍTICO] ¡ATAQUE LETAL DE ${this.homeTeam.name.toUpperCase()}!`;
        this.playTextTimer = 3.5;
      } else if (event.type === 'goal_away') {
        this.specialPlayQueue.push({
          type: 'goal',
          team: 'away',
          scorerName: event.scorerName || 'Goleador Riv'
        });
        this.currentPlayText = `[PELIGRO CRÍTICO] ¡LLEGADA A FONDO DE ${this.awayTeam.name.toUpperCase()}!`;
        this.playTextTimer = 3.5;
      } else if (event.type === 'shot_home') {
        this.specialPlayQueue.push({ type: 'shot', team: 'home' });
        this.currentPlayText = `[OCASIÓN DE GOL] Disparo directo a puerta de ${this.homeTeam.name}`;
        this.playTextTimer = 2.8;
      } else if (event.type === 'shot_away') {
        this.specialPlayQueue.push({ type: 'shot', team: 'away' });
        this.currentPlayText = `[OCASIÓN DE GOL] Remate peligroso de ${this.awayTeam.name} que exige al portero`;
        this.playTextTimer = 2.8;
      } else if (event.type === 'halftime' || minute === 45) {
        this.resetPositionsToHalf();
        this.currentPlayText = '[ENTRETIEMPO] Fin del primer tiempo · Jugadores al vestuario';
        this.playTextTimer = 3.0;
      }
    }

    this.updateTacticalLines();
  }

  /**
   * Modifica las líneas y la presión según la táctica activa y posesión
   */
  private updateTacticalLines(): void {
    const ballX = this.ball.x;

    this.players.forEach(p => {
      if (p.state === 'celebrating' || p.state === 'diving') return;

      if (p.isGK) {
        // Arquero sigue el balón protegiendo su palo
        const gkBaseX = p.team === 'home' ? 5 : 95;
        p.tx = gkBaseX;
        p.ty = Math.max(24, Math.min(41, 32.5 + (this.ball.y - 32.5) * 0.45));
        return;
      }

      const isMyTeamAttacking = p.team === this.currentAttackingTeam;
      let tacticBonus = 0;
      if (this.activeTacticalStyle === 'PRESSING') tacticBonus = p.team === 'home' ? 14 : -14;
      if (this.activeTacticalStyle === 'LOW_BLOCK') tacticBonus = p.team === 'home' ? -12 : 12;

      if (isMyTeamAttacking) {
        // Despliegue ofensivo: abrir bandas y pisar área
        const pushForward = (p.team === 'home' ? 16 : -16) + tacticBonus;
        const driftY = (Math.random() - 0.5) * 8;
        p.tx = Math.max(8, Math.min(92, p.baseX + pushForward + (ballX - 50) * 0.28));
        p.ty = Math.max(5, Math.min(60, p.baseY + driftY));
      } else {
        // Repliegue defensivo: achique de espacios y marca
        const pushBack = (p.team === 'home' ? -10 : 10) + tacticBonus * 0.5;
        p.tx = Math.max(6, Math.min(94, p.baseX + pushBack + (ballX - 50) * 0.22));
        p.ty = Math.max(6, Math.min(59, p.baseY + (this.ball.y - 32.5) * 0.25));

        // El defensor más cercano presiona al portador
        if (this.ball.holder && this.ball.holder.team !== p.team) {
          const distToBall = Math.hypot(p.x - this.ball.x, p.y - this.ball.y);
          if (distToBall < 16) {
            p.tx = this.ball.x + (p.team === 'home' ? -2.2 : 2.2);
            p.ty = this.ball.y + (Math.random() - 0.5) * 1.5;
          }
        }
      }
    });
  }

  private resetPositionsToHalf(): void {
    this.players.forEach(p => {
      p.tx = p.baseX;
      p.ty = p.baseY;
      p.z = 0;
      p.state = 'idle';
    });
    this.ball.holder = null;
    this.ball.targetReceiver = null;
    this.ball.x = 50;
    this.ball.y = 32.5;
    this.ball.z = 0;
    this.ball.isShot = false;
    this.ball.isCross = false;
  }

  private startLoop(): void {
    const loop = (timestamp: number) => {
      const dt = this.lastTime ? Math.min(0.06, (timestamp - this.lastTime) / 1000) : 0.016;
      this.lastTime = timestamp;
      this.gameTime += dt;

      this.update(dt);
      this.draw();

      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  /**
   * Actualización continua de física, pases reales, centros y remates
   */
  private update(dt: number): void {
    this.passCooldown = Math.max(0, this.passCooldown - dt);
    this.phaseTimer += dt;
    if (this.playTextTimer > 0) this.playTextTimer -= dt;

    // Seguimiento dinámico de cámara (glide suave hacia la acción activa)
    const targetPanX = (50 - this.ball.x) * 1.2;
    this.cameraPanX += (targetPanX - this.cameraPanX) * Math.min(1, dt * 2.5);

    // 1) Ejecutar jugadas especiales pendientes
    if (this.specialPlayQueue.length > 0 && this.passCooldown <= 0) {
      const special = this.specialPlayQueue.shift()!;
      this.executeSpecialPlay(special);
    }

    // 2) Flujo autónomo de juego continuo
    if (this.ball.holder) {
      const carrier = this.ball.holder;
      const isHome = carrier.team === 'home';

      // Posicionar el balón en los pies del portador con rebote natural
      this.ball.x = carrier.x + (carrier.facing * 1.6);
      this.ball.y = carrier.y;
      this.ball.z = Math.abs(Math.sin(carrier.animStep * 2.2)) * 1.2;

      // El portador avanza hacia el campo contrario
      const advanceRate = this.activeTacticalStyle === 'COUNTER' ? 12 : 7.5;
      carrier.tx = isHome ? Math.min(92, carrier.x + advanceRate) : Math.max(8, carrier.x - advanceRate);
      carrier.ty = Math.max(8, Math.min(57, carrier.y + (Math.random() - 0.5) * 5));
      carrier.state = 'running';

      // Decisiones tácticas de jugadas reales estilo EA FC:
      const inShootingZone = isHome ? carrier.x > 75 : carrier.x < 25;
      const onTheWing = carrier.y < 14 || carrier.y > 51;

      if (inShootingZone && this.passCooldown <= 0 && Math.random() < 0.045) {
        // Disparo directo a puerta
        this.currentPlayText = `[TIRO A PUERTA] ${carrier.name} busca el arco con potencia`;
        this.playTextTimer = 2.2;
        this.shootAtGoal(carrier, Math.random() < 0.4);
      } else if (onTheWing && (isHome ? carrier.x > 68 : carrier.x < 32) && this.passCooldown <= 0 && Math.random() < 0.05) {
        // Centro bombeado al área desde la banda
        this.crossBallIntoBox(carrier);
      } else if (this.passCooldown <= 0 && (this.phaseTimer > 1.2 || Math.random() < 0.05)) {
        // Pase filtrado o pase al pie a compañero
        this.executeTacticalPass(carrier);
        this.phaseTimer = 0;
      }

      // Presión y barridas de los defensores rivales
      const rivals = this.players.filter(p => p.team !== carrier.team && !p.isGK);
      for (const rival of rivals) {
        const dist = Math.hypot(rival.x - carrier.x, rival.y - carrier.y);
        if (dist < 2.4 && Math.random() < 0.06) {
          // Barrida limpia del defensor
          rival.state = 'sliding';
          rival.slideTimer = 0.5;
          carrier.state = 'idle';
          this.currentPlayText = `[BARRIDA DEFENSIVA] ${rival.name} corta limpio y recupera`;
          this.playTextTimer = 1.8;
          this.giveBallToTeam(rival.team);
          break;
        }
      }
    }

    // 3) Balón en el aire o rodando
    if (!this.ball.holder) {
      const bdx = this.ball.tx - this.ball.x;
      const bdy = this.ball.ty - this.ball.y;
      const dist = Math.hypot(bdx, bdy);

      const ballSpeed = this.ball.isShot ? 42 : (this.ball.isCross ? 28 : 22);
      if (dist > 1.0) {
        this.ball.x += (bdx / dist) * Math.min(dist, ballSpeed * dt);
        this.ball.y += (bdy / dist) * Math.min(dist, ballSpeed * dt);
      } else {
        // Llegó al destino
        if (this.ball.targetReceiver) {
          this.ball.holder = this.ball.targetReceiver;
          this.ball.targetReceiver = null;
          this.ball.isShot = false;
          this.ball.isCross = false;
          this.ball.z = 0;
          this.passCooldown = 0.6;
        }
      }

      // Efecto de comba y gravedad en centros y tiros
      if (this.ball.tz > 0 || this.ball.z > 0) {
        const progress = Math.max(0, 1 - (dist / 24));
        this.ball.z = Math.max(0, Math.sin(progress * Math.PI) * (this.ball.tz || 4));
      }

      // Rastro visual para tiros potentes
      if (this.ball.isShot) {
        this.ball.trail.push({ x: this.ball.x, y: this.ball.y, z: this.ball.z, alpha: 0.75 });
        if (this.ball.trail.length > 8) this.ball.trail.shift();
      } else {
        this.ball.trail.length = 0;
      }
    }

    // 4) Interpolación de los 22 futbolistas
    this.players.forEach(p => {
      if (p.kickTimer > 0) p.kickTimer -= dt;
      if (p.diveTimer > 0) p.diveTimer -= dt;
      if (p.slideTimer > 0) p.slideTimer -= dt;

      // Caída natural de salto de cabeza
      if (p.z > 0) p.z = Math.max(0, p.z - dt * 10);

      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.4) {
        const moveDist = Math.min(dist, p.speed * dt);
        p.x += (dx / dist) * moveDist;
        p.y += (dy / dist) * moveDist;
        p.facing = dx >= 0 ? 1 : -1;
        p.animStep += dt * 14;
        if (p.state !== 'celebrating' && p.state !== 'diving' && p.state !== 'sliding') {
          p.state = 'running';
        }
      } else {
        p.animStep += dt * 2.5;
        if (p.state !== 'celebrating' && p.state !== 'diving' && p.state !== 'sliding') {
          p.state = 'idle';
        }
      }
    });

    if (this.goalBannerTimer > 0) {
      this.goalBannerTimer--;
    }
  }

  /**
   * Ejecuta un pase filtrado o de construcción entre compañeros
   */
  private executeTacticalPass(carrier: ChibiPlayer): void {
    const isHome = carrier.team === 'home';
    const teammates = this.players.filter(p => p.team === carrier.team && p.id !== carrier.id && !p.isGK);
    const forwardTeammates = teammates.filter(p => isHome ? p.x > carrier.x - 2 : p.x < carrier.x + 2);
    const pool = forwardTeammates.length > 0 ? forwardTeammates : teammates;
    const receiver = pool[Math.floor(Math.random() * pool.length)];

    if (!receiver) return;

    carrier.state = 'kicking';
    carrier.kickTimer = 0.3;
    this.ball.holder = null;
    this.ball.targetReceiver = receiver;
    this.ball.tx = receiver.x;
    this.ball.ty = receiver.y;
    this.ball.tz = Math.random() < 0.2 ? 4 : 0;
    this.ball.isShot = false;
    this.ball.isCross = false;
    this.passCooldown = 0.9;

    this.currentPlayText = `[PASE ASOCIATIVO] ${carrier.name} toca hacia ${receiver.name}`;
    this.playTextTimer = 1.6;
  }

  /**
   * Centro al área desde la banda con salto del delantero centro
   */
  private crossBallIntoBox(winger: ChibiPlayer): void {
    const isHome = winger.team === 'home';
    const attackers = this.players.filter(p => p.team === winger.team && !p.isGK);
    const striker = attackers.find(p => ['DC', 'ED', 'EI'].includes(p.pos)) || attackers[0];

    winger.state = 'kicking';
    winger.kickTimer = 0.4;

    const crossTargetX = isHome ? 88 : 12;
    const crossTargetY = 32.5 + (Math.random() - 0.5) * 8;

    this.ball.holder = null;
    this.ball.targetReceiver = striker || null;
    this.ball.tx = crossTargetX;
    this.ball.ty = crossTargetY;
    this.ball.tz = 9; // Centro alto en parábola
    this.ball.isShot = false;
    this.ball.isCross = true;
    this.passCooldown = 1.3;

    if (striker) {
      striker.tx = crossTargetX;
      striker.ty = crossTargetY;
      // Salto de cabeza
      setTimeout(() => {
        striker.z = 6;
        striker.state = 'kicking';
      }, 350);
    }

    this.currentPlayText = `[CENTRO AL ÁREA] Desborde por banda de ${winger.name} y balón aéreo`;
    this.playTextTimer = 2.4;
  }

  /**
   * Ejecuta un disparo a portería con vuelo del arquero rival
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
    this.ball.ty = isGoal ? goalY : (goalY + (Math.random() > 0.5 ? 9 : -9));
    this.ball.tz = 5 + Math.random() * 3;
    this.ball.isShot = true;

    // Arquero rival se estira en vuelo horizontal
    const rivalGK = this.players.find(p => p.team !== shooter.team && p.isGK);
    if (rivalGK) {
      rivalGK.state = 'diving';
      rivalGK.diveTimer = 0.9;
      rivalGK.ty = Math.max(25, Math.min(40, goalY));
    }

    if (isGoal) {
      setTimeout(() => {
        this.triggerGoalCelebration(shooter.team, shooter.name);
      }, 320);
    } else {
      setTimeout(() => {
        this.currentPlayText = `[ATAJADA CLAVE] El arquero desvía el remate de ${shooter.name}`;
        this.playTextTimer = 2.0;
        this.giveBallToTeam(isHome ? 'away' : 'home');
      }, 700);
    }
  }

  private executeSpecialPlay(special: { type: 'goal' | 'shot'; team: 'home' | 'away'; scorerName?: string }): void {
    const isHome = special.team === 'home';
    const attackers = this.players.filter(p => p.team === special.team && !p.isGK);
    const shooter = attackers.find(p => ['DC', 'ED', 'EI'].includes(p.pos)) || attackers[0];

    if (!shooter) return;

    shooter.x = isHome ? 74 : 26;
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

  private triggerGoalCelebration(team: 'home' | 'away', scorerName: string): void {
    this.players.filter(p => p.team === team).forEach(p => {
      p.state = 'celebrating';
    });
    this.goalBannerTimer = 180;
    this.goalScorerName = scorerName || (team === 'home' ? 'Goleador' : 'Goleador Riv');
    this.goalTeamName = team === 'home' ? this.homeTeam.name : this.awayTeam.name;
    this.currentPlayText = `[¡GOOOOL!] Anotación confirmada de ${this.goalScorerName}`;
    this.playTextTimer = 3.5;
    sfx.playWhistle && sfx.playWhistle();

    setTimeout(() => {
      this.resetPositionsToHalf();
      this.giveBallToTeam(team === 'home' ? 'away' : 'home');
    }, 2800);
  }

  /**
   * Renderizado de la escena isométrica con HUD estilo FIFA / EA FC
   */
  private draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 900, 520);

    // Fondo del estadio
    this.drawStadiumSurround(ctx);

    // Césped y líneas
    this.drawPitchTurf(ctx);
    this.drawPitchMarkings(ctx);
    this.drawGoalpost(ctx, 'home');
    this.drawGoalpost(ctx, 'away');

    // Rastro del balón en tiros
    this.drawBallTrail(ctx);

    // Ordenamiento por profundidad Z (eje Y de pantalla)
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

    // ── HUD ESTILO EA SPORTS FC: BARRA DE MOMENTUM Y TICKER TÁCTICO ──
    this.drawTacticalMomentumHUD(ctx);
    this.drawLiveActionTicker(ctx);

    // Cartel festivo si hay gol en curso
    if (this.goalBannerTimer > 0) {
      this.drawGoalBanner(ctx);
    }
  }

  /**
   * Barra de Momentum Táctico estilo EA Sports FC (arriba en el canvas)
   */
  private drawTacticalMomentumHUD(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const bx = 450;
    const by = 24;

    // Caja de fondo translúcida
    ctx.fillStyle = 'rgba(11, 19, 32, 0.88)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx - 210, by - 14, 420, 28, 6);
    ctx.fill();
    ctx.stroke();

    // Nombre local
    ctx.fillStyle = 'var(--accent-cyan, #00f0ff)';
    ctx.font = 'bold 0.72rem sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.homeTeam.short || this.homeTeam.name.slice(0, 10).toUpperCase(), bx - 198, by + 4);

    // Nombre visitante
    ctx.fillStyle = 'var(--accent-red, #ef4444)';
    ctx.textAlign = 'right';
    ctx.fillText(this.awayTeam.short || this.awayTeam.name.slice(0, 10).toUpperCase(), bx + 198, by + 4);

    // Barra dual de Momentum (centro)
    const barW = 160;
    const barH = 7;
    const barX = bx - (barW / 2);
    const barY = by - 3;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY, barW, barH);

    // Proporción de momentum (-100 a +100 normalizado a 0 a 1)
    const norm = Math.max(0, Math.min(1, (this.momentum + 100) / 200));
    const fillW = barW * norm;

    // Gradiente dinámico de presión
    const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    grad.addColorStop(0, '#00f0ff');
    grad.addColorStop(0.5, '#f59e0b');
    grad.addColorStop(1, '#ef4444');

    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, fillW, barH);

    // Línea central neutral
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, barY - 1);
    ctx.lineTo(bx, barY + barH + 1);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Ticker de acción en vivo con la descripción de la jugada activa
   */
  private drawLiveActionTicker(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const tx = 450;
    const ty = 494;

    ctx.fillStyle = 'rgba(11, 19, 32, 0.90)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tx - 260, ty - 13, 520, 26, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 0.72rem sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.currentPlayText, tx, ty + 4);

    ctx.restore();
  }

  private drawStadiumSurround(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createRadialGradient(450, 260, 100, 450, 260, 480);
    grad.addColorStop(0, '#102d20');
    grad.addColorStop(0.7, '#0b1f16');
    grad.addColorStop(1, '#06110c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 520);
  }

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

    // Césped
    ctx.beginPath();
    ctx.moveTo(c1.px, c1.py);
    ctx.lineTo(c2.px, c2.py);
    ctx.lineTo(c3.px, c3.py);
    ctx.lineTo(c4.px, c4.py);
    ctx.closePath();
    ctx.fillStyle = '#1e733b';
    ctx.fill();

    // Franjas de corte
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

  private drawPitchMarkings(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.8;

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

    // Línea de medio campo
    const m1 = this.toScreen(50, 0);
    const m2 = this.toScreen(50, 65);
    ctx.beginPath();
    ctx.moveTo(m1.px, m1.py);
    ctx.lineTo(m2.px, m2.py);
    ctx.stroke();

    // Círculo central
    const center = this.toScreen(50, 32.5);
    ctx.beginPath();
    ctx.ellipse(center.px, center.py, 52, 26, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Punto central
    ctx.beginPath();
    ctx.arc(center.px, center.py, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Áreas grandes y chicas
    this.drawIsoBox(ctx, 0, 14, 16, 51);
    this.drawIsoBox(ctx, 0, 23, 6, 42);
    this.drawIsoBox(ctx, 84, 14, 100, 51);
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

    // Malla
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

    // Postes y travesaño
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(pTop.px, pTop.py);
    ctx.lineTo(pTop.px, pTop.py - postHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pBottom.px, pBottom.py);
    ctx.lineTo(pBottom.px, pBottom.py - postHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pTop.px, pTop.py - postHeight);
    ctx.lineTo(pBottom.px, pBottom.py - postHeight);
    ctx.stroke();

    ctx.restore();
  }

  private isColorClash(c1: string, c2: string): boolean {
    const parse = (c: string) => {
      let hex = c.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
      const num = parseInt(hex, 16);
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    };
    try {
      const c1Arr = parse(c1);
      const c2Arr = parse(c2);
      const dist = Math.hypot((c1Arr[0] ?? 0) - (c2Arr[0] ?? 0), (c1Arr[1] ?? 0) - (c2Arr[1] ?? 0), (c1Arr[2] ?? 0) - (c2Arr[2] ?? 0));
      return dist < 85;
    } catch {
      return false;
    }
  }

  /**
   * Futbolista Chibi con Cursor de Control Activo y Halos de Contraste
   */
  private drawChibiPlayer(ctx: CanvasRenderingContext2D, p: ChibiPlayer): void {
    const pos = this.toScreen(p.x, p.y, p.z);
    const kitColor = p.isGK ? '#facc15' : (p.team === 'home' ? this.homeKitColor : this.awayKitColor);
    const accentColor = p.isGK ? '#0f172a' : (p.team === 'home' ? this.homeAccentColor : this.awayAccentColor);
    const shortsColor = p.isGK ? '#1e293b' : accentColor;
    const isCarrier = this.ball.holder?.id === p.id;

    ctx.save();

    // Sombra en el césped (se encoge si salta)
    const shadowScale = Math.max(0.4, 1 - (p.z / 15));
    ctx.beginPath();
    ctx.ellipse(pos.px, pos.py + p.z + 2, 8 * shadowScale, 4 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // ── HALO / ANILLO DE EQUIPO EN EL CÉSPED (Identificación instantánea sin fatiga visual) ──
    ctx.beginPath();
    ctx.ellipse(pos.px, pos.py + p.z + 2, 9 * shadowScale, 4.5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.strokeStyle = p.team === 'home' ? 'rgba(0, 240, 255, 0.95)' : 'rgba(239, 68, 68, 0.95)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Animación de rebote o postura
    let bob = Math.sin(p.animStep) * 2.2;
    if (p.state === 'celebrating') {
      bob = -Math.abs(Math.sin(p.animStep * 2.5)) * 8;
    } else if (p.state === 'diving' || p.state === 'sliding') {
      bob = 6;
    }

    const py = pos.py + bob;

    // Piernas y botines
    const legSwing = Math.sin(p.animStep) * 4;
    ctx.fillStyle = shortsColor;
    ctx.fillRect(pos.px - 5, py - 7, 3.5, 6);
    ctx.fillRect(pos.px + 1.5, py - 7, 3.5, 6);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(pos.px - 6 + (p.state === 'running' ? legSwing * 0.4 : 0), py - 2, 4.5, 3);
    ctx.fillRect(pos.px + 1.5 - (p.state === 'running' ? legSwing * 0.4 : 0), py - 2, 4.5, 3);

    // Mangas contrastantes del uniforme
    ctx.fillStyle = accentColor;
    ctx.fillRect(pos.px - 7.5, py - 18, 2, 7);
    ctx.fillRect(pos.px + 5.5, py - 18, 2, 7);

    // Torso con camiseta del club
    ctx.fillStyle = kitColor;
    ctx.beginPath();
    ctx.roundRect(pos.px - 6, py - 18, 12, 12, 2.5);
    ctx.fill();

    // Cuello de la camiseta
    ctx.fillStyle = accentColor;
    ctx.fillRect(pos.px - 2.5, py - 18, 5, 2);

    // Dorsal
    ctx.fillStyle = accentColor === '#ffffff' ? '#ffffff' : '#000000';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(p.number), pos.px, py - 9);

    // Cabeza Chibi
    ctx.beginPath();
    ctx.arc(pos.px, py - 24, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = p.skinColor;
    ctx.fill();

    // Cabello
    ctx.beginPath();
    ctx.arc(pos.px, py - 26, 7.5, Math.PI, Math.PI * 2);
    ctx.fillStyle = p.hairColor;
    ctx.fill();

    // Ojos orientados
    const eyeOffsetX = p.facing * 2.2;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(pos.px + eyeOffsetX - 1.2, py - 24, 1.2, 0, Math.PI * 2);
    ctx.arc(pos.px + eyeOffsetX + 2.2, py - 24, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Brazos alzados si festeja
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

    // ── CURSOR DE JUGADOR ACTIVO EA FC / FIFA (PORTADOR DEL BALÓN) ──
    if (isCarrier) {
      const triY = py - 36 + Math.sin(this.gameTime * 7) * 2;
      const cursorColor = p.team === 'home' ? 'var(--accent-cyan, #00f0ff)' : '#ef4444';

      // Triángulo invertido de control
      ctx.fillStyle = cursorColor;
      ctx.beginPath();
      ctx.moveTo(pos.px, triY);
      ctx.lineTo(pos.px - 4.5, triY - 7);
      ctx.lineTo(pos.px + 4.5, triY - 7);
      ctx.closePath();
      ctx.fill();

      // Nametag flotante con dorsal y posición
      ctx.fillStyle = 'rgba(11, 19, 32, 0.88)';
      ctx.strokeStyle = cursorColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pos.px - 28, triY - 21, 56, 12, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 6.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${p.pos} · ${p.number}`, pos.px, triY - 12);
    }

    ctx.restore();
  }

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
