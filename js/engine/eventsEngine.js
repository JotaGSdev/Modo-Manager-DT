// Motor de Eventos Inesperados Narrativos con Decisiones Interactivas y Disparador Garantizado

import { db } from '../data/db.js';

export const NARRATIVE_EVENTS = [
  {
    id: 'INJURY_STRIKER',
    weeks: [4, 23],
    title: '🚑 Molestia Física del Goleador',
    description: 'Tu delantero principal sintió un tirón muscular en la última práctica antes del próximo encuentro.',
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
    weeks: [9, 28],
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
  },
  {
    id: 'DRESSING_ROOM_DISPUTE',
    weeks: [14, 32],
    title: '🗣️ Conflicto en el Vestuario',
    description: 'Dos referentes de la plantilla tuvieron una acalorada discusión sobre los minutos de juego tras la sesión táctica.',
    optionA: {
      text: 'Organizar Cena de Mediación y Grupo (€50,000)',
      effect: (gameState) => {
        gameState.budget = Math.max(0, gameState.budget - 50000);
        gameState.matchBonus.moraleBonus += 8;
        return 'La reunión sirvió para unir al grupo. La moral de la plantilla subió +8%.';
      }
    },
    optionB: {
      text: 'Aplicar Reglamento Interno y Multar (-10% Moral, +€100K)',
      effect: (gameState) => {
        gameState.budget += 100000;
        gameState.matchBonus.moraleBonus -= 6;
        return 'Se recaudaron €100K en multas, pero el ambiente en el vestuario quedó tenso (-6% moral).';
      }
    }
  },
  {
    id: 'PRESS_RUMOR',
    weeks: [17, 36],
    title: '🎤 Rueda de Prensa y Rumores de Mercado',
    description: 'La prensa deportiva cuestiona tus planteamientos tácticos e indaga sobre un supuesto rumor de salida de tu figura.',
    optionA: {
      text: 'Reafirmar Compromiso y Proyecto (+5% Confianza)',
      effect: (gameState) => {
        if (gameState.contract) gameState.contract.boardConfidence = Math.min(100, gameState.contract.boardConfidence + 5);
        return 'Tu firmeza en la rueda de prensa transmitió seguridad al club (+5% Confianza Directiva).';
      }
    },
    optionB: {
      text: 'Exigir Más Inversión a la Directiva (+€1.5M)',
      effect: (gameState) => {
        gameState.budget += 1500000;
        return 'La directiva reaccionó inyectando €1.5M adicionales al presupuesto.';
      }
    }
  }
];

export class EventsEngine {
  /**
   * Determina si debe detonarse un evento narrativo en la semana dada
   */
  static getEventForWeek(weekNumber) {
    const fixedWeeks = [4, 9, 14, 17, 23, 28, 32, 36];
    
    // Si es una semana clave de la temporada, retornar evento narrativo garantizado
    const matchEvent = NARRATIVE_EVENTS.find(e => e.weeks.includes(weekNumber));
    if (matchEvent) {
      return matchEvent;
    }

    // De lo contrario, 25% de probabilidad aleatoria en semanas ordinarias
    if (Math.random() < 0.25) {
      const randomIndex = Math.floor(Math.random() * NARRATIVE_EVENTS.length);
      return NARRATIVE_EVENTS[randomIndex];
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
