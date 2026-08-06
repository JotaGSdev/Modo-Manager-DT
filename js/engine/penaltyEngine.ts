/**
 * ============================================================================
 * ENTRENADOR LEYENDA - MOTOR DE TANDA DE PENALES (penaltyEngine.js)
 * ============================================================================
 * Este módulo orquesta la tanda de penales cuando un partido de FINAL termina en empate.
 * Características:
 * 1. Selección estratégica del orden de los 5 pateadores titulares del usuario.
 * 2. Simulación dramática paso a paso (3... 2... 1... ¡Patea!).
 * 3. Cálculo de probabilidad de gol por penal según disparo del ejecutor (sho) vs overall del portero rival:
 *    Probabilidad = (sho * 0.65) + random(0..25) - (gkOvr * 0.15).
 * 4. Muerte súbita en caso de empate tras los 5 penales iniciales.
 * 5. Indicadores visuales de penal anotado 🟢 o fallado/atajado 🔴.
 *
 * Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.
 */

import { db } from '../data/db.js';
import { sfx } from '../../assets/audio/sfx.js';

import type { Team } from '../types.js';

export class PenaltyEngine {
  /**
   * Inicia la experiencia de tanda de penales para una final empatada.
   * @param userTeam - Equipo del usuario
   * @param rivalTeam - Equipo rival
   * @param onFinish - Callback al terminar la tanda, recibe (userWon: boolean)
   */
  static startPenaltyShootout(userTeam: Team, rivalTeam: Team, onFinish?: (userWon: boolean) => void): void {
    const userPlayers = db.getTeamPlayers(userTeam.id);
    const rivalPlayers = db.getTeamPlayers(rivalTeam.id);

    // Seleccionar los 5 mejores pateadores del usuario por su atributo de tiro (sho)
    const sortedUserPlayers = [...userPlayers].sort((a, b) => (b.sho || b.overall) - (a.sho || a.overall));
    const userPenaltyTakers = sortedUserPlayers.slice(0, 5);

    // Obtener portero rival
    const rivalGK: { overall: number; name: string } = rivalPlayers.find(p => p.pos === 'POR') || rivalPlayers[0] || { overall: 75, name: 'Portero Rival' };

    let modal: HTMLElement | null = document.getElementById('penaltyShootoutModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'penaltyShootoutModal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.classList.remove('hidden');

    let currentRound = 0;
    let userScore = 0;
    let rivalScore = 0;
    let isFinished = false;

    const userResults: boolean[] = [];
    const rivalResults: boolean[] = [];

    const renderShootoutUI = () => {
      const currentShooter = (userPenaltyTakers[currentRound] || sortedUserPlayers[currentRound % sortedUserPlayers.length])!;

      modal.innerHTML = `
        <div class="modal-card glass-panel text-center" style="max-width: 620px; border: 2px solid var(--accent-gold); padding: 28px;">
          
          <div style="background: rgba(229, 169, 60, 0.15); border: 1px solid var(--accent-gold); padding: 8px 16px; border-radius: 8px; display: inline-block; margin-bottom: 14px;">
            <h3 style="color: var(--accent-gold); margin: 0; font-size: 1.1rem;">🏆 DEFINICIÓN POR PENALES (GRAN FINAL)</h3>
          </div>

          <h2 style="font-size: 2.2rem; font-weight: 900; margin: 8px 0; color: #ffffff;">
            ${userTeam.name} <span style="color: var(--accent-gold);">${userScore} - ${rivalScore}</span> ${rivalTeam.name}
          </h2>

          <div style="display: flex; justify-content: center; gap: 24px; margin: 16px 0;">
            <div>
              <span class="text-sub" style="font-size: 0.78rem; font-weight: 700;">${userTeam.name}</span>
              <div style="display: flex; gap: 6px; margin-top: 4px;">
                ${[0,1,2,3,4].map(i => `
                  <div style="width: 14px; height: 14px; border-radius: 50%; background: ${userResults[i] === true ? 'var(--accent-green)' : userResults[i] === false ? 'var(--accent-red)' : '#334155'};"></div>
                `).join('')}
              </div>
            </div>

            <div>
              <span class="text-sub" style="font-size: 0.78rem; font-weight: 700;">${rivalTeam.name}</span>
              <div style="display: flex; gap: 6px; margin-top: 4px;">
                ${[0,1,2,3,4].map(i => `
                  <div style="width: 14px; height: 14px; border-radius: 50%; background: ${rivalResults[i] === true ? 'var(--accent-green)' : rivalResults[i] === false ? 'var(--accent-red)' : '#334155'};"></div>
                `).join('')}
              </div>
            </div>
          </div>

          ${!isFinished ? `
            <div style="background: #0f172a; border: 1px solid var(--border-color); padding: 16px; border-radius: 10px; margin: 18px 0; text-align: left;">
              <span class="text-sub" style="font-size: 0.8rem; font-weight: 700;">TURNO DE PENAL #${currentRound + 1}:</span>
              <h4 style="font-size: 1.1rem; color: #ffffff; margin-top: 2px;">
                👟 Ejecutor: <strong>${currentShooter.name}</strong> (${currentShooter.pos}, Tiro: ${currentShooter.sho || currentShooter.overall})
              </h4>
              <span class="text-sub" style="font-size: 0.78rem;">Frente al arquero rival: <strong>${rivalGK.name}</strong> (OVR ${rivalGK.overall})</span>
            </div>

            <div id="countdownBox" class="hidden" style="font-size: 3rem; font-weight: 900; color: var(--accent-cyan); margin: 12px 0;">3...</div>

            <div class="modal-actions" style="display: flex; justify-content: center; margin-top: 16px;">
              <button id="btnTakePenalty" class="btn-primary btn-large" style="width: 100%; font-size: 1.1rem; font-weight: 900; background: var(--accent-gold); color: #000;">
                ⚽ ¡EJECUTAR PENAL!
              </button>
            </div>
          ` : `
            <div style="margin: 20px 0;">
              <h3 style="color: ${userScore > rivalScore ? 'var(--accent-green)' : 'var(--accent-red)'}; font-size: 1.6rem; font-weight: 900;">
                ${userScore > rivalScore ? '🎉 ¡CAMPEONES DE LA FINAL EN PENALES!' : '💔 DERROTA EN LA TANDA DE PENALES'}
              </h3>
            </div>

            <button id="btnCloseShootout" class="btn-primary btn-large" style="width: 100%; margin-top: 14px;">
              CONTINUAR AL PODIO
            </button>
          `}

          <div id="shootoutFeedback" class="mt-2 text-highlight hidden" style="font-weight: 800; font-size: 0.95rem;"></div>
        </div>
      `;

      if (!isFinished) {
        document.getElementById('btnTakePenalty')!.addEventListener('click', () => {
          sfx.playClick();
          const btn = document.getElementById('btnTakePenalty') as HTMLButtonElement;
          const countdownBox = document.getElementById('countdownBox')!;
          const feedback = document.getElementById('shootoutFeedback')!;

          btn.disabled = true;
          countdownBox.classList.remove('hidden');

          let count = 3;
          countdownBox.innerText = `${count}...`;

          const timer = setInterval(() => {
            count--;
            if (count > 0) {
              countdownBox.innerText = `${count}...`;
            } else {
              clearInterval(timer);
              countdownBox.classList.add('hidden');

              // Cálculo de tiro del usuario
              const shoVal = currentShooter.sho || currentShooter.overall || 75;
              const chance = (shoVal * 0.65) + (Math.random() * 25) - (rivalGK.overall * 0.15);
              const userGoal = chance > 35;

              if (userGoal) {
                userScore++;
                userResults.push(true);
                sfx.playGoal();
                feedback.innerText = `⚽ ¡GOLAZO! ${currentShooter.name} engañó al portero rival.`;
              } else {
                userResults.push(false);
                sfx.playWhistle();
                feedback.innerText = `🧲 ¡ATAJADO / FALLADO! El disparo de ${currentShooter.name} fue atajado.`;
              }
              feedback.classList.remove('hidden');

              // Tiro del rival
              setTimeout(() => {
                const rivalGoal = Math.random() < 0.68;
                if (rivalGoal) {
                  rivalScore++;
                  rivalResults.push(true);
                } else {
                  rivalResults.push(false);
                }

                currentRound++;

                // Verificar si terminó la tanda (5 tiros o ventaja matemática)
                if (currentRound >= 5) {
                  if (userScore !== rivalScore) {
                    isFinished = true;
                  }
                }

                renderShootoutUI();
              }, 1600);
            }
          }, 450);
        });
      } else {
        document.getElementById('btnCloseShootout')!.addEventListener('click', () => {
          modal.classList.add('hidden');
          if (onFinish) onFinish(userScore > rivalScore);
        });
      }
    };

    renderShootoutUI();
  }
}
