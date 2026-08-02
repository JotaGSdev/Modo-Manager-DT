// Motor de Eventos Inesperados Narrativos con Decisiones Interactivas (Máximo 2 Eventos por Temporada)

import { db } from '../data/db.js';

export const NARRATIVE_EVENTS = [
  {
    id: 'INJURY_STRIKER',
    weekTarget: 12,
    title: '🚑 Molestia Física del Goleador',
    description: 'Tu delantero principal sintió un tirón muscular en la última práctica antes del próximo encuentro de liga.',
    optionA: {
      text: 'Tratamiento Intensivo Especial (€200,000)',
      effect: (gameState) => {
        if (gameState.budget >= 200000) {
          gameState.budget -= 200000;
          return 'Gastaste €200,000 en terapia celular rápida. El jugador se recuperó a tiempo para el partido.';
        } else {
          gameState.matchBonus.moraleBonus -= 5;
          return 'Presupuesto insuficiente. El jugador descansó y la moral del grupo bajó -5%.';
        }
      }
    },
    optionB: {
      text: 'Dar Descanso y Usar Reserva (Gratis)',
      effect: (gameState) => {
        gameState.matchBonus.moraleBonus += 3;
        return 'El grupo valoró la prudencia del DT. La moral aumentó +3%.';
      }
    }
  },
  {
    id: 'SPONSOR_BONUS',
    weekTarget: 28,
    title: '💰 Patrocinio Sorpresa Regional',
    description: 'Una marca multinacional ha quedado impresionada por el estilo de juego de tu equipo y ofrece un patrocinio inmediato.',
    optionA: {
      text: 'Aceptar Patrocinio Exclusivo (+€3,000,000)',
      effect: (gameState) => {
        gameState.budget += 3000000;
        return '¡Se han ingresado €3.0M al presupuesto de traspasos del club!';
      }
    },
    optionB: {
      text: 'Rechazar para Preservar la Camiseta (+Confianza)',
      effect: (gameState) => {
        if (gameState.contract) gameState.contract.boardConfidence = Math.min(100, gameState.contract.boardConfidence + 5);
        return 'La junta directiva valoró el respeto a la tradición (+5% Confianza Directiva).';
      }
    }
  }
];

export class EventsEngine {
  /**
   * Determina si debe detonarse un evento narrativo en la semana dada (Máximo 2 por temporada)
   */
  static getEventForWeek(weekNumber) {
    const gameState = db.gameState;
    const count = gameState.seasonEventsCount || 0;

    // Límite estricto: Máximo 2 eventos por temporada
    if (count >= 2) {
      return null;
    }

    // Evento 1: Semana 12 | Evento 2: Semana 28
    if (weekNumber === 12 && count === 0) {
      return NARRATIVE_EVENTS[0];
    }

    if (weekNumber === 28 && count === 1) {
      return NARRATIVE_EVENTS[1];
    }

    return null;
  }

  /**
   * Muestra el Modal Narrativo interactivo y procesa la decisión del DT
   */
  static renderEventModal(eventData, onChoiceMade) {
    const gameState = db.gameState;

    let modal = document.getElementById('narrativeEventModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'narrativeEventModal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-card glass-panel text-center">
        <h2 style="color: var(--accent-gold);">${eventData.title}</h2>
        <p class="text-sub mt-2 mb-3" style="font-size: 1.05rem;">${eventData.description}</p>
        
        <div class="event-choices mt-4" style="display: flex; flex-direction: column; gap: 12px;">
          <button id="btnOptionA" class="btn-primary btn-large" style="width: 100%;">
            👉 ${eventData.optionA.text}
          </button>
          <button id="btnOptionB" class="btn-secondary btn-large" style="width: 100%;">
            👉 ${eventData.optionB.text}
          </button>
        </div>

        <div id="eventFeedbackText" class="mt-3 text-highlight hidden"></div>
      </div>
    `;

    modal.classList.remove('hidden');

    const feedbackEl = document.getElementById('eventFeedbackText');

    document.getElementById('btnOptionA').addEventListener('click', () => {
      const res = eventData.optionA.effect(gameState);
      gameState.seasonEventsCount = (gameState.seasonEventsCount || 0) + 1;
      gameState.eventsLog.unshift({
        date: `Semana ${gameState.week}`,
        text: `${eventData.title}: ${res}`
      });
      db.saveGame();

      feedbackEl.innerText = res;
      feedbackEl.classList.remove('hidden');

      setTimeout(() => {
        modal.classList.add('hidden');
        if (onChoiceMade) onChoiceMade();
      }, 1600);
    });

    document.getElementById('btnOptionB').addEventListener('click', () => {
      const res = eventData.optionB.effect(gameState);
      gameState.seasonEventsCount = (gameState.seasonEventsCount || 0) + 1;
      gameState.eventsLog.unshift({
        date: `Semana ${gameState.week}`,
        text: `${eventData.title}: ${res}`
      });
      db.saveGame();

      feedbackEl.innerText = res;
      feedbackEl.classList.remove('hidden');

      setTimeout(() => {
        modal.classList.add('hidden');
        if (onChoiceMade) onChoiceMade();
      }, 1600);
    });
  }
}
