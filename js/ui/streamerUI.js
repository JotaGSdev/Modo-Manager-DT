// Módulo para Creadores de Contenido y Transmisiones en Vivo (Kick, YouTube, Twitch)

import { db } from '../data/db.js';
import { sfx } from '../../assets/audio/sfx.js';

export class StreamerManager {
  static isStreamerModeActive = false;

  static toggleStreamerMode() {
    this.isStreamerModeActive = !this.isStreamerModeActive;
    if (this.isStreamerModeActive) {
      document.body.classList.add('streamer-mode');
      sfx.playGoal();
    } else {
      document.body.classList.remove('streamer-mode');
      sfx.playClick();
    }
    return this.isStreamerModeActive;
  }

  /**
   * Dispara una consulta interactiva en pantalla para la audiencia del directo
   */
  static triggerChatPoll(title, optionA, optionB, onVoteComplete) {
    const existing = document.getElementById('chatPollOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'chatPollOverlay';
    overlay.className = 'chat-poll-overlay';

    let timerSec = 30;
    let votesA = 0;
    let votesB = 0;

    overlay.innerHTML = `
      <div class="chat-poll-header">
        <h4>💬 DECISIÓN DEL CHAT (Kick / Twitch / YT)</h4>
        <span id="pollTimer" class="chat-poll-timer">${timerSec}s</span>
      </div>
      <p style="font-size: 0.9rem; margin-bottom: 10px;">${title}</p>

      <button id="btnVoteA" class="poll-option-btn">
        <span>A: ${optionA}</span>
        <span id="pctA">50%</span>
      </button>
      <div id="barA" class="poll-vote-bar" style="width: 50%;"></div>

      <button id="btnVoteB" class="poll-option-btn">
        <span>B: ${optionB}</span>
        <span id="pctB">50%</span>
      </button>
      <div id="barB" class="poll-vote-bar" style="width: 50%; background: var(--accent-cyan);"></div>
    `;

    document.body.appendChild(overlay);
    sfx.playWhistle();

    // Simular votaciones en tiempo real del chat
    const voteInterval = setInterval(() => {
      if (Math.random() < 0.7) votesA += 1 + Math.floor(Math.random() * 3);
      if (Math.random() < 0.7) votesB += 1 + Math.floor(Math.random() * 3);
      
      const total = Math.max(1, votesA + votesB);
      const pctA = Math.round((votesA / total) * 100);
      const pctB = 100 - pctA;

      const elA = document.getElementById('pctA');
      const elB = document.getElementById('pctB');
      const barA = document.getElementById('barA');
      const barB = document.getElementById('barB');

      if (elA && elB && barA && barB) {
        elA.innerText = `${pctA}%`;
        elB.innerText = `${pctB}%`;
        barA.style.width = `${pctA}%`;
        barB.style.width = `${pctB}%`;
      }
    }, 400);

    const timerInterval = setInterval(() => {
      timerSec--;
      const timerEl = document.getElementById('pollTimer');
      if (timerEl) timerEl.innerText = `${timerSec}s`;

      if (timerSec <= 0) {
        clearInterval(timerInterval);
        clearInterval(voteInterval);
        sfx.playGoal();

        const winner = votesA >= votesB ? 'A' : 'B';
        const winnerText = winner === 'A' ? optionA : optionB;

        alert(`🗳️ ¡VOTACIÓN FINALIZADA! La audiencia decidió la Opción ${winner}: "${winnerText}".`);
        overlay.remove();
        if (onVoteComplete) onVoteComplete(winner);
      }
    }, 1000);

    document.getElementById('btnVoteA').addEventListener('click', () => { votesA += 5; sfx.playClick(); });
    document.getElementById('btnVoteB').addEventListener('click', () => { votesB += 5; sfx.playClick(); });
  }
}
