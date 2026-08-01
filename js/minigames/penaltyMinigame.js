// Minijuego 1: Lanzamiento de Penales y Tiros Libres (Canvas HTML5)

import { db } from '../data/db.js';
import { sfx } from '../../assets/audio/sfx.js';

export class PenaltyMinigame {
  constructor(containerEl, onComplete) {
    this.container = containerEl;
    this.onComplete = onComplete;
    this.canvas = null;
    this.ctx = null;

    this.ballX = 200;
    this.ballY = 260;
    this.targetX = 200;
    this.targetSpeed = 4;
    this.targetDir = 1;

    this.score = 0;
    this.attempts = 0;
    this.maxAttempts = 3;
    this.isShooting = false;
    this.animId = null;

    this.initUI();
  }

  initUI() {
    this.container.innerHTML = `
      <div class="minigame-card">
        <h3>🎯 Minijuego de Habilidad: Penales</h3>
        <p>Ajusta el apuntador móvil y haz clic en "DISPARAR" en el centro para convertir el penal.</p>
        <canvas id="penaltyCanvas" width="400" height="300"></canvas>
        <div class="minigame-controls">
          <button id="btnShoot" class="btn-primary">⚽ DISPARAR</button>
        </div>
        <div id="penaltyStatus" class="minigame-status">Intentos: 0/3 | Goles: 0</div>
      </div>
    `;

    this.canvas = document.getElementById('penaltyCanvas');
    this.ctx = this.canvas.getContext('2d');

    document.getElementById('btnShoot').addEventListener('click', () => this.shoot());
    this.startLoop();
  }

  startLoop() {
    const loop = () => {
      this.update();
      this.draw();
      this.animId = requestAnimationFrame(loop);
    };
    loop();
  }

  update() {
    if (!this.isShooting) {
      this.targetX += this.targetSpeed * this.targetDir;
      if (this.targetX > 350 || this.targetX < 50) {
        this.targetDir *= -1;
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, 400, 300);

    // Fondo del arco
    this.ctx.fillStyle = '#1e3a1e';
    this.ctx.fillRect(0, 0, 400, 300);

    // Poste y red
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 6;
    this.ctx.strokeRect(60, 60, 280, 160);

    // Red
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    for (let x = 60; x <= 340; x += 15) {
      this.ctx.beginPath(); this.ctx.moveTo(x, 60); this.ctx.lineTo(x, 220); this.ctx.stroke();
    }
    for (let y = 60; y <= 220; y += 15) {
      this.ctx.beginPath(); this.ctx.moveTo(60, y); this.ctx.lineTo(340, y); this.ctx.stroke();
    }

    // Objetivo móvil (Cruz de mira)
    this.ctx.strokeStyle = '#ffcc00';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(this.targetX, 140, 18, 0, Math.PI * 2);
    this.ctx.stroke();

    // Balón
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(this.ballX, this.ballY, 12, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#000000';
    this.ctx.stroke();
  }

  shoot() {
    if (this.isShooting || this.attempts >= this.maxAttempts) return;
    this.isShooting = true;
    sfx.playWhistle();

    // Determinar si es gol (si el blanco está cerca del centro o esquinas)
    const isGoal = (this.targetX >= 70 && this.targetX <= 140) || (this.targetX >= 260 && this.targetX <= 330);

    setTimeout(() => {
      this.attempts++;
      if (isGoal) {
        this.score++;
        sfx.playGoal();
      }
      
      document.getElementById('penaltyStatus').innerText = `Intentos: ${this.attempts}/3 | Goles: ${this.score}`;
      this.isShooting = false;

      if (this.attempts >= this.maxAttempts) {
        cancelAnimationFrame(this.animId);
        this.finish();
      }
    }, 400);
  }

  finish() {
    const bonus = this.score * 3; // Hasta +9% bonus
    db.gameState.matchBonus.penaltyBonus = bonus;
    db.saveGame();

    this.container.innerHTML = `
      <div class="minigame-card">
        <h3>🎉 ¡Minijuego Completado!</h3>
        <p>Anotaste ${this.score}/3 goles.</p>
        <p class="text-highlight">+${bonus}% Bonificación de Efectividad de Gol en el próximo partido.</p>
        <button id="btnFinishMinigame" class="btn-primary">Continuar al Dashboard</button>
      </div>
    `;

    document.getElementById('btnFinishMinigame').addEventListener('click', () => {
      if (this.onComplete) this.onComplete();
    });
  }
}
