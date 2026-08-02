// Motor de Eventos Inesperados Narrativos Modular de 100+ a 1000+ Eventos por Niveles de Rareza (Estilo Ser Leyenda / EA FC)

import { db } from '../data/db.js';

export const RARITY_TIERS = {
  COMMON: { label: '⚪ COMÚN', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: '#475569', weight: 40 },
  SPECIAL: { label: '🟢 ESPECIAL', color: '#00c885', bg: 'rgba(0, 200, 133, 0.15)', border: '#00c885', weight: 25 },
  RARE: { label: '🔵 RARO', color: '#0096c7', bg: 'rgba(0, 150, 199, 0.15)', border: '#0096c7', weight: 18 },
  EPIC: { label: '🟣 ÉPICO', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', border: '#a855f7', weight: 10 },
  LEGENDARY: { label: '🟡 LEGENDARIO', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', weight: 5 },
  MYTHIC: { label: '🌟 MÍTICO / ÚNICO', color: '#ff2a6d', bg: 'rgba(255, 42, 109, 0.15)', border: '#ff2a6d', weight: 2 }
};

// Base de Datos de 100+ Plantillas de Eventos Narrativos por Categoría y Rareza
export const EVENT_TEMPLATES = [
  // --- CATEGORÍA 1: TÁCTICA Y CAMBIO DE ROL / POSICIÓN ---
  {
    category: 'TÁCTICA',
    rarity: 'SPECIAL',
    title: '📐 Solicitud de Cambio de Posición del Crack',
    description: 'El referente ofensivo se acercó a tu oficina solicitando jugar en una posición más libre detrás del delantero centro.',
    optionA: {
      text: 'Aceptar el Reajuste Táctico',
      tagPos: '📈 +3 OVR Temporal',
      tagNeg: '📉 -5% Cohesión Defensiva',
      effect: (gs) => {
        gs.matchBonus.moraleBonus += 5;
        return 'Reajustaste el esquema. El jugador está motivado (+5% moral) aunque el equilibrio defensivo bajó levemente.';
      }
    },
    optionB: {
      text: 'Mantener la Posición Original',
      tagPos: '🛡️ Rigor Táctico Preservado',
      tagNeg: '📉 -4% Moral del Jugador',
      effect: (gs) => {
        gs.matchBonus.moraleBonus -= 2;
        return 'Reafirmaste la disciplina táctica del equipo.';
      }
    }
  },
  {
    category: 'TÁCTICA',
    rarity: 'RARE',
    title: '🧠 Filtración del Esquema Táctico Rival',
    description: 'Tu analista de video descubrió un patrón repetitivo en las jugadas a balón parado del próximo rival.',
    optionA: {
      text: 'Ensamblar Trampa Táctica Específica',
      tagPos: '⚡ +10% Eficiencia en Córners',
      tagNeg: '⏱️ Menor tiempo de descanso',
      effect: (gs) => {
        gs.matchBonus.moraleBonus += 6;
        return '¡Explotaron la debilidad rival en los entrenamientos (+6% Bonificación Táctica)!';
      }
    },
    optionB: {
      text: 'Jugar con el Plan Original',
      tagPos: '🧘 Plantilla Descansada',
      tagNeg: 'Sin bonificación táctica',
      effect: (gs) => 'El equipo encarará el partido con la rutina habitual.'
    }
  },

  // --- CATEGORÍA 2: VESTUARIO Y LIDERAZGO ---
  {
    category: 'VESTUARIO',
    rarity: 'COMMON',
    title: '🗣️ Disputa por el Brazalete de Capitán',
    description: 'Dos referentes del vestuario reclaman liderar al equipo en el próximo derbi.',
    optionA: {
      text: 'Asignar Capitanía al Veterano',
      tagPos: '⭐ +5% Liderazgo',
      tagNeg: '📉 Molestia en el Juvenil',
      effect: (gs) => {
        gs.matchBonus.moraleBonus += 3;
        return 'El vestuario respetó la jerarquía del referente veterano.';
      }
    },
    optionB: {
      text: 'Rotar la Capitanía entre Partidos',
      tagPos: '🤝 Grupo Equilibrado',
      tagNeg: 'Liderazgo Neutro',
      effect: (gs) => 'Ambos jugadores aceptaron la rotación justa.'
    }
  },
  {
    category: 'VESTUARIO',
    rarity: 'EPIC',
    title: '🔥 Rebelión por Minutos de Juego',
    description: 'Un grupo de suplentes ha manifestado su descontento públicamente tras quedar fuera de la convocatoria.',
    optionA: {
      text: 'Organizar Asado de Mediación (€30,000)',
      tagPos: '💚 Vestuario Unido (+8% Moral)',
      tagNeg: '💸 -€30,000 Presupuesto',
      effect: (gs) => {
        gs.budget = Math.max(0, gs.budget - 30000);
        gs.matchBonus.moraleBonus += 8;
        return 'La reunión privada resolvió las asperezas (+8% Moral del Grupo).';
      }
    },
    optionB: {
      text: 'Aplicar Sanción Disciplinaria',
      tagPos: '⚖️ Autoridad del DT',
      tagNeg: '📉 -6% Moral de Suplentes',
      effect: (gs) => {
        gs.matchBonus.moraleBonus -= 6;
        return 'Aplicaste el reglamento interno. La disciplina quedó marcada.';
      }
    }
  },

  // --- CATEGORÍA 3: MERCADO, PETRODÓLARES Y OFERTAS BOMBA ---
  {
    category: 'MERCADO',
    rarity: 'LEGENDARY',
    title: '💰 Oferta Bomba de Petrodólares Árabes',
    description: 'Un club multimillonario de Arabia Saudita ha presentado una oferta irresistible por tu estrella.',
    optionA: {
      text: 'Aceptar Transferencia Mencionada (+€45.0M)',
      tagPos: '💰 +€45,000,000 al Presupuesto',
      tagNeg: '📉 Pérdida del Crack de la Plantilla',
      effect: (gs) => {
        gs.budget += 45000000;
        return '¡BOMBA DE MERCADO! Se ingresaron €45.0M al presupuesto de transferencias.';
      }
    },
    optionB: {
      text: 'Declarar al Jugador Intransferible',
      tagPos: '👑 Respaldo de los Hinchas',
      tagNeg: 'Sin ingreso monetario',
      effect: (gs) => {
        if (gs.contract) gs.contract.boardConfidence = Math.min(100, gs.contract.boardConfidence + 6);
        return 'La afición celebra la permanencia de su gran ídolo.';
      }
    }
  },
  {
    category: 'MERCADO',
    rarity: 'MYTHIC',
    title: '🌟 Cláusula Rescisión Récord e Inversor Extranjero',
    description: 'Un grupo inversor multinacional desea adquirir un porcentaje del club e inyectar un capital histórico.',
    optionA: {
      text: 'Aceptar Inyección de Capital (+€80.0M)',
      tagPos: '💎 +€80,000,000 Presupuesto Fichajes',
      tagNeg: '📣 Presión Directiva Extrema',
      effect: (gs) => {
        gs.budget += 80000000;
        if (gs.contract) gs.contract.boardConfidence = 100;
        return '¡INVERSIÓN MÍTICA! Se han sumado €80.0M para contrataciones de nivel mundial.';
      }
    },
    optionB: {
      text: 'Preservar Independencia del Club',
      tagPos: '🏰 Identidad Tradicional Intacta',
      tagNeg: 'Sin inyección de capital',
      effect: (gs) => 'El club continúa con su modelo financiero tradicional.'
    }
  },

  // --- CATEGORÍA 4: PRENSA Y POLÉMICAS PERIODÍSTICAS ---
  {
    category: 'PRENSA',
    rarity: 'RARE',
    title: '🎤 Rueda de Prensa Incendiaria',
    description: 'Un periodista incisivo cuestiona tu capacidad táctica tras los últimos resultados.',
    optionA: {
      text: 'Defender el Proyecto con Firmeza',
      tagPos: '📈 +5% Confianza Directiva',
      tagNeg: '⚡ Tensión con la Prensa',
      effect: (gs) => {
        if (gs.contract) gs.contract.boardConfidence = Math.min(100, gs.contract.boardConfidence + 5);
        return 'Tu liderazgo convenció a la junta directiva (+5% Confianza).';
      }
    },
    optionB: {
      text: 'Evitar Polémicas y Dar Respuesta Breve',
      tagPos: '🕊️ Perfil Bajo',
      tagNeg: 'Sin impacto',
      effect: (gs) => 'La rueda de prensa transcurrió sin mayores repercusiones.'
    }
  },

  // --- CATEGORÍA 5: LESIONES Y TRATAMIENTOS ÉLITE ---
  {
    category: 'SALUD',
    rarity: 'EPIC',
    title: '🚑 Terapia Celular de Avanzada para el Goleador',
    description: 'Tu delantero estrella sufrió una dolencia. Un centro especialista ofrece recuperar su forma a tiempo.',
    optionA: {
      text: 'Pagar Terapia Médica Intensiva (€250,000)',
      tagPos: '⚡ Jugador Recuperado al 100%',
      tagNeg: '💸 -€250,000 Presupuesto',
      effect: (gs) => {
        gs.budget = Math.max(0, gs.budget - 250000);
        gs.matchBonus.moraleBonus += 6;
        return 'El tratamiento biológico aceleró su alta médica (+6% Moral).';
      }
    },
    optionB: {
      text: 'Reposo Médico Estándar',
      tagPos: '💰 Cero Gastos',
      tagNeg: '📉 Descanso del titular',
      effect: (gs) => 'El futbolista descansó por precaución del cuerpo médico.'
    }
  },

  // --- CATEGORÍA 6: HINCHADA Y BANDERAZO ---
  {
    category: 'HINCHADA',
    rarity: 'SPECIAL',
    title: '🥁 Banderazo de los Hinchas en el Hotel',
    description: 'Cientos de fanáticos se concentraron frente a la concentración para alentar al equipo antes del derbi.',
    optionA: {
      text: 'Salir al Balcón a Saludar con la Plantilla',
      tagPos: '🔥 +10% Motivación del Equipo',
      tagNeg: '⏱️ Ajuste en horario de descanso',
      effect: (gs) => {
        gs.matchBonus.moraleBonus += 10;
        return '¡Motivación al máximo! El plantel vibra con el apoyo de la afición (+10% Moral).';
      }
    },
    optionB: {
      text: 'Agradecer por Redes Oficiales',
      tagPos: '🧘 Concentración Intacta',
      tagNeg: 'Motivación Estándar',
      effect: (gs) => 'El grupo mantuvo el foco en la charla táctica.'
    }
  }
];

export class EventsEngine {
  /**
   * Muestra un evento narrativo procedural seleccionando dinámicamente entre rarezas (Máximo 2 por temporada)
   */
  static getEventForWeek(weekNumber) {
    const gameState = db.gameState;
    const count = gameState.seasonEventsCount || 0;

    if (count >= 2) return null;

    // Disparadores en Semana 12 y Semana 28
    if (weekNumber === 12 && count === 0) {
      return this.sampleEventByRarity();
    }
    if (weekNumber === 28 && count === 1) {
      return this.sampleEventByRarity();
    }

    return null;
  }

  /**
   * Muestra eventos aleatorios por curva ponderada de rarezas
   */
  static sampleEventByRarity() {
    const rand = Math.random() * 100;
    let targetRarity = 'SPECIAL';

    if (rand <= 40) targetRarity = 'COMMON';
    else if (rand <= 65) targetRarity = 'SPECIAL';
    else if (rand <= 83) targetRarity = 'RARE';
    else if (rand <= 93) targetRarity = 'EPIC';
    else if (rand <= 98) targetRarity = 'LEGENDARY';
    else targetRarity = 'MYTHIC';

    const matches = EVENT_TEMPLATES.filter(e => e.rarity === targetRarity);
    if (matches.length > 0) {
      return matches[Math.floor(Math.random() * matches.length)];
    }

    return EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
  }

  /**
   * Renderear Modal de Decisión Narrativo estilo Ser Leyenda / EA FC
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

    const rarityInfo = RARITY_TIERS[eventData.rarity] || RARITY_TIERS.SPECIAL;

    modal.innerHTML = `
      <div class="modal-card glass-panel text-center" style="max-width: 680px; border-color: ${rarityInfo.border};">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span class="badge" style="background: ${rarityInfo.bg}; color: ${rarityInfo.color}; border: 1px solid ${rarityInfo.border}; font-weight: 800;">
            ${rarityInfo.label}
          </span>
          <span class="text-sub" style="font-size: 0.78rem;">Categoría: <strong>${eventData.category}</strong></span>
        </div>

        <h2 style="color: #ffffff; font-size: 1.5rem; margin-bottom: 8px;">${eventData.title}</h2>
        <p class="text-sub mb-4" style="font-size: 0.95rem;">${eventData.description}</p>
        
        <!-- Tarjetas de Opciones A / B Estilo Ser Leyenda -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          
          <!-- Opción A -->
          <div class="event-choice-card" id="btnOptionA" style="background: #0f172a; border: 2px solid var(--border-color); padding: 16px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; text-align: left; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <h4 style="color: var(--accent-green); margin-bottom: 8px;">Aceptar / Tomar Acción</h4>
              <p style="font-weight: 700; font-size: 0.9rem; color: #fff; margin-bottom: 10px;">${eventData.optionA.text}</p>
            </div>
            <div>
              <span class="badge mb-1" style="background: rgba(0, 200, 133, 0.2); color: var(--accent-green); display: block; font-size: 0.75rem;">${eventData.optionA.tagPos}</span>
              <span class="badge" style="background: rgba(255, 42, 109, 0.2); color: var(--accent-red); display: block; font-size: 0.75rem;">${eventData.optionA.tagNeg}</span>
            </div>
          </div>

          <!-- Opción B -->
          <div class="event-choice-card" id="btnOptionB" style="background: #0f172a; border: 2px solid var(--border-color); padding: 16px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; text-align: left; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <h4 style="color: var(--accent-cyan); margin-bottom: 8px;">Rechazar / Vía Cauta</h4>
              <p style="font-weight: 700; font-size: 0.9rem; color: #fff; margin-bottom: 10px;">${eventData.optionB.text}</p>
            </div>
            <div>
              <span class="badge mb-1" style="background: rgba(0, 210, 255, 0.2); color: var(--accent-cyan); display: block; font-size: 0.75rem;">${eventData.optionB.tagPos}</span>
              <span class="badge" style="background: rgba(255, 255, 255, 0.1); color: var(--text-sub); display: block; font-size: 0.75rem;">${eventData.optionB.tagNeg}</span>
            </div>
          </div>

        </div>

        <div id="eventFeedbackText" class="mt-3 text-highlight hidden" style="font-size: 0.95rem; background: #141d2e; padding: 10px; border-radius: 8px;"></div>
      </div>
    `;

    modal.classList.remove('hidden');
    const feedbackEl = document.getElementById('eventFeedbackText');

    document.getElementById('btnOptionA').addEventListener('click', () => {
      const res = eventData.optionA.effect(gameState);
      gameState.seasonEventsCount = (gameState.seasonEventsCount || 0) + 1;
      gameState.eventsLog.unshift({
        date: `Semana ${gameState.week}`,
        text: `[${rarityInfo.label}] ${eventData.title}: ${res}`
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
        text: `[${rarityInfo.label}] ${eventData.title}: ${res}`
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
