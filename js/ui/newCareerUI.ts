/**
 * ============================================================================
 * ENTRENADOR LEYENDA - NUEVA CARRERA DINÁMICA ULTRA-COMPACTA (newCareerUI.ts)
 * ============================================================================
 * Pantalla única sin desplazamiento vertical (Zero Scroll):
 * - Perfil del DT: Nombre, edad (35), país de origen mundial sin etiquetas.
 * - Liga a dirigir: Selección explícita de competición (priorizando 5ª división).
 * - Filosofía táctica y formación dinámica con visualizador táctico retro.
 * - Speech motivacional de inicio de carrera.
 * - Asignación aleatoria de Club Asignado con opción de re-sorteo.
 */

import { db } from '../data/db.js';
import { renderTeamBadgeSVG } from './badgeHelper.js';
import { sfx } from '../../assets/audio/sfx.js';
import { MANAGER_ARCHETYPES, FORMATIONS } from '../engine/tactics.js';
import type { FormationId, ManagerArchetypeKey, Team } from '../types.js';

interface EnrichedTeam extends Team {
  leagueName: string;
  country: string;
  region: string;
}

export function renderNewCareer(container: HTMLElement, onCareerStarted: () => void): void {
  // 1. Estado del DT
  let managerName = 'Alex Hunter';
  let managerAge = 35;
  let managerCountry = 'Perú';
  let targetLeagueCountry = 'Inglaterra'; // País de la liga a dirigir
  let selectedArchetype: ManagerArchetypeKey = 'TIKI_TAKA';
  let selectedSpeech = 'exigencia';

  // 2. Mapeo de Arquetipo -> Formación
  const ARCHETYPE_FORMATIONS: Record<ManagerArchetypeKey, FormationId> = {
    TIKI_TAKA: '4-3-3',
    GEGENPRESSING: '4-2-3-1',
    CATENACCIO: '5-3-2',
    WING_PLAY: '4-4-2',
    DIRECT_ATTACK: '3-5-2'
  };

  // Speeches de debut
  const SPEECH_TEXTS: Record<string, string> = {
    exigencia: '"El escudo está por encima de todo. Aquí nadie regala nada y vamos a sudar cada minuto."',
    toque: '"Confianza, protagonismo y buen trato de balón desde el primer segundo."',
    familia: '"Humildad, orden táctico y unión: somos una familia y nadie compite solo."'
  };

  // Países disponibles para nacionalidad del DT (todo el mundo sin textos extra)
  const allCountries = Array.from(new Set(db.leagues.map(l => l.country))).sort();

  // Países de ligas disponibles para dirigir
  const LEAGUE_COUNTRIES = [
    { name: 'Inglaterra', label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra (National League - 5ª Div)' },
    { name: 'España', label: '🇪🇸 España (Tercera RFEF - 5ª Div)' },
    { name: 'Italia', label: '🇮🇹 Italia (Serie B)' },
    { name: 'Alemania', label: '🇩🇪 Alemania (2. Bundesliga)' },
    { name: 'Francia', label: '🇫🇷 Francia (Ligue 2)' },
    { name: 'Argentina', label: '🇦🇷 Argentina (Liga Profesional)' },
    { name: 'Perú', label: '🇵🇪 Perú (Liga 1)' }
  ];

  /**
   * Obtiene todos los clubes de la categoría más baja disponible para la liga elegida
   */
  const getAvailableLowerTierClubs = (country: string): EnrichedTeam[] => {
    const countryLeagues = db.leagues.filter(l => l.country.toLowerCase() === country.toLowerCase());
    if (countryLeagues.length === 0) return [];

    // Encontrar el tier más alto numéricamente (división más baja)
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

  let candidateClubs = getAvailableLowerTierClubs(targetLeagueCountry);
  let selectedClubIndex = Math.floor(Math.random() * (candidateClubs.length || 1));
  let selectedClub = candidateClubs[selectedClubIndex] || candidateClubs[0]!;

  const rerollClub = () => {
    candidateClubs = getAvailableLowerTierClubs(targetLeagueCountry);
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
   * Renderiza la pizarra táctica compacta
   */
  const renderTacticalBoardHTML = (formationId: FormationId, color: string): string => {
    const form = FORMATIONS[formationId] || FORMATIONS['4-3-3'];
    return `
      <div style="position: relative; width: 100%; height: 115px; background: #0a1c13; border: 1px solid rgba(0, 200, 133, 0.4); border-radius: 6px; overflow: hidden;">
        <div style="position: absolute; inset: 4px; border: 1px dashed rgba(255,255,255,0.15); border-radius: 3px;"></div>
        <div style="position: absolute; top: 50%; left: 4px; right: 4px; height: 1px; background: rgba(255,255,255,0.12);"></div>
        <div style="position: absolute; top: 50%; left: 50%; width: 28px; height: 28px; border: 1px solid rgba(255,255,255,0.12); border-radius: 50%; transform: translate(-50%, -50%);"></div>

        ${form.positions.map(p => `
          <div style="position: absolute; left: ${p.x}%; top: ${p.y}%; transform: translate(-50%, -50%); width: 14px; height: 14px; border-radius: 50%; background: ${color}; border: 1px solid #ffffff; display: flex; align-items: center; justify-content: center; font-size: 6px; font-weight: 900; color: #000;">
            ${p.role}
          </div>
        `).join('')}
      </div>
    `;
  };

  const updateUI = () => {
    const currentArch = MANAGER_ARCHETYPES[selectedArchetype] || MANAGER_ARCHETYPES['TIKI_TAKA']!;
    const selectedFormation = ARCHETYPE_FORMATIONS[selectedArchetype] || '4-3-3';

    container.innerHTML = `
      <div class="career-screen-container" style="background: radial-gradient(circle at 50% 20%, #0d2218 0%, #06110c 50%, #020705 100%); color: #f8fafc; font-family: 'Inter', system-ui, sans-serif;">
        
        <!-- HEADER COMPACTO -->
        <header style="max-width: 1080px; width: 100%; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 6px; background: #00c885; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1rem; color: #000;">
              EL
            </div>
            <div>
              <div style="font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 1.15rem; color: #ffffff; letter-spacing: 0.5px; line-height: 1.1;">
                ENTRENADOR LEYENDA
              </div>
              <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                Ficha de Contratación • Inicio de Carrera
              </div>
            </div>
          </div>
          <button id="btnBackToWelcome" class="btn-secondary" style="padding: 5px 12px; font-size: 0.75rem; font-weight: 700; border-radius: 6px; cursor: pointer;">
            ← Volver
          </button>
        </header>

        <!-- FORMULARIO: 2 COLUMNAS SIN SCROLL EN PC / FLUJO TÁCTIL EN CELULAR -->
        <main class="career-screen-grid">
          
          <!-- COLUMNA 1: PERFIL, PAÍS, LIGA Y TÁCTICA -->
          <div class="glass-panel" style="background: rgba(11, 20, 16, 0.88); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
            <div>
              <div style="font-size: 0.68rem; font-weight: 800; color: #00c885; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                1. Datos del Entrenador
              </div>

              <!-- NOMBRE Y EDAD -->
              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px; margin-bottom: 8px;">
                <div>
                  <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #94a3b8; margin-bottom: 2px;">Nombre del DT</label>
                  <input type="text" id="inputManagerName" value="${managerName}" style="width: 100%; padding: 6px 10px; background: rgba(5,12,9,0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 5px; color: #ffffff; font-weight: 700; font-size: 0.82rem; box-sizing: border-box;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #94a3b8; margin-bottom: 2px;">Edad</label>
                  <input type="number" id="inputManagerAge" value="${managerAge}" min="30" max="65" style="width: 100%; padding: 6px 10px; background: rgba(5,12,9,0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 5px; color: #ffffff; font-weight: 700; font-size: 0.82rem; box-sizing: border-box;" />
                </div>
              </div>

              <!-- PAÍS DE ORIGEN Y LIGA A DIRIGIR -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                <div>
                  <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #94a3b8; margin-bottom: 2px;">País de Origen</label>
                  <select id="selectManagerCountry" style="width: 100%; padding: 6px 8px; background: rgba(5,12,9,0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 5px; color: #ffffff; font-weight: 700; font-size: 0.78rem; box-sizing: border-box;">
                    ${allCountries.map(c => `
                      <option value="${c}" ${c === managerCountry ? 'selected' : ''}>${c}</option>
                    `).join('')}
                  </select>
                </div>
                <div>
                  <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #38bdf8; margin-bottom: 2px;">Liga a Dirigir</label>
                  <select id="selectLeagueCountry" style="width: 100%; padding: 6px 8px; background: rgba(5,12,9,0.85); border: 1px solid rgba(56,189,248,0.3); border-radius: 5px; color: #ffffff; font-weight: 700; font-size: 0.78rem; box-sizing: border-box;">
                    ${LEAGUE_COUNTRIES.map(lc => `
                      <option value="${lc.name}" ${lc.name === targetLeagueCountry ? 'selected' : ''}>${lc.label}</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <!-- MODELO TÁCTICO -->
              <div style="font-size: 0.68rem; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                2. Estilo Táctico
              </div>

              <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 8px;">
                ${(Object.keys(MANAGER_ARCHETYPES) as ManagerArchetypeKey[]).map(key => {
                  const arch = MANAGER_ARCHETYPES[key];
                  const isSel = key === selectedArchetype;
                  return `
                    <div class="archetype-card" data-key="${key}" style="padding: 6px 10px; border-radius: 6px; background: ${isSel ? 'rgba(0, 200, 133, 0.15)' : 'rgba(5, 12, 9, 0.65)'}; border: 1px solid ${isSel ? '#00c885' : 'rgba(255,255,255,0.06)'}; cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
                      <div>
                        <div style="font-size: 0.76rem; font-weight: 800; color: ${isSel ? '#ffffff' : '#cbd5e1'};">${arch.name}</div>
                        <div style="font-size: 0.64rem; color: #94a3b8;">${arch.bonusSummary}</div>
                      </div>
                      <span style="font-size: 0.7rem; font-weight: 900; color: ${arch.badgeColor};">[${ARCHETYPE_FORMATIONS[key]}]</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- DISCURSO DE DEBUT -->
            <div>
              <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #f59e0b; margin-bottom: 3px;">
                Speech de Presentación al Vestuario:
              </label>
              <select id="selectSpeech" style="width: 100%; padding: 5px 8px; background: rgba(5,12,9,0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 5px; color: #cbd5e1; font-size: 0.72rem; box-sizing: border-box;">
                <option value="exigencia" ${selectedSpeech === 'exigencia' ? 'selected' : ''}>"El escudo está por encima de todo: garra y sudor"</option>
                <option value="toque" ${selectedSpeech === 'toque' ? 'selected' : ''}>"Confianza y buen trato de balón desde el inicio"</option>
                <option value="familia" ${selectedSpeech === 'familia' ? 'selected' : ''}>"Humildad y unión: somos una familia que pelea junta"</option>
              </select>
            </div>
          </div>

          <!-- COLUMNA 2: PIZARRA, CLUB ASIGNADO Y FIRMA -->
          <div class="glass-panel" style="background: rgba(11, 20, 16, 0.88); border: 1px solid rgba(0, 200, 133, 0.3); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
            <div>
              
              <!-- PIZARRA TÁCTICA -->
              <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-size: 0.68rem; font-weight: 700; color: #94a3b8;">Pizarra Táctica Inicial:</span>
                  <span style="font-size: 0.72rem; font-weight: 900; color: #00c885;">${selectedFormation}</span>
                </div>
                ${renderTacticalBoardHTML(selectedFormation, currentArch.badgeColor)}
              </div>

              <!-- CABECERA CLUB ASIGNADO CON BOTÓN DE SORTEO -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 0.68rem; font-weight: 800; color: #f59e0b; text-transform: uppercase; letter-spacing: 1px;">
                  3. Club Asignado
                </span>
                <button id="btnRerollClub" class="btn-secondary" style="padding: 4px 8px; font-size: 0.7rem; font-weight: 800; border-radius: 5px; cursor: pointer; color: #38bdf8; display: flex; align-items: center; gap: 4px;">
                  <span>🎲 Sortear Otro Club</span>
                </button>
              </div>

              <!-- TARJETA DEL CLUB ASIGNADO -->
              <div style="background: rgba(5, 12, 9, 0.9); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                  <div style="width: 44px; height: 44px; background: #0c1813; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                    ${renderTeamBadgeSVG(selectedClub, 34)}
                  </div>
                  <div>
                    <h3 style="font-family: 'Outfit', sans-serif; font-size: 1.18rem; font-weight: 900; margin: 0; color: #ffffff; line-height: 1.1;">
                      ${selectedClub.name}
                    </h3>
                    <div style="font-size: 0.72rem; color: #38bdf8; font-weight: 700; margin-top: 2px;">
                      ${selectedClub.leagueName}
                    </div>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: rgba(0,0,0,0.4); padding: 6px; border-radius: 5px; text-align: center; margin-bottom: 8px;">
                  <div>
                    <div style="font-size: 0.6rem; color: #64748b; font-weight: 700;">PRESUPUESTO</div>
                    <div style="font-family: 'Outfit', sans-serif; font-size: 0.8rem; font-weight: 800; color: #38bdf8;">
                      €${((selectedClub.budget || 600000) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div>
                    <div style="font-size: 0.6rem; color: #64748b; font-weight: 700;">NIVEL GLOBAL</div>
                    <div style="font-family: 'Outfit', sans-serif; font-size: 0.8rem; font-weight: 800; color: #00c885;">
                      ${selectedClub.overall || 61} OVR
                    </div>
                  </div>
                  <div>
                    <div style="font-size: 0.6rem; color: #64748b; font-weight: 700;">ESTADIO</div>
                    <div style="font-family: 'Outfit', sans-serif; font-size: 0.68rem; font-weight: 700; color: #f1f5f9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${selectedClub.stadium || 'Municipal'}
                    </div>
                  </div>
                </div>

                <!-- NARRATIVA Y SPEECH -->
                <div style="font-size: 0.7rem; color: #cbd5e1; line-height: 1.4; font-style: italic; border-left: 2px solid #00c885; padding-left: 8px;">
                  ${SPEECH_TEXTS[selectedSpeech] || SPEECH_TEXTS.exigencia}
                </div>
              </div>

            </div>

            <!-- BOTÓN DE INICIO -->
            <button id="btnSignContract" class="btn-primary" style="width: 100%; padding: 12px; font-size: 0.92rem; font-weight: 900; letter-spacing: 0.5px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>FIRMAR CONTRATO Y COMENZAR</span>
              <span>✍️</span>
            </button>
          </div>

        </main>

        <!-- FOOTER ULTRA-SLIM -->
        <footer style="max-width: 1080px; width: 100%; margin: 0 auto; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 6px; font-size: 0.72rem; color: #94a3b8; font-weight: 700;">
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
    });

    document.getElementById('selectLeagueCountry')?.addEventListener('change', (e) => {
      sfx.playClick();
      targetLeagueCountry = (e.target as HTMLInputElement).value;
      rerollClub();
      updateUI();
    });

    document.getElementById('selectSpeech')?.addEventListener('change', (e) => {
      sfx.playClick();
      selectedSpeech = (e.target as HTMLInputElement).value;
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
          eventFrequency: 'normal',
          enableRegens: true,
          enableManagerMarket: true
        }
      );
      onCareerStarted();
    });
  };

  updateUI();
}
