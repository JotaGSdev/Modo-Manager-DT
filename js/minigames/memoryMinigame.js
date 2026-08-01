// Minijuego 3: Memoria Táctica y Análisis del Rival

import { db } from '../data/db.js';
import { sfx } from '../../assets/audio/sfx.js';

export class MemoryMinigame {
  constructor(containerEl, onComplete) {
    this.container = containerEl;
    this.onComplete = onComplete;
    this.sequence = [];
    this.userSequence = [];
    this.level = 1;
    this.maxLevel = 3;

    this.initUI();
  }

  initUI() {
    this.container.innerHTML = `
      <div class="minigame-card">
        <h3>🧠 Memoria Táctica: Análisis del Rival</h3>
        <p>Memoriza la secuencia de fortalezas tácticas del rival y repítela correctamente.</p>
        <div id="sequenceDisplay" class="sequence-display">Pulsa "COMENZAR ANÁLISIS"</div>
        <div class="tactical-grid">
          <button class="tactical-btn" data-val="1">🛡️ Presión Alta</button>
          <button class="tactical-btn" data-val="2">⚡ Contragolpe</button>
          <button class="tactical-btn" data-val="3">🎯 Balón Parado</button>
          <button class="tactical-btn" data-val="4">🔄 Posesión</button>
        </div>
        <div class="minigame-controls">
          <button id="btnStartMemory" class="btn-primary">COMENZAR ANÁLISIS</button>
        </div>
      </div>
    `;

    document.querySelectorAll('.tactical-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleUserClick(parseInt(e.target.dataset.val)));
    });

    document.getElementById('btnStartMemory').addEventListener('click', () => this.startLevel());
  }

  startLevel() {
    document.getElementById('btnStartMemory').style.display = 'none';
    this.userSequence = [];
    this.sequence = [];

    for (let i = 0; i < this.level + 2; i++) {
      this.sequence.push(1 + Math.floor(Math.random() * 4));
    }

    this.playSequence();
  }

  playSequence() {
    const display = document.getElementById('sequenceDisplay');
    display.innerText = 'Observa la secuencia...';

    let index = 0;
    const interval = setInterval(() => {
      if (index >= this.sequence.length) {
        clearInterval(interval);
        display.innerText = '¡Tu turno! Repite la secuencia.';
        return;
      }
      const val = this.sequence[index];
      this.highlightButton(val);
      index++;
    }, 800);
  }

  highlightButton(val) {
    sfx.playClick();
    const btn = document.querySelector(`.tactical-btn[data-val="${val}"]`);
    if (btn) {
      btn.classList.add('active-highlight');
      setTimeout(() => btn.classList.remove('active-highlight'), 400);
    }
  }

  handleUserClick(val) {
    if (this.sequence.length === 0) return;
    this.highlightButton(val);
    this.userSequence.push(val);

    const stepIdx = this.userSequence.length - 1;
    if (this.userSequence[stepIdx] !== this.sequence[stepIdx]) {
      // Error
      document.getElementById('sequenceDisplay').innerText = '❌ Error en la secuencia táctica.';
      setTimeout(() => this.finish(false), 1000);
      return;
    }

    if (this.userSequence.length === this.sequence.length) {
      if (this.level < this.maxLevel) {
        this.level++;
        document.getElementById('sequenceDisplay').innerText = `¡Excelente! Pasando al Nivel ${this.level}`;
        setTimeout(() => this.startLevel(), 1200);
      } else {
        this.finish(true);
      }
    }
  }

  finish(success) {
    const bonus = success ? 10 : 3;
    db.gameState.matchBonus.moraleBonus += bonus;
    db.saveGame();

    this.container.innerHTML = `
      <div class="minigame-card">
        <h3>${success ? '🏆 ¡Análisis Táctico Perfecto!' : '📊 Análisis Parcial Completado'}</h3>
        <p>${success ? 'Descifraste totalmente el esquema rival.' : 'Obtuviste un análisis básico del oponente.'}</p>
        <p class="text-highlight">+${bonus}% Bonificación de Moral y Ventaja Táctica.</p>
        <button id="btnFinishMemory" class="btn-primary">Continuar al Dashboard</button>
      </div>
    `;

    document.getElementById('btnFinishMemory').addEventListener('click', () => {
      if (this.onComplete) this.onComplete();
    });
  }
}
