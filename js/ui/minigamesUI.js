// Vista Selector de Minijuegos de Habilidad y Memoria

import { PenaltyMinigame } from '../minigames/penaltyMinigame.js';
import { CounterMinigame } from '../minigames/counterMinigame.js';
import { MemoryMinigame } from '../minigames/memoryMinigame.js';
import { sfx } from '../../assets/audio/sfx.js';

export function renderMinigames(container, navigateTo) {
  container.innerHTML = `
    <div class="minigames-selector-layout">
      <div class="glass-panel text-center mb-4">
        <h2>🎮 Minijuegos de Entrenamiento y Habilidad</h2>
        <p class="text-sub">Completa entrenamientos para obtener bonificaciones estadísticas y aumentar las probabilidades de victoria en el próximo partido.</p>
      </div>

      <div class="minigames-grid">
        <!-- Minijuego 1: Penales -->
        <div class="minigame-select-card glass-panel">
          <div class="mg-icon">🎯</div>
          <h3>Lanzamiento de Penales</h3>
          <p>Prueba tu puntería para ganar bonificación de efectividad de gol.</p>
          <button id="btnPlayPenalty" class="btn-primary mt-3">JUGAR PENALES</button>
        </div>

        <!-- Minijuego 2: Contraataque -->
        <div class="minigame-select-card glass-panel">
          <div class="mg-icon">⚡</div>
          <h3>Timing de Contraataque</h3>
          <p>Filtra pases veloces en la zona objetivo para ganar bonificación de velocidad.</p>
          <button id="btnPlayCounter" class="btn-primary mt-3">JUGAR CONTRAATAQUE</button>
        </div>

        <!-- Minijuego 3: Memoria -->
        <div class="minigame-select-card glass-panel">
          <div class="mg-icon">🧠</div>
          <h3>Memoria Táctica del Rival</h3>
          <p>Analiza y memoriza los esquemas rivales para ganar ventaja táctica.</p>
          <button id="btnPlayMemory" class="btn-primary mt-3">JUGAR MEMORIA</button>
        </div>
      </div>

      <div id="minigameActiveContainer" class="mt-4"></div>
    </div>
  `;

  const activeContainer = document.getElementById('minigameActiveContainer');

  document.getElementById('btnPlayPenalty').addEventListener('click', () => {
    sfx.playClick();
    new PenaltyMinigame(activeContainer, () => navigateTo('dashboard'));
  });

  document.getElementById('btnPlayCounter').addEventListener('click', () => {
    sfx.playClick();
    new CounterMinigame(activeContainer, () => navigateTo('dashboard'));
  });

  document.getElementById('btnPlayMemory').addEventListener('click', () => {
    sfx.playClick();
    new MemoryMinigame(activeContainer, () => navigateTo('dashboard'));
  });
}
