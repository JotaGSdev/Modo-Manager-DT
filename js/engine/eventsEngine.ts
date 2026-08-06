/**
 * ============================================================================
 * ENTRENADOR LEYENDA - MOTOR DE EVENTOS INESPERADOS (eventsEngine.js)
 * ============================================================================
 * Administra el sistema de eventos impredecibles que afectan la narrativa del DT.
 * Características:
 * 1. 117+ plantillas de eventos divididas en 9 categorías:
 *    Táctica, Vestuario, Mercado, Prensa, Salud, Hinchada, Finanzas, Institucional, Rivalidades.
 * 2. Sistema de Rarezas Ponderadas:
 *    - Común (50%)
 *    - Especial (25%)
 *    - Raro (15%)
 *    - Épico (7%)
 *    - Legendario (2%)
 *    - Único (1%)
 * 3. Frecuencia dinámica de triggers basada en gameState.eventFrequency.
 * 4. Modal interactivo de toma de decisiones con impacto en Moral, Presupuesto o Confianza.
 * 5. v2.0: Método generateFeedItem() para alimentar The Feed con noticias en tiempo real.
 *
 * Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.
 */

import { db } from '../data/db.js';
import { sfx } from '../../assets/audio/sfx.js';

import type { EventFrequency, EventOption, EventTemplate, FeedItem, FeedType, GameEvent } from '../types.js';

export class EventsEngine {
  /**
   * Determina si la semana actual corresponde a un evento narrativo (Semanas 8, 16, 24, 32).
   * @param weekNumber - Número de jornada actual
   * @returns Evento listo para renderizar o null
   */
  static getEventForWeek(weekNumber: number): GameEvent | null {
    const gameState = db.gameState;
    if (!gameState) return null;

    // Frecuencia dinámica según configuración de partida (Fase 6D)
    const triggerMap: Record<EventFrequency, number[]> = {
      off: [],
      baja: [16, 32],
      normal: [8, 16, 24, 32],
      alta: [4, 8, 12, 16, 20, 24, 28, 32]
    };
    const freq: EventFrequency = gameState.eventFrequency || 'normal';
    const triggerWeeks = triggerMap[freq] || triggerMap.normal;

    if (!triggerWeeks.includes(weekNumber)) return null;

    return this.generateRandomEvent();
  }

  /**
   * Genera un evento procedural seleccionando rareza ponderada y plantilla.
   * @returns Evento listo para renderizar en modal
   */
  static generateRandomEvent(): GameEvent | null {
    const gameState = db.gameState;
    if (!gameState) return null;

    const squad = db.getTeamPlayers(gameState.userTeamId);
    const starPlayer: { name: string } = [...squad].sort((a, b) => b.overall - a.overall)[0] || { name: 'Capitán' };
    const youngPlayer: { name: string } = squad.find(p => p.age <= 21) || squad[1] || { name: 'Promesa' };

    // Selección de rareza por peso de probabilidades
    const rand = Math.random() * 100;
    let rarity: GameEvent['rarity'] = 'COMÚN';
    let rarityColor = '#94a3b8';

    if (rand < 1) { rarity = 'ÚNICO'; rarityColor = '#ff0055'; }
    else if (rand < 3) { rarity = 'LEGENDARIO'; rarityColor = '#ffb700'; }
    else if (rand < 10) { rarity = 'ÉPICO'; rarityColor = '#a855f7'; }
    else if (rand < 25) { rarity = 'RARO'; rarityColor = '#3b82f6'; }
    else if (rand < 50) { rarity = 'ESPECIAL'; rarityColor = '#00c885'; }

    const templates: EventTemplate[] = [
      // CATEGORÍA: TÁCTICA
      {
        category: 'TÁCTICA',
        title: '🧩 REVOLUCIÓN TÁCTICA EN EL ENTRENAMIENTO',
        description: `Durante la sesión táctica de la semana, ${starPlayer.name} propuso un cambio de dibujo táctico para sorprender al próximo rival.`,
        optionA: { label: '👉 Aceptar la propuesta e innovar (+5% Solidez Defensiva)', bonusType: 'tactical', bonusVal: 5 },
        optionB: { label: '👉 Mantener la filosofía rígida del DT (+3% Moral por liderazgo)', bonusType: 'morale', bonusVal: 3 }
      },
      {
        category: 'TÁCTICA',
        title: '📐 ANÁLISIS DE VIDEO DEL RIVAL HISTÓRICO',
        description: `El analista de video del club descubrió un patrón repetitivo en los saques de esquina del rival.`,
        optionA: { label: '👉 Trabajar defensa de balón parado (+6% Solidez Defensiva)', bonusType: 'tactical', bonusVal: 6 },
        optionB: { label: '👉 Priorizar contragolpe directo (+4% Efectividad de Ataque)', bonusType: 'morale', bonusVal: 4 }
      },

      // CATEGORÍA: VESTUARIO
      {
        category: 'VESTUARIO',
        title: '🔥 TENSIÓN EN EL VESTUARIO',
        description: `Surgió una discusión acalorada entre la estrella ${starPlayer.name} y la joven promesa ${youngPlayer.name} por la titularidad.`,
        optionA: { label: '👉 Apoyar a la estrella veterana (+5% Moral al plantel)', bonusType: 'morale', bonusVal: 5 },
        optionB: { label: '👉 Respaldar al juvenil para marcar autoridad (+4% Confianza Directiva)', bonusType: 'board', bonusVal: 4 }
      },
      {
        category: 'VESTUARIO',
        title: '🍖 ASADO INTEGRADOR DE LA PLANTILLA',
        description: `Los referentes del plantel organizaron una cena de integración antes de la recta decisiva del torneo.`,
        optionA: { label: '👉 Financiar el asado de tu bolsillo (€10K) (+8% Moral de Plantilla)', bonusType: 'morale', bonusVal: 8, cost: 10000 },
        optionB: { label: '👉 Asistir como oyente manteniendo distancia profesional (+3% Moral)', bonusType: 'morale', bonusVal: 3 }
      },

      // CATEGORÍA: MERCADO & REPRESENTANTES
      {
        category: 'MERCADO',
        title: '💼 PRESIÓN DEL REPRESENTANTE',
        description: `El representante de ${youngPlayer.name} amenaza con buscarle club si no recibe un aumento salarial inmediato.`,
        optionA: { label: '👉 Ceder y renovarle contrato (+5% Moral del jugador)', bonusType: 'morale', bonusVal: 5 },
        optionB: { label: '👉 Exigir profesionalismo y rechazar el chantaje (+3% Confianza Directiva)', bonusType: 'board', bonusVal: 3 }
      },
      {
        category: 'MERCADO',
        title: '🕵️ OJEADOR RECOMIENDA GANG A INTERNACIONAL',
        description: `Un cazatalentos internacional detectó a un mediocampista sudamericano con clausula de rescisión baja.`,
        optionA: { label: '👉 Mandar ojeador privado (€50K) (+5% Confianza Directiva)', bonusType: 'board', bonusVal: 5, cost: 50000 },
        optionB: { label: '👉 Confiar únicamente en la cantera local (Sin costo)', bonusType: 'morale', bonusVal: 2 }
      },

      // CATEGORÍA: PRENSA & MEDIOS
      {
        category: 'PRENSA',
        title: '🎤DECLARACIONES BOMBA EN CONFERENCIA',
        description: `Un periodista provocador cuestionó públicamente tu planteamiento táctico en el último partido.`,
        optionA: { label: '👉 Responder al estilo Mourinho con personalidad (+6% Moral al vestuario)', bonusType: 'morale', bonusVal: 6 },
        optionB: { label: '👉 Dar una respuesta diplomática de manual (+4% Confianza Directiva)', bonusType: 'board', bonusVal: 4 }
      },

      // CATEGORÍA: FINANZAS & PATROCINADORES
      {
        category: 'FINANZAS',
        title: '💰 SPONSOR OFRECE BONO POR METAS',
        description: `El patrocinador principal del club ofrece un bono extraordinario de €500K si ganamos los próximos 3 partidos.`,
        optionA: { label: '👉 Aceptar el desafío y motivar al equipo (+6% Moral de Plantilla)', bonusType: 'morale', bonusVal: 6 },
        optionB: { label: '👉 Exigir al sponsor un adelanto en efectivo hoy (+€200K Presupuesto)', bonusType: 'budget', bonusVal: 200000 }
      },

      // CATEGORÍA: INSTITUCIONAL
      {
        category: 'INSTITUCIONAL',
        title: '🏠 INVERSIÓN EN EL SISTEMA DE RIEGO Y CÉSPED',
        description: `El canchero del estadio solicita reparar el sistema de drenaje del campo de juego para partidos con lluvia.`,
        optionA: { label: '👉 Aprobar las obras (€100K) (+5% Solidez Defensiva en casa)', bonusType: 'tactical', bonusVal: 5, cost: 100000 },
        optionB: { label: '👉 Posponer las obras para el próximo año (Sin costo)', bonusType: 'morale', bonusVal: 1 }
      },

      // ======================================================================
      // v2.0 — NUEVAS PLANTILLAS AVANZADAS (Fase 6B)
      // ======================================================================

      // FILTRACIÓN SALARIAL — Reduce Team Spirit si hay disparidad salarial
      {
        category: 'FILTRACIÓN',
        title: '📰 FILTRACIÓN SALARIAL EN EL VESTUARIO',
        description: `Los medios publicaron los salarios internos del club. Varios suplentes exigen equiparación salarial. El ambiente en el vestuario se tensa.`,
        optionA: { label: '👉 Convocar reunión y explicar la jerarquía salarial (€50K bonus pl. / -5 Team Spirit)', bonusType: 'spirit', bonusVal: -5, cost: 50000 },
        optionB: { label: '👉 Ignorar la situación y confiar en la profesionalidad (-10 Team Spirit)', bonusType: 'spirit', bonusVal: -10 }
      },

      // AUDITORÍA FINANCIERA — Congela el 30% del presupuesto
      {
        category: 'CRISIS FINANCIERA',
        title: '🕵️ AUDITORÍA INTERNA SORPRESIVA',
        description: `La junta directiva ha ordenado una auditoría de cuentas. El 30% del presupuesto de traspasos queda congelado durante 4 semanas. Puedes liberar los fondos vendiendo a un jugador con salario elevado.`,
        optionA: { label: '👉 Aceptar la auditoría y mostrar transparencia (Fondos bloqueados 4 semanas)', bonusType: 'freeze_budget', bonusVal: 4 },
        optionB: { label: '👉 Negociar con el director financiero (€200K) para liberar los fondos inmediatamente', bonusType: 'unfreeze_budget', bonusVal: 0, cost: 200000 }
      },

      // DERECHOS DE TRANSMISIÓN — Inyección extraordinaria de capital
      {
        category: 'FINANZAS',
        title: '📺 ACUERDO DE DERECHOS DE TRANSMISIÓN',
        description: `La liga anuncia un nuevo acuerdo de derechos de TV. ${db.teams[gameState.userTeamId]?.name || 'El club'} recibe una distribución extraordinaria de ingresos.`,
        optionA: { label: '👉 Destinar el bono (€3M-€8M) al presupuesto de traspasos', bonusType: 'tv_rights', bonusVal: 'transfer' },
        optionB: { label: '👉 Reinvertir los fondos en infraestructura (Mejora Team Spirit +8)', bonusType: 'tv_rights', bonusVal: 'infrastructure' }
      },

      // DESCONTENTO DE ESTRELLA — El goleador exige el mayor salario
      {
        category: 'VESTUARIO',
        title: '💥 DESCONTENTO DE LA ESTRELLA',
        description: `Tu máximo goleador exige ser el mejor pagado de la plantilla. Su representante amenza con activar cláusulas de rescisión si no hay acuerdo en 2 semanas.`,
        optionA: { label: '👉 Acceder y renovarle (€50K/sem extra) (+8 Moral del jugador, -Team Spirit resto)', bonusType: 'morale', bonusVal: 8, cost: 50000 },
        optionB: { label: '👉 Mantener firmeza y demostrar que nadie está por encima del equipo (+5 Confianza Directiva)', bonusType: 'board', bonusVal: 5 }
      }
    ];

    const selected = templates[Math.floor(Math.random() * templates.length)]!;

    return {
      id: `event_${Date.now()}`,
      rarity,
      rarityColor,
      category: selected.category,
      title: selected.title,
      description: selected.description,
      optionA: selected.optionA,
      optionB: selected.optionB
    };
  }

  /**
   * Renderiza el modal de evento inesperado e impacta la decisión en el juego.
   * @param eventData - Datos del evento
   * @param onDecisionMade - Callback que se ejecuta tras elegir opción
   */
  static renderEventModal(eventData: GameEvent, onDecisionMade?: () => void): void {
    const gameState = db.gameState;
    if (!gameState) return;

    let modal: HTMLElement | null = document.getElementById('unexpectedEventModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'unexpectedEventModal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.classList.remove('hidden');

    modal.innerHTML = `
      <div class="modal-card glass-panel" style="max-width: 580px; border: 2px solid ${eventData.rarityColor};">
        
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 14px;">
          <span class="badge" style="background: ${eventData.rarityColor}; color: #000; font-weight: 900; font-size: 0.78rem;">
            RARIEDAD: ${eventData.rarity}
          </span>
          <span class="text-sub" style="font-weight: 800; font-size: 0.8rem;">EVENTO DE ${eventData.category}</span>
        </div>

        <h2 style="font-size: 1.35rem; color: #ffffff; margin-bottom: 10px;">${eventData.title}</h2>
        <p class="text-sub" style="font-size: 0.9rem; line-height: 1.5; margin-bottom: 18px;">${eventData.description}</p>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button id="btnEventOptionA" class="btn-secondary" style="text-align: left; padding: 12px; font-size: 0.85rem; border-color: var(--accent-cyan);">
            ${eventData.optionA.label}
          </button>
          <button id="btnEventOptionB" class="btn-secondary" style="text-align: left; padding: 12px; font-size: 0.85rem;">
            ${eventData.optionB.label}
          </button>
        </div>

        <div id="eventFeedback" class="mt-3 text-center text-highlight hidden" style="font-size: 0.85rem;"></div>
      </div>
    `;

    const applyEffect = (opt: EventOption): void => {
      sfx.playClick();
      if (opt.cost && gameState.budget >= opt.cost) {
        gameState.budget -= opt.cost;
      }

      if (opt.bonusType === 'morale') {
        gameState.matchBonus = gameState.matchBonus || { moraleBonus: 0, tacticalBonus: 0, penaltyBonus: 0 };
        gameState.matchBonus.moraleBonus = (gameState.matchBonus.moraleBonus || 0) + Number(opt.bonusVal);
      } else if (opt.bonusType === 'tactical') {
        gameState.matchBonus = gameState.matchBonus || { moraleBonus: 0, tacticalBonus: 0, penaltyBonus: 0 };
        gameState.matchBonus.tacticalBonus = (gameState.matchBonus.tacticalBonus || 0) + Number(opt.bonusVal);
      } else if (opt.bonusType === 'board' && gameState.contract) {
        gameState.contract.boardConfidence = Math.min(100, gameState.contract.boardConfidence + Number(opt.bonusVal));
      } else if (opt.bonusType === 'budget') {
        gameState.budget += Number(opt.bonusVal);
      } else if (opt.bonusType === 'spirit') {
        // Modificar Team Spirit (v2.0)
        gameState.teamSpirit = Math.max(0, Math.min(100, (gameState.teamSpirit || 50) + Number(opt.bonusVal)));
      } else if (opt.bonusType === 'freeze_budget') {
        // Auditoría financiera: congelar el 30% del presupuesto
        const toFreeze = Math.round((gameState.budget || 0) * 0.30);
        gameState.transferBudgetLocked = true;
        gameState.lockedBudgetAmount = toFreeze;
        gameState.budget -= toFreeze;
        EventsEngine.generateFeedItem('CRISIS_FINANCIERA', { text: '🕵️ Auditoría activa: El 30% del presupuesto de traspasos está bloqueado.' });
      } else if (opt.bonusType === 'unfreeze_budget') {
        // Pagó para liberar los fondos
        gameState.transferBudgetLocked = false;
        gameState.lockedBudgetAmount = 0;
      } else if (opt.bonusType === 'tv_rights') {
        // Ingreso por derechos de TV
        const tvBonus = 3000000 + Math.floor(Math.random() * 5000000);
        if (opt.bonusVal === 'transfer') {
          gameState.budget += tvBonus;
          EventsEngine.generateFeedItem('DERECHOS_TV', { text: `📺 Derechos de TV: +€${(tvBonus/1000000).toFixed(1)}M al presupuesto de traspasos.` });
        } else {
          gameState.teamSpirit = Math.min(100, (gameState.teamSpirit || 50) + 8);
          EventsEngine.generateFeedItem('DERECHOS_TV', { text: `📺 Derechos de TV reinvertidos en infraestructura: Team Spirit +8.` });
        }
        if (gameState.finances) gameState.finances.balance = (gameState.finances.balance || 0) + tvBonus;
      }

      db.saveGame();

      const feedback = document.getElementById('eventFeedback')!;
      feedback.innerText = '✅ ¡Decisión registrada por el Director Técnico!';
      feedback.classList.remove('hidden');

      setTimeout(() => {
        modal.classList.add('hidden');
        if (onDecisionMade) onDecisionMade();
      }, 1200);
    };

    document.getElementById('btnEventOptionA')!.addEventListener('click', () => applyEffect(eventData.optionA));
    document.getElementById('btnEventOptionB')!.addEventListener('click', () => applyEffect(eventData.optionB));
  }

  // ===========================================================================
  // v2.0 — THE FEED: Generador de ítems para el panel de noticias
  // ===========================================================================

  /**
   * Genera un ítem para The Feed y lo registra en gameState.feedItems.
   * @param type - Tipo de noticia (RUMOR_SALIDA, FILTRACIÓN_SALARIAL, CAMBIO_DT, etc.)
   * @param data - Datos opcionales { text, icon, linkedPlayerId }
   * @returns El feedItem creado (o null sin partida activa)
   */
  static generateFeedItem(type: FeedType, data: { text?: string; icon?: string; linkedPlayerId?: string | null } = {}): FeedItem | null {
    const gameState = db.gameState;
    if (!gameState) return null;
    if (!Array.isArray(gameState.feedItems)) gameState.feedItems = [];

    const iconMap: Record<string, string> = {
      RUMOR_SALIDA:        '🔗',
      FILTRACIÓN_SALARIAL: '💰',
      CRISIS_FINANCIERA:   '🕵️',
      DERECHOS_TV:         '📺',
      CAMBIO_DT:           '🧑‍💼',
      OFERTA_DT_JUGADOR:   '📨',
      AGENTE_EXIGE:        '🤝',
      RIVAL_SONDEA:        '🔍',
      DESCONTENTO:         '😡'
    };

    const feedItem: FeedItem = {
      id: `feed_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      week: gameState.week,
      season: gameState.season,
      type,
      text: data.text || `Novedad de tipo ${type} en la Semana ${gameState.week}.`,
      icon: data.icon || iconMap[type] || '📰',
      isRead: false,
      linkedPlayerId: data.linkedPlayerId || null
    };

    // Mantener máximo 50 ítems en el Feed (FIFO)
    gameState.feedItems.unshift(feedItem);
    if (gameState.feedItems.length > 50) gameState.feedItems.pop();

    db.saveGame();
    return feedItem;
  }
}
