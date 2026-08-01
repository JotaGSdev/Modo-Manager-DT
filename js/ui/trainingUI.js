// Vista de Preparación Táctica y Planificación Semanal 100% Simulada por Gestión y Azar

import { db } from '../data/db.js';

export function renderTraining(container, navigateTo) {
  const gameState = db.gameState;
  const userTeam = db.teams[gameState.userTeamId] || { name: 'Mi Club' };

  const renderContent = () => {
    const bonus = gameState.matchBonus || { moraleBonus: 0, tacticalBonus: 0, penaltyBonus: 0 };

    container.innerHTML = `
      <div class="training-layout">
        <!-- Encabezado de Planificación -->
        <div class="glass-panel text-center mb-4">
          <h2>🧠 Preparación Táctica y Planificación Semanal</h2>
          <p class="text-sub">Experiencia 100% basada en gestión directiva, azar y decisiones estratégicas de entrenador. Sin minijuegos arcade ni mecánicas de habilidad manual.</p>
        </div>

        <!-- Estado de Bonificaciones de Gestión Actuales -->
        <div class="glass-panel mb-4">
          <h3>📊 Bonificaciones Acumuladas para la Próxima Jornada</h3>
          <div class="bonus-badges mt-3">
            <div class="bonus-item">
              <span>⚽ Efectividad de Ataque:</span>
              <strong class="text-highlight">+${bonus.moraleBonus || 0}%</strong>
            </div>
            <div class="bonus-item">
              <span>🛡️ Solidez Defensiva:</span>
              <strong class="text-highlight">+${bonus.tacticalBonus || 0}%</strong>
            </div>
            <div class="bonus-item">
              <span>🗣️ Moral de la Plantilla:</span>
              <strong class="text-highlight">${Math.min(100, 80 + (bonus.moraleBonus || 0))}%</strong>
            </div>
          </div>
        </div>

        <!-- Opciones de Gestión y Preparación -->
        <div class="glass-panel">
          <h3>📋 Decisiones Semanales del Director Técnico</h3>
          <p class="text-sub mb-3">Elige la orientación del trabajo semanal para ${userTeam.name}. El resultado se simula automáticamente en función del azar y la reputación:</p>

          <div class="region-buttons-grid">
            <button id="btnTrainAttack" class="btn-region">
              ⚽ Enfoque Ofensivo (Simular +Efectividad)
            </button>
            <button id="btnTrainDefense" class="btn-region">
              🛡️ Bloque Defensivo (Simular +Solidez)
            </button>
            <button id="btnTrainMorale" class="btn-region">
              🗣️ Charla Motivacional (Simular +Moral)
            </button>
          </div>

          <div id="trainingFeedback" class="mt-4 text-center text-highlight hidden"></div>
        </div>
      </div>
    `;

    const feedbackEl = document.getElementById('trainingFeedback');

    // Enfoque Ofensivo
    document.getElementById('btnTrainAttack').addEventListener('click', () => {
      const success = Math.random() < 0.70;
      gameState.matchBonus = gameState.matchBonus || {};
      if (success) {
        gameState.matchBonus.moraleBonus = (gameState.matchBonus.moraleBonus || 0) + 4;
        feedbackEl.innerText = '✅ ¡Planificación ofensiva ejecutada con éxito! La efectividad de ataque aumentó +4% para el próximo partido.';
      } else {
        feedbackEl.innerText = '⚠️ Práctica intensa con disparos desviados. Avance de efectividad estándar (+1%).';
        gameState.matchBonus.moraleBonus = (gameState.matchBonus.moraleBonus || 0) + 1;
      }
      feedbackEl.classList.remove('hidden');
      db.saveGame();
      setTimeout(renderContent, 1800);
    });

    // Bloque Defensivo
    document.getElementById('btnTrainDefense').addEventListener('click', () => {
      const success = Math.random() < 0.75;
      gameState.matchBonus = gameState.matchBonus || {};
      if (success) {
        gameState.matchBonus.tacticalBonus = (gameState.matchBonus.tacticalBonus || 0) + 5;
        feedbackEl.innerText = '✅ ¡Bloque táctico defensivo consolidado! Solidez en marca mejorada +5%.';
      } else {
        feedbackEl.innerText = '⚠️ Ajustes defensivos con algunos desacoples. Mejora menor (+2%).';
        gameState.matchBonus.tacticalBonus = (gameState.matchBonus.tacticalBonus || 0) + 2;
      }
      feedbackEl.classList.remove('hidden');
      db.saveGame();
      setTimeout(renderContent, 1800);
    });

    // Charla Motivacional
    document.getElementById('btnTrainMorale').addEventListener('click', () => {
      const moraleBoost = 5 + Math.floor(Math.random() * 6);
      gameState.matchBonus = gameState.matchBonus || {};
      gameState.matchBonus.moraleBonus = (gameState.matchBonus.moraleBonus || 0) + moraleBoost;
      feedbackEl.innerText = `💬 ¡Charla técnica inspiradora! La moral de la plantilla subió un +${moraleBoost}%.`;
      feedbackEl.classList.remove('hidden');
      db.saveGame();
      setTimeout(renderContent, 1800);
    });
  };

  renderContent();
}
