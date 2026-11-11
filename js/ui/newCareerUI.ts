/**
 * ============================================================================
 * ENTRENADOR LEYENDA - NUEVA CARRERA DINÁMICA (newCareerUI.ts)
 * ============================================================================
 * Formulario en una sola pantalla ágil y retro:
 * - Perfil del DT (Nombre, Edad 35, País de origen).
 * - Filosofía táctica y formación dinámica con visualizador de cancha en tiempo real.
 * - Asignación aleatoria de "Club Sorpresa" de divisiones inferiores/barro con re-sorteo.
 * - Firma de contrato inmediata y persistencia en navegador.
 */

import { db } from '../data/db.js';
import { renderTeamBadgeSVG, renderCountryFlagSVG } from './badgeHelper.js';
import { sfx } from '../../assets/audio/sfx.js';
import { MANAGER_ARCHETYPES, FORMATIONS } from '../engine/tactics.js';
import type { EventFrequency, FormationId, ManagerArchetypeKey, Team } from '../types.js';

interface EnrichedTeam extends Team {
  leagueName: string;
  country: string;
  region: string;
}

export function renderNewCareer(container: HTMLElement, onCareerStarted: () => void): void {
  // 1. Estado del DT
  let managerName = 'Alex Hunter';
  let managerAge = 35;
  let managerCountry = 'Inglaterra';
  let selectedArchetype: ManagerArchetypeKey = 'TIKI_TAKA';
  let selectedFormation: FormationId = '4-3-3';
  let eventFrequency: EventFrequency = 'normal';

  // 2. Mapeo de Arquetipo -> Formación por Defecto
  const ARCHETYPE_FORMATIONS: Record<ManagerArchetypeKey, FormationId> = {
    TIKI_TAKA: '4-3-3',
    GEGENPRESSING: '4-2-3-1',
    CATENACCIO: '5-3-2',
    WING_PLAY: '4-4-2',
    DIRECT_ATTACK: '3-5-2'
  };

  // 3. Países de los 5 Pilares
  const PILLAR_COUNTRIES = ['Inglaterra', 'España', 'Italia', 'Alemania', 'Francia'];
  const allCountries = Array.from(new Set([...PILLAR_COUNTRIES, ...db.leagues.map(l => l.country)])).sort();

  /**
   * Obtiene todos los clubes del país seleccionado ordenados por tier (priorizando divisiones de barro)
   */
  const getAvailableLowerTierClubs = (country: string): EnrichedTeam[] => {
    const countryLeagues = db.leagues.filter(l => l.country.toLowerCase() === country.toLowerCase());
    if (countryLeagues.length === 0) return [];

    // Encontrar el tier más bajo disponible para el país (número más alto)
    const maxTier = Math.max(...countryLeagues.map(l => l.tier || 1));
    const targetLeagues = countryLeagues.filter(l => (l.tier || 1) === maxTier);

    const candidates: EnrichedTeam[] = [];
    targetLeagues.forEach(l => {
      l.teams.forEach(t => {
        candidates.push({
          ...t,
          leagueName: l.name,
          country: l.country,
          region: l.region
        });
      });
    });

    return candidates.length > 0 ? candidates : countryLeagues[0]!.teams.map(t => ({
      ...t,
      leagueName: countryLeagues[0]!.name,
      country: countryLeagues[0]!.country,
      region: countryLeagues[0]!.region
    }));
  };

  let candidateClubs = getAvailableLowerTierClubs(managerCountry);
  let selectedClubIndex = Math.floor(Math.random() * (candidateClubs.length || 1));
  let selectedClub = candidateClubs[selectedClubIndex] || candidateClubs[0]!;

  const rerollClub = () => {
    candidateClubs = getAvailableLowerTierClubs(managerCountry);
    if (candidateClubs.length > 1) {
      let nextIndex = Math.floor(Math.random() * candidateClubs.length);
      if (nextIndex === selectedClubIndex) {
        nextIndex = (nextIndex + 1) % candidateClubs.length;
      }
      selectedClubIndex = nextIndex;
      selectedClub = candidateClubs[selectedClubIndex]!;
    } else if (candidateClubs.length === 1) {
      selectedClub = candidateClubs[0]!;
    }
  };

  /**
   * Dibuja la pizarra táctica retro en miniatura
   */
  const renderTacticalBoardHTML = (formationId: FormationId, color: string): string => {
    const form = FORMATIONS[formationId] || FORMATIONS['4-3-3'];
    return `
      <div style="position: relative; width: 100%; height: 160px; background: #0c2016; border: 1.5px solid rgba(0, 200, 133, 0.4); border-radius: 8px; overflow: hidden; box-shadow: inset 0 0 20px rgba(0,0,0,0.6);">
        <!-- Líneas del campo -->
        <div style="position: absolute; inset: 6px; border: 1px dashed rgba(255,255,255,0.18); border-radius: 4px;"></div>
        <div style="position: absolute; top: 50%; left: 6px; right: 6px; height: 1px; background: rgba(255,255,255,0.15);"></div>
        <div style="position: absolute; top: 50%; left: 50%; width: 34px; height: 34px; border: 1px solid rgba(255,255,255,0.15); border-radius: 50%; transform: translate(-50%, -50%);"></div>

        <!-- Jugadores -->
        ${form.positions.map(p => `
          <div style="position: absolute; left: ${p.x}%; top: ${p.y}%; transform: translate(-50%, -50%); width: 16px; height: 16px; border-radius: 50%; background: ${color}; border: 1.5px solid #ffffff; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 900; color: #000; box-shadow: 0 0 6px rgba(0,0,0,0.8);">
            ${p.role}
          </div>
        `).join('')}
      </div>
    `;
  };

  const updateUI = () => {
    const currentArch = MANAGER_ARCHETYPES[selectedArchetype] || MANAGER_ARCHETYPES['TIKI_TAKA']!;
    selectedFormation = ARCHETYPE_FORMATIONS[selectedArchetype] || '4-3-3';

    container.innerHTML = `
      <div style="min-height: 100vh; background: radial-gradient(circle at 50% 20%, #0d2218 0%, #06110c 50%, #020705 100%); display: flex; flex-direction: column; justify-content: space-between; padding: 20px; color: #f8fafc; font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box;">
        
        <!-- HEADER LIMPIO -->
        <header style="max-width: 1080px; width: 100%; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 6px; background: #00c885; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1rem; color: #000;">
              EL
            </div>
            <div>
              <div style="font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 1.25rem; color: #ffffff; letter-spacing: 0.5px;">
                ENTRENADOR LEYENDA
              </div>
              <div style="font-size: 0.68rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                Ficha de Contratación • Inicio de Carrera
              </div>
            </div>
          </div>
          <button id="btnBackToWelcome" class="btn-secondary" style="padding: 6px 14px; font-size: 0.78rem; font-weight: 700; border-radius: 6px; cursor: pointer;">
            ← Volver
          </button>
        </header>

        <!-- FORMULARIO EN UNA SOLA PANTALLA -->
        <main style="max-width: 1080px; width: 100%; margin: 20px auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; align-items: stretch;">
          
          <!-- COLUMNA 1: PERFIL DEL DT Y FILOSOFÍA TÁCTICA -->
          <div class="glass-panel" style="background: rgba(11, 20, 16, 0.88); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-size: 0.72rem; font-weight: 800; color: #00c885; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                1. Perfil del Entrenador
              </div>

              <!-- NOMBRE Y EDAD -->
              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="display: block; font-size: 0.72rem; font-weight: 700; color: #94a3b8; margin-bottom: 4px;">Nombre del DT</label>
                  <input type="text" id="inputManagerName" value="${managerName}" style="width: 100%; padding: 9px 12px; background: rgba(5,12,9,0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #ffffff; font-weight: 700; font-size: 0.88rem; box-sizing: border-box;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.72rem; font-weight: 700; color: #94a3b8; margin-bottom: 4px;">Edad</label>
                  <input type="number" id="inputManagerAge" value="${managerAge}" min="30" max="65" style="width: 100%; padding: 9px 12px; background: rgba(5,12,9,0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #ffffff; font-weight: 700; font-size: 0.88rem; box-sizing: border-box;" />
                </div>
              </div>

              <!-- PAÍS DE ORIGEN -->
              <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 0.72rem; font-weight: 700; color: #94a3b8; margin-bottom: 4px;">País de Origen (5 Pilares)</label>
                <select id="selectManagerCountry" style="width: 100%; padding: 9px 12px; background: rgba(5,12,9,0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #ffffff; font-weight: 700; font-size: 0.85rem; box-sizing: border-box;">
                  ${allCountries.map(c => `
                    <option value="${c}" ${c === managerCountry ? 'selected' : ''}>${c} ${PILLAR_COUNTRIES.includes(c) ? '★ (Pilar Europeo)' : ''}</option>
                  `).join('')}
                </select>
              </div>

              <div style="font-size: 0.72rem; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                2. Modelo Táctico de Juego
              </div>

              <!-- SELECTOR DE FILOSOFÍA -->
              <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                ${(Object.keys(MANAGER_ARCHETYPES) as ManagerArchetypeKey[]).map(key => {
                  const arch = MANAGER_ARCHETYPES[key];
                  const isSel = key === selectedArchetype;
                  return `
                    <div class="archetype-card" data-key="${key}" style="padding: 10px 12px; border-radius: 8px; background: ${isSel ? 'rgba(0, 200, 133, 0.15)' : 'rgba(5, 12, 9, 0.65)'}; border: 1px solid ${isSel ? '#00c885' : 'rgba(255,255,255,0.08)'}; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s ease;">
                      <div>
                        <div style="font-size: 0.82rem; font-weight: 800; color: ${isSel ? '#ffffff' : '#cbd5e1'};">${arch.name}</div>
                        <div style="font-size: 0.68rem; color: #94a3b8;">${arch.bonusSummary}</div>
                      </div>
                      <span style="font-size: 0.72rem; font-weight: 900; color: ${arch.badgeColor};">[${ARCHETYPE_FORMATIONS[key]}]</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- PIZARRA TÁCTICA RETRO -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 0.7rem; font-weight: 700; color: #94a3b8;">Esquema Táctico Asociado:</span>
                <span style="font-size: 0.75rem; font-weight: 900; color: #00c885;">${selectedFormation}</span>
              </div>
              ${renderTacticalBoardHTML(selectedFormation, currentArch.badgeColor)}
            </div>
          </div>

          <!-- COLUMNA 2: CLUB SORPRESA ASIGNADO Y CONTRATO -->
          <div class="glass-panel" style="background: rgba(11, 20, 16, 0.88); border: 1px solid rgba(0, 200, 133, 0.3); border-radius: 12px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 0.72rem; font-weight: 800; color: #f59e0b; text-transform: uppercase; letter-spacing: 1px;">
                  3. Club Asignado (División de Barro)
                </span>
                <button id="btnRerollClub" class="btn-secondary" style="padding: 5px 10px; font-size: 0.72rem; font-weight: 800; border-radius: 6px; cursor: pointer; color: #38bdf8; display: flex; align-items: center; gap: 4px;">
                  <span>🎲 Sortear Otro Club</span>
                </button>
              </div>

              <!-- TARJETA DEL CLUB SORPRESA -->
              <div style="background: rgba(5, 12, 9, 0.9); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 18px; margin-bottom: 16px; position: relative; overflow: hidden;">
                <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 14px;">
                  <div style="width: 58px; height: 58px; background: #0c1813; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    ${renderTeamBadgeSVG(selectedClub, 44)}
                  </div>
                  <div>
                    <h3 style="font-family: 'Outfit', sans-serif; font-size: 1.35rem; font-weight: 900; margin: 0; color: #ffffff;">
                      ${selectedClub.name}
                    </h3>
                    <div style="font-size: 0.76rem; color: #38bdf8; font-weight: 700; margin-top: 2px;">
                      ${selectedClub.leagueName}
                    </div>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: rgba(0,0,0,0.4); padding: 10px; border-radius: 6px; text-align: center; margin-bottom: 12px;">
                  <div>
                    <div style="font-size: 0.65rem; color: #64748b; font-weight: 700;">PRESUPUESTO</div>
                    <div style="font-family: 'Outfit', sans-serif; font-size: 0.88rem; font-weight: 800; color: #38bdf8;">
                      €${((selectedClub.budget || 800000) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div>
                    <div style="font-size: 0.65rem; color: #64748b; font-weight: 700;">NIVEL GLOBAL</div>
                    <div style="font-family: 'Outfit', sans-serif; font-size: 0.88rem; font-weight: 800; color: #00c885;">
                      ${selectedClub.overall || 62} OVR
                    </div>
                  </div>
                  <div>
                    <div style="font-size: 0.65rem; color: #64748b; font-weight: 700;">ESTADIO</div>
                    <div style="font-family: 'Outfit', sans-serif; font-size: 0.72rem; font-weight: 700; color: #f1f5f9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${selectedClub.stadium || 'Municipal'}
                    </div>
                  </div>
                </div>

                <!-- NARRATIVA DEL CONTRATO -->
                <div style="font-size: 0.78rem; color: #cbd5e1; line-height: 1.5; font-style: italic; border-left: 2px solid #00c885; padding-left: 10px; display: flex; align-items: center; gap: 8px;">
                  ${renderCountryFlagSVG(selectedClub.country, 16)}
                  <span>"La directiva de ${selectedClub.name} en ${selectedClub.country} te ofrece tu primer contrato profesional (3 años). Buscan un técnico con modelo táctico de ${currentArch.name} para consolidar el equipo desde las divisiones de barro."</span>
                </div>
              </div>

              <!-- REGLAS DE PARTIDA -->
              <div style="background: rgba(5, 12, 9, 0.6); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px;">
                <div style="font-size: 0.72rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">
                  Parámetros de Simulación (25 Años)
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #cbd5e1;">
                  <span>Eventos de The Feed:</span>
                  <strong style="color: #00c885;">Normal</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #cbd5e1; margin-top: 4px;">
                  <span>Cantera & Regens Sintéticos:</span>
                  <strong style="color: #38bdf8;">Habilitados (4 Gen)</strong>
                </div>
              </div>
            </div>

            <!-- BOTÓN DE INICIO -->
            <button id="btnSignContract" class="btn-primary" style="width: 100%; padding: 15px; font-size: 1rem; font-weight: 900; letter-spacing: 0.5px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 20px;">
              <span>FIRMAR CONTRATO Y COMENZAR</span>
              <span>✍️</span>
            </button>
          </div>

        </main>

        <!-- FOOTER LIMPIO -->
        <footer style="max-width: 1080px; width: 100%; margin: 0 auto; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 12px; font-size: 0.78rem; color: #94a3b8; font-weight: 700;">
          Desarrollado por <span style="color: #00c885; font-weight: 800;">J.GS Dev</span>
        </footer>

      </div>
    `;

    // Eventos
    document.getElementById('btnBackToWelcome')?.addEventListener('click', () => {
      sfx.playClick();
      location.reload();
    });

    document.getElementById('inputManagerName')?.addEventListener('input', (e) => {
      managerName = (e.target as HTMLInputElement).value;
    });

    document.getElementById('inputManagerAge')?.addEventListener('change', (e) => {
      managerAge = parseInt((e.target as HTMLInputElement).value, 10) || 35;
    });

    document.getElementById('selectManagerCountry')?.addEventListener('change', (e) => {
      sfx.playClick();
      managerCountry = (e.target as HTMLInputElement).value;
      rerollClub();
      updateUI();
    });

    document.querySelectorAll('.archetype-card').forEach(card => {
      card.addEventListener('click', () => {
        sfx.playClick();
        selectedArchetype = card.getAttribute('data-key') as ManagerArchetypeKey;
        updateUI();
      });
    });

    document.getElementById('btnRerollClub')?.addEventListener('click', () => {
      sfx.playClick();
      rerollClub();
      updateUI();
    });

    document.getElementById('btnSignContract')?.addEventListener('click', () => {
      sfx.playGoal();
      db.newCareer(
        selectedClub.id,
        managerName.trim() || 'Director Técnico',
        managerCountry,
        managerAge,
        selectedArchetype,
        {
          eventFrequency,
          enableRegens: true,
          enableManagerMarket: true
        }
      );
      onCareerStarted();
    });
  };

  updateUI();
}
