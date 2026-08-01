// Motor de Eventos Inesperados y Noticias del Club

import { db } from '../data/db.js';

export const EVENT_TYPES = [
  {
    id: 'INJURY',
    title: '🚑 Lesión de Jugador Clave',
    description: 'Tu mediocampista estrella ha sufrido un esguince en el último entrenamiento.',
    type: 'negative',
    actionText: 'Asignar Fisioterapeuta Intensivo (€250,000)',
    applyEffect: (gameState) => {
      if (gameState.budget >= 250000) {
        gameState.budget -= 250000;
        return 'Gastaste €250,000 en recuperación rápida. El jugador estará recuperado para el próximo encuentro.';
      } else {
        gameState.matchBonus.moraleBonus -= 5;
        return 'No tenías suficiente presupuesto. La moral del equipo descendió temporalmente.';
      }
    }
  },
  {
    id: 'SPONSOR_BOOST',
    title: '💰 Patrocinio Sorpresa',
    description: 'Una marca multinacional ha quedado impresionada por el rendimiento del equipo y ofrece un bono de patrocinio inmediato.',
    type: 'positive',
    actionText: 'Aceptar Bono de Patrocinio (+€3,500,000)',
    applyEffect: (gameState) => {
      gameState.budget += 3500000;
      return '¡Inyección presupuestaria de €3,500,000 añadida al presupuesto del club!';
    }
  },
  {
    id: 'STAR_REQUEST',
    title: '⭐ Solicitud de Fichaje de Estrella',
    description: 'Debido a la gran reputación y popularidad de tu club, un destacado extremo internacional ha expresado su deseo de unirse a tu plantilla.',
    type: 'positive',
    actionText: 'Negociar Fichaje Preferencial',
    applyEffect: (gameState) => {
      gameState.matchBonus.moraleBonus += 8;
      return 'El entusiasmo por el posible fichaje ha elevado la moral de la plantilla (+8%).';
    }
  },
  {
    id: 'STAFF_LEAVE',
    title: '📋 Salida de Personal Técnico',
    description: 'Tu analista táctico principal ha aceptado una oferta de un club extranjero y ha dejado el cuerpo técnico.',
    type: 'negative',
    actionText: 'Contratar Nuevo Analista (€150,000)',
    applyEffect: (gameState) => {
      if (gameState.budget >= 150000) {
        gameState.budget -= 150000;
        return 'Contrataste a un nuevo especialista de nivel internacional.';
      } else {
        gameState.matchBonus.tacticalBonus -= 4;
        return 'Sin reemplazo inmediato, el equipo pierde -4% de efectividad táctica.';
      }
    }
  },
  {
    id: 'PRESS_CONF',
    title: '🎤 Rueda de Prensa Polémica',
    description: 'La prensa deportiva cuestiona tus planteamientos tácticos antes del próximo partido decisivo.',
    type: 'neutral',
    actionText: 'Responder con Confianza',
    applyEffect: (gameState) => {
      gameState.matchBonus.moraleBonus += 5;
      return 'Tu firmeza en la rueda de prensa transmitió seguridad al grupo (+5% moral).';
    }
  }
];

export class EventsEngine {
  /**
   * Intenta detonar un evento aleatorio al avanzar la fecha/semana
   */
  static triggerRandomEvent() {
    const chance = Math.random();
    if (chance > 0.40) return null; // 40% de probabilidad de evento por fecha

    const selected = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
    return selected;
  }
}
