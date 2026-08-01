// Minijuego 2: Timing Táctico de Contraataque

import { db } from '../data/db.js';
import { sfx } from '../../assets/audio/sfx.js';

export class CounterMinigame {
  constructor(containerEl, onComplete) {
    this.container = containerEl;
    this.onComplete = onComplete;
    this.progress = 0;
    this.direction = 1;
    this.passesMade = 0;
    this.successfulPasses = 0;
    this.maxPasses = 3;
    this.animId = null;

    this.initUI();
  }

  initUI() {
    this.container.innerHTML = `
      <div class="minigame-card">
        <h3>⚡ Táctica de Contraataque Veloz</h3>
        <p>Haz clic en "FILTRAR PASE" cuando la barra esté en la Zona Verde para armar el contragolpe perfecto.</p>
        <div class="timing-bar-container">
          <div class="timing-target-zone"></div>
          <div id="timingIndicator" class="timing-indicator"></div>
        </div>
        <div class="minigame-controls">
          <button id="btnPass" class="btn-primary">⚽ FILTRAR PASE</button>
        </div>
        <div id="counterStatus" class="minigame-status">Pases Completados: 0/3</div>
      </div>
    `;

    document.getElementById('btnPass').addEventListener('click', () => this.executePass());
    this.startLoop();
  }

  startLoop() {
    const loop = () => {
      this.progress += 2.5 * this.direction;
      if (this.progress >= 100 || this.progress <= 0) {
        this.direction *= -1;
      }
      const indicator = document.getElementById('timingIndicator');
      if (indicator) {
        indicator.style.left = `${this.progress}%`;
      }
      this.animId = requestAnimationFrame(loop);
    };
    loop();
  }

  executePass() {
    if (this.passesMade >= this.maxPasses) return;

    sfx.playClick();
    // La zona verde está entre 40% y 60%
    const isSuccess = this.progress >= 40 && this.progress <= 60;
    this.passesMade++;

    if (isSuccess) {
      this.successfulPasses++;
      sfx.playGoal();
    }

    document.getElementById('counterStatus').innerText = `Pases Completados: ${this.successfulPasses}/${this.passesMade}`;

    if (this.passesMade >= this.maxPasses) {
      cancelAnimationFrame(this.animId);
      this.finish();
    }
  }

  finish() {
    const bonus = this.successfulPasses * 4; // Hasta +12% velocidad de contragolpe
    db.gameState.matchBonus.tacticalBonus = bonus;
    db.saveGame();

    this.container.innerHTML = `
      <div class="minigame-card">
        <h3>🚀 ¡Táctica Perfeccionada!</h3>
        <p>Completaste ${this.successfulPasses}/3 pases filtrados.</p>
        <p class="text-highlight">+${bonus}% Bonificación de Velocidad de Contraataque en el próximo partido.</p>
        <button id="btnFinishCounter" class="btn-primary">Continuar al Dashboard</button>
      </div>
    `;

    document.getElementById('btnFinishCounter').addEventListener('click', () => {
      if (this.onComplete) this.onComplete();
    });
  }
}
