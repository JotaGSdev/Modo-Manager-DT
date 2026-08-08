/**
 * ============================================================================
 * ENTRENADOR LEYENDA - SELECCIÓN INICIAL DE CARRERA (newCareerUI.ts v3.2)
 * ============================================================================
 * Flujo Narrativo de Carrera de DT en 4 Pasos con Libre Elección de Club Favorito:
 * 1. PASO 1: Perfil Oficial del DT (Nombre, Edad, Selector Visual de País con Banderas SVG).
 * 2. PASO 2: Filosofía Táctica Real (Tiki-Taka, Gegenpressing, Catenaccio, Bandas, Contraataque).
 * 3. PASO 3: Selección de Club (3 Ofertas Recomendadas de tu País O Elección de Tu Club Favorito de Cualquier Liga).
 * 4. PASO 4: Configuración de Experiencia de Juego (Eventos, Regens, Mercado IA).
 */

import { db } from '../data/db.js';
import { renderTeamBadgeSVG, renderCountryFlagSVG } from './badgeHelper.js';
import { sfx } from '../../assets/audio/sfx.js';
import { MANAGER_ARCHETYPES } from '../engine/tactics.js';

import type { EventFrequency, ManagerArchetypeKey, Team } from '../types.js';

interface EnrichedTeam extends Team {
  leagueName: string;
  country: string;
  region: string;
}

interface ClubOffer {
  team: EnrichedTeam;
  projectType: string;
  badgeColor: string;
  letterMessage: string;
}

export function renderNewCareer(container: HTMLElement, onCareerStarted: () => void): void {
  let currentStep = 1;

  // Estado inicial del perfil del DT
  let managerName = 'Director Técnico';
  let managerAge = 35;
  let managerCountry = 'Perú';
  let selectedArchetype: ManagerArchetypeKey = 'TIKI_TAKA';

  // Opciones avanzadas de partida (Paso 4)
  let eventFrequency: EventFrequency = 'normal';
  let enableRegens = true;
  let enableManagerMarket = true;

  // Selección de club para iniciar la carrera
  let selectedTeamIdForStart: string | null = null;

  // Estado de vista del Paso 3 (Ofertas Recomendadas vs Buscador de Club Favorito)
  let step3Tab: 'RECOMMENDED' | 'FAVORITE' = 'RECOMMENDED';
  let favoriteFilterLeagueId = 'ALL';
  let favoriteSearchQuery = '';

  const countriesInDB = Array.from(new Set(db.leagues.map(l => l.country))).sort();

  /**
   * Obtiene todos los clubes enriquecidos con su nombre de liga y país
   */
  const getAllEnrichedTeams = (): EnrichedTeam[] => {
    const teams: EnrichedTeam[] = [];
    db.leagues.forEach(l => {
      l.teams.forEach(t => {
        teams.push({
          ...t,
          leagueName: l.name,
          country: l.country,
          region: l.region
        });
      });
    });
    return teams;
  };

  /**
   * Selecciona 3 proyectos recomendados del país de origen del DT
   */
  const getMatchingTeams = (): ClubOffer[] => {
    let homeCountryLeagues = db.leagues.filter(l => l.country.toLowerCase() === managerCountry.toLowerCase());

    if (homeCountryLeagues.length === 0) {
      const sampleLeague = db.leagues.find(l => l.country === 'Perú') || db.leagues[0];
      if (sampleLeague) homeCountryLeagues = [sampleLeague];
    }

    const homeTeams: EnrichedTeam[] = [];
    homeCountryLeagues.forEach(l => {
      l.teams.forEach(t => {
        homeTeams.push({
          ...t,
          leagueName: l.name,
          country: l.country,
          region: l.region
        });
      });
    });

    homeTeams.sort((a, b) => a.overall - b.overall);

    const club1 = homeTeams[0] || {
      id: 'peru_union_comercio',
      name: 'Unión Comercio',
      short: 'UCO',
      budget: 2400000,
      reputation: 60,
      overall: 64,
      colors: ['#00c885', '#000000'],
      stadium: 'Estadio Carlos Vidaurre',
      leagueName: 'Liga 1 Te Apuesto',
      country: 'Perú',
      region: 'Sudamérica'
    };

    const club2 = homeTeams[Math.floor(homeTeams.length / 2)] || club1;
    const club3 = homeTeams[homeTeams.length - 1] || club2;

    const archetypeData = MANAGER_ARCHETYPES[selectedArchetype] || MANAGER_ARCHETYPES['TIKI_TAKA']!;

    return [
      {
        team: club1,
        projectType: '🌱 DESAFÍO LOCAL HUMILDE',
        badgeColor: 'var(--accent-green)',
        letterMessage: `La comisión de ${club1.name} en ${managerCountry} apuesta por darte tu primera oportunidad como DT profesional para plasmar tu estilo de ${archetypeData.name}.`
      },
      {
        team: club2,
        projectType: '⚽ PROYECTO DE DESARROLLO NACIONAL',
        badgeColor: 'var(--accent-cyan)',
        letterMessage: `La directiva de ${club2.name} te invita a asumir tu primer contrato de 3 años para potenciar la plantilla con tu modelo táctico de ${archetypeData.name}.`
      },
      {
        team: club3,
        projectType: '🏟️ PROYECTO BASE DE SU PAÍS',
        badgeColor: 'var(--accent-gold)',
        letterMessage: `En ${club3.name} confían en tus ideas de ${archetypeData.name} para consolidar el equipo en la liga nacional durante tus primeros 3 años de experiencia.`
      }
    ];
  };

  /**
   * Renderiza el paso activo del Wizard con interfaz EA FC Dark Mode
   */
  const renderStep = () => {
    container.innerHTML = `
      <div style="min-height: 100vh; background: radial-gradient(circle at top center, #111a2e 0%, #080c14 100%); display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px; color: #ffffff; font-family: 'Inter', sans-serif;">
        
        <!-- ENCABEZADO DE BIENVENIDA -->
        <div class="text-center mb-4" style="max-width: 800px;">
          <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(0, 200, 133, 0.12); border: 1px solid var(--accent-green); padding: 6px 20px; border-radius: 20px; color: var(--accent-green); font-weight: 800; font-size: 0.82rem; margin-bottom: 14px; letter-spacing: 0.5px; box-shadow: 0 0 15px rgba(0,200,133,0.15);">
            ⚽ INICIO DE CARRERA DE DT (TEMPORADA 1 DE 25 — 2026/2027)
          </div>
          <h1 style="font-size: 2.3rem; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 8px; color: #ffffff; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
            ${currentStep === 1 ? '🎙️ PASO 1: REGISTRO DEL DIRECTOR TÉCNICO' : (currentStep === 2 ? '🧩 PASO 2: FILOSOFÍA TÁCTICA DEL ENTRENADOR' : (currentStep === 3 ? '💼 PASO 3: SELECCIÓN DE TU CLUB DE FÚTBOL' : '⚙️ PASO 4: CONFIGURACIÓN DE EXPERIENCIA DE JUEGO'))}
          </h1>
          <p class="text-sub" style="font-size: 0.94rem; color: #94a3b8; margin: 0;">
            ${currentStep === 1 ? 'Define tu identidad como entrenador profesional. Ingresa tus datos de registro:' : (currentStep === 2 ? 'Selecciona tu modelo táctico preferido. Definirá la identidad de tu equipo en la cancha:' : (currentStep === 3 ? 'Acepta una de las 3 ofertas recomendadas o busca libremente tu club favorito para dirigir:' : 'Ajusta la dificultad y sistemas dinámicos para tu partida de 25 temporadas:'))}
          </p>
        </div>

        <!-- INDICADOR DE PROGRESO INTERACTIVO DE 4 PASOS -->
        <div style="display: flex; gap: 10px; margin-bottom: 28px; width: 100%; max-width: 680px; justify-content: center;">
          <div class="step-pill ${currentStep >= 1 ? 'active' : ''}" style="flex: 1; padding: 8px; border-radius: 8px; background: ${currentStep >= 1 ? 'linear-gradient(90deg, rgba(0,200,133,0.2), rgba(0,200,133,0.05))' : 'rgba(15,23,42,0.6)'}; border: 1px solid ${currentStep >= 1 ? 'var(--accent-green)' : '#1e293b'}; text-align: center; font-size: 0.76rem; font-weight: 800; color: ${currentStep >= 1 ? 'var(--accent-green)' : '#64748b'}; transition: all 0.3s ease;">
            1. 👤 PERFIL
          </div>
          <div class="step-pill ${currentStep >= 2 ? 'active' : ''}" style="flex: 1; padding: 8px; border-radius: 8px; background: ${currentStep >= 2 ? 'linear-gradient(90deg, rgba(0,200,133,0.2), rgba(0,200,133,0.05))' : 'rgba(15,23,42,0.6)'}; border: 1px solid ${currentStep >= 2 ? 'var(--accent-green)' : '#1e293b'}; text-align: center; font-size: 0.76rem; font-weight: 800; color: ${currentStep >= 2 ? 'var(--accent-green)' : '#64748b'}; transition: all 0.3s ease;">
            2. 🧩 TÁCTICA
          </div>
          <div class="step-pill ${currentStep >= 3 ? 'active' : ''}" style="flex: 1; padding: 8px; border-radius: 8px; background: ${currentStep >= 3 ? 'linear-gradient(90deg, rgba(0,200,133,0.2), rgba(0,200,133,0.05))' : 'rgba(15,23,42,0.6)'}; border: 1px solid ${currentStep >= 3 ? 'var(--accent-green)' : '#1e293b'}; text-align: center; font-size: 0.76rem; font-weight: 800; color: ${currentStep >= 3 ? 'var(--accent-green)' : '#64748b'}; transition: all 0.3s ease;">
            3. 🏟️ CLUB
          </div>
          <div class="step-pill ${currentStep >= 4 ? 'active' : ''}" style="flex: 1; padding: 8px; border-radius: 8px; background: ${currentStep >= 4 ? 'linear-gradient(90deg, rgba(0,200,133,0.2), rgba(0,200,133,0.05))' : 'rgba(15,23,42,0.6)'}; border: 1px solid ${currentStep >= 4 ? 'var(--accent-green)' : '#1e293b'}; text-align: center; font-size: 0.76rem; font-weight: 800; color: ${currentStep >= 4 ? 'var(--accent-green)' : '#64748b'}; transition: all 0.3s ease;">
            4. ⚙️ AJUSTES
          </div>
        </div>

        <!-- PASO 1: PERFIL DEL DT -->
        ${currentStep === 1 ? `
          <div class="glass-panel" style="width: 100%; max-width: 700px; padding: 32px; border: 1px solid rgba(255,255,255,0.1); background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(16px); border-radius: 18px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
            <div style="display: flex; align-items: center; gap: 18px; border-bottom: 1px solid var(--border-color); padding-bottom: 18px; margin-bottom: 24px;">
              <div style="background: linear-gradient(135deg, var(--accent-cyan), var(--accent-green)); width: 62px; height: 62px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #000; box-shadow: 0 0 20px rgba(0,200,133,0.3);">
                👔
              </div>
              <div>
                <h3 style="margin: 0; font-size: 1.25rem; font-weight: 900; color: #ffffff;">Perfil de Entrenador Principiante</h3>
                <span class="text-sub" style="font-size: 0.82rem; color: #94a3b8;">0 Años de Experiencia Previa · Contrato Inicial de 3 Temporadas</span>
              </div>
            </div>

            <div class="form-group mb-4">
              <label class="form-label" style="font-size: 0.86rem; font-weight: 800; color: var(--accent-cyan); margin-bottom: 6px; display: block;">👤 Nombre Completo del DT:</label>
              <input type="text" id="inputManagerName" class="input-text" value="${managerName}" style="width: 100%; font-size: 1rem; padding: 12px 16px; border-radius: 10px; background: #0b111e; border: 1px solid var(--border-color); color: #fff;" placeholder="Ej: Lionel Scaloni, Marcelo Bielsa, Pep Guardiola..." />
            </div>

            <div class="form-group mb-4">
              <label class="form-label" style="font-size: 0.86rem; font-weight: 800; color: var(--accent-gold); margin-bottom: 6px; display: block;">🎂 Edad Inicial (Años):</label>
              <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                <input type="number" id="inputManagerAge" class="input-text" value="${managerAge}" min="30" max="65" style="width: 120px; font-size: 1.1rem; text-align: center; padding: 10px; border-radius: 10px; background: #0b111e; border: 1px solid var(--border-color); color: #fff; font-weight: 900;" />
                <div style="display: flex; gap: 6px;">
                  <button class="btn-secondary btn-quick-age" data-age="30" style="padding: 6px 12px; font-size: 0.76rem; border-radius: 6px;">30a</button>
                  <button class="btn-secondary btn-quick-age" data-age="35" style="padding: 6px 12px; font-size: 0.76rem; border-radius: 6px;">35a</button>
                  <button class="btn-secondary btn-quick-age" data-age="40" style="padding: 6px 12px; font-size: 0.76rem; border-radius: 6px;">40a</button>
                  <button class="btn-secondary btn-quick-age" data-age="45" style="padding: 6px 12px; font-size: 0.76rem; border-radius: 6px;">45a</button>
                </div>
              </div>
            </div>

            <!-- SELECTOR VISUAL DE PAÍS CON BANDERAS SVG -->
            <div class="form-group mb-4">
              <label class="form-label" style="font-size: 0.86rem; font-weight: 800; color: var(--accent-green); margin-bottom: 6px; display: block;">🌎 Selecciona tu País de Origen:</label>
              
              <div id="selectedCountryCard" style="background: #0b111e; border: 2px solid var(--accent-green); padding: 14px 18px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                <div style="display: flex; align-items: center; gap: 14px;">
                  ${renderCountryFlagSVG(managerCountry, 28)}
                  <strong style="font-size: 1.1rem; color: #ffffff;" id="displayCountryName">${managerCountry}</strong>
                </div>
                <span style="font-size: 0.8rem; background: var(--accent-green); color: #000; font-weight: 900; padding: 6px 14px; border-radius: 8px; letter-spacing: 0.5px;">CAMBIAR PAÍS 🔽</span>
              </div>

              <!-- REJILLA VISUAL DESPLEGABLE DE PAÍSES -->
              <div id="countryGridModal" class="hidden" style="margin-top: 12px; max-height: 240px; overflow-y: auto; background: #080d16; border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                ${countriesInDB.map(c => `
                  <div class="country-option-item" data-country="${c}" style="display: flex; align-items: center; gap: 12px; background: ${c === managerCountry ? '#142036' : '#0f172a'}; border: 1px solid ${c === managerCountry ? 'var(--accent-green)' : 'var(--border-color)'}; padding: 10px 14px; border-radius: 10px; cursor: pointer; transition: all 0.15s ease;">
                    ${renderCountryFlagSVG(c, 24)}
                    <span style="font-size: 0.9rem; font-weight: 800; color: #fff;">${c}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div style="background: #090e18; padding: 14px 18px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 24px; font-size: 0.84rem; color: #94a3b8; display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.2rem;">🔰</span>
              <span><strong>Recomendación de Carrera:</strong> Podrás aceptar ofertas recomendadas en <strong id="noteCountryText" style="color: var(--accent-green);">${managerCountry}</strong> o elegir tu club favorito de cualquier liga.</span>
            </div>

            <button id="btnNextToStep2" class="btn-primary btn-large" style="width: 100%; font-size: 1.05rem; font-weight: 900; padding: 14px; border-radius: 12px; background: linear-gradient(135deg, var(--accent-green) 0%, #0096c7 100%); color: #000; box-shadow: 0 6px 20px rgba(0,200,133,0.3);">
              SIGUIENTE: FILOSOFÍA TÁCTICA ➔
            </button>
          </div>
        ` : ''}

        <!-- PASO 2: FILOSOFÍA TÁCTICA REAL -->
        ${currentStep === 2 ? `
          <div class="glass-panel" style="width: 100%; max-width: 960px; padding: 32px; border: 1px solid rgba(255,255,255,0.1); background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(16px); border-radius: 18px;">
            <div class="text-center mb-4">
              <h3 style="color: var(--accent-gold); font-size: 1.35rem; font-weight: 900; margin-bottom: 4px;">🧩 SELECCIONA TU ESTILO TÁCTICO DE FÚTBOL</h3>
              <p class="text-sub" style="font-size: 0.88rem; color: #94a3b8;">Define la identidad táctica que imprimirás a tu equipo en la cancha:</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
              
              <!-- 1. TIKI TAKA -->
              <div class="archetype-card-step glass-panel text-center ${selectedArchetype === 'TIKI_TAKA' ? 'selected' : ''}" 
                   data-id="TIKI_TAKA" 
                   style="padding: 20px 14px; cursor: pointer; border: 2px solid ${selectedArchetype === 'TIKI_TAKA' ? 'var(--accent-green)' : 'rgba(255,255,255,0.08)'}; background: ${selectedArchetype === 'TIKI_TAKA' ? '#141d2e' : '#0b111e'}; border-radius: 14px; transition: all 0.2s ease;">
                <div style="font-size: 2.4rem; margin-bottom: 8px;">⚽</div>
                <h4 style="font-size: 1rem; font-weight: 900; color: #ffffff; margin-bottom: 4px;">TIKI-TAKA & POSESIÓN</h4>
                <span class="text-sub" style="font-size: 0.76rem; display: block; margin-bottom: 10px; color: #94a3b8;">Juego de Posición & Pase Corto</span>
                <div style="background: rgba(0, 200, 133, 0.18); color: var(--accent-green); padding: 5px 8px; border-radius: 6px; font-weight: 900; font-size: 0.74rem; margin-bottom: 10px;">
                  +8 PASES CORTOS | POSESIÓN
                </div>
                <p class="text-sub" style="font-size: 0.78rem; text-align: left; line-height: 1.4; color: #cbd5e1;">
                  Construcción paciente desde atrás, triangulaciones de apoyo y dominio del balón.
                </p>
              </div>

              <!-- 2. GEGENPRESSING -->
              <div class="archetype-card-step glass-panel text-center ${selectedArchetype === 'GEGENPRESSING' ? 'selected' : ''}" 
                   data-id="GEGENPRESSING" 
                   style="padding: 20px 14px; cursor: pointer; border: 2px solid ${selectedArchetype === 'GEGENPRESSING' ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.08)'}; background: ${selectedArchetype === 'GEGENPRESSING' ? '#141d2e' : '#0b111e'}; border-radius: 14px; transition: all 0.2s ease;">
                <div style="font-size: 2.4rem; margin-bottom: 8px;">⚡</div>
                <h4 style="font-size: 1rem; font-weight: 900; color: #ffffff; margin-bottom: 4px;">GEGENPRESSING & PRESIÓN</h4>
                <span class="text-sub" style="font-size: 0.76rem; display: block; margin-bottom: 10px; color: #94a3b8;">Presión Tras Pérdida & Vértigo</span>
                <div style="background: rgba(0, 150, 199, 0.18); color: var(--accent-cyan); padding: 5px 8px; border-radius: 6px; font-weight: 900; font-size: 0.74rem; margin-bottom: 10px;">
                  +8 RECUPERACIÓN ALTA | VÉRTIGO
                </div>
                <p class="text-sub" style="font-size: 0.78rem; text-align: left; line-height: 1.4; color: #cbd5e1;">
                  Asfixia inmediata al rival tras perder la pelota y zarpazo vertical al espacio.
                </p>
              </div>

              <!-- 3. CATENACCIO -->
              <div class="archetype-card-step glass-panel text-center ${selectedArchetype === 'CATENACCIO' ? 'selected' : ''}" 
                   data-id="CATENACCIO" 
                   style="padding: 20px 14px; cursor: pointer; border: 2px solid ${selectedArchetype === 'CATENACCIO' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.08)'}; background: ${selectedArchetype === 'CATENACCIO' ? '#141d2e' : '#0b111e'}; border-radius: 14px; transition: all 0.2s ease;">
                <div style="font-size: 2.4rem; margin-bottom: 8px;">🚌</div>
                <h4 style="font-size: 1rem; font-weight: 900; color: #ffffff; margin-bottom: 4px;">CATENACCIO & BLOQUE BAJO</h4>
                <span class="text-sub" style="font-size: 0.76rem; display: block; margin-bottom: 10px; color: #94a3b8;">El Autobús & Balón Parado</span>
                <div style="background: rgba(229, 169, 60, 0.18); color: var(--accent-gold); padding: 5px 8px; border-radius: 6px; font-weight: 900; font-size: 0.74rem; margin-bottom: 10px;">
                  +8 SOLIDEZ MARCA | CERROJO
                </div>
                <p class="text-sub" style="font-size: 0.78rem; text-align: left; line-height: 1.4; color: #cbd5e1;">
                  Cerrojo defensivo numérico en área propia, garra, contragolpe y córners.
                </p>
              </div>

            </div>

            <!-- SEGUNDA FILA -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px;">
              
              <div class="archetype-card-step glass-panel text-center ${selectedArchetype === 'WING_PLAY' ? 'selected' : ''}" 
                   data-id="WING_PLAY" 
                   style="padding: 18px 16px; cursor: pointer; border: 2px solid ${selectedArchetype === 'WING_PLAY' ? '#a855f7' : 'rgba(255,255,255,0.08)'}; background: ${selectedArchetype === 'WING_PLAY' ? '#141d2e' : '#0b111e'}; border-radius: 14px; transition: all 0.2s ease; display: flex; align-items: center; gap: 16px; text-align: left;">
                <div style="font-size: 2.4rem;">🌊</div>
                <div>
                  <h4 style="font-size: 1rem; font-weight: 900; color: #ffffff; margin-bottom: 2px;">JUEGO POR BANDAS & CENTROS</h4>
                  <span class="text-sub" style="font-size: 0.76rem; color: #94a3b8;">Amplitud Total, Lateral Desbordante y Envíos al Área</span>
                  <div style="background: rgba(168, 85, 247, 0.2); color: #c084fc; padding: 4px 8px; border-radius: 6px; font-weight: 900; font-size: 0.72rem; margin-top: 6px; display: inline-block;">
                    +8 CENTROS & DESBORDE | REMATE AÉREO
                  </div>
                </div>
              </div>

              <div class="archetype-card-step glass-panel text-center ${selectedArchetype === 'DIRECT_ATTACK' ? 'selected' : ''}" 
                   data-id="DIRECT_ATTACK" 
                   style="padding: 18px 16px; cursor: pointer; border: 2px solid ${selectedArchetype === 'DIRECT_ATTACK' ? '#ff0055' : 'rgba(255,255,255,0.08)'}; background: ${selectedArchetype === 'DIRECT_ATTACK' ? '#141d2e' : '#0b111e'}; border-radius: 14px; transition: all 0.2s ease; display: flex; align-items: center; gap: 16px; text-align: left;">
                <div style="font-size: 2.4rem;">🎯</div>
                <div>
                  <h4 style="font-size: 1rem; font-weight: 900; color: #ffffff; margin-bottom: 2px;">CONTRAATAQUE DIRECTO</h4>
                  <span class="text-sub" style="font-size: 0.76rem; color: #94a3b8;">Balón Largo a la Espalda y Zarpazos a Alta Velocidad</span>
                  <div style="background: rgba(255, 0, 85, 0.2); color: #ff5588; padding: 4px 8px; border-radius: 6px; font-weight: 900; font-size: 0.72rem; margin-top: 6px; display: inline-block;">
                    +8 BALÓN LARGO | VELOCIDAD
                  </div>
                </div>
              </div>

            </div>

            <div style="display: flex; gap: 16px;">
              <button id="btnBackToStep1" class="btn-secondary" style="flex: 1; padding: 14px; font-weight: 800; border-radius: 12px;">
                ⬅️ VOLVER AL PERFIL
              </button>
              <button id="btnNextToStep3" class="btn-primary btn-large" style="flex: 2; font-size: 1.05rem; font-weight: 900; padding: 14px; border-radius: 12px; background: linear-gradient(135deg, var(--accent-green) 0%, #0096c7 100%); color: #000; box-shadow: 0 6px 20px rgba(0,200,133,0.3);">
                🔍 VER CLUBES & OFERTAS ➔
              </button>
            </div>
          </div>
        ` : ''}

        <!-- PASO 3: SELECCIÓN DE CLUB (OFERTAS RECOMENDADAS + BUSCADOR DE CLUB FAVORITO) -->
        ${currentStep === 3 ? `
          <div style="width: 100%; max-width: 1140px;">
            <!-- RESUMEN DEL DT EN CABECERA -->
            <div class="glass-panel mb-3 text-center" style="padding: 16px 24px; border: 1px solid rgba(255,255,255,0.1); background: rgba(15, 23, 42, 0.9); border-radius: 14px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 12px;">
                ${renderCountryFlagSVG(managerCountry, 24)}
                <span style="font-weight: 900; font-size: 1rem; color: #fff;">${managerName}</span>
                <span class="badge" style="background: rgba(0,200,133,0.15); color: var(--accent-green); font-size: 0.76rem;">${managerAge}a · ${managerCountry}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 14px;">
                <span style="font-size: 0.84rem; color: #94a3b8;">FILOSOFÍA: <strong style="color: var(--accent-gold); font-weight: 900;">${MANAGER_ARCHETYPES[selectedArchetype]?.name || 'TIKI-TAKA'}</strong></span>
                <button id="btnBackToStep2" class="btn-secondary" style="padding: 8px 16px; font-size: 0.8rem; font-weight: 800; border-radius: 8px;">
                  ✏️ CAMBIAR
                </button>
              </div>
            </div>

            <!-- BOTONES SELECTORES DE PESTAÑA: OFERTAS NACIONALES VS CUALQUIER CLUB FAVORITO -->
            <div class="glass-panel mb-4" style="padding: 8px; border: 1px solid rgba(255,255,255,0.1); background: #0b111e; border-radius: 14px; display: flex; gap: 10px;">
              <button id="tabBtnRecommended" class="btn-tab-step ${step3Tab === 'RECOMMENDED' ? 'active' : ''}" style="flex: 1; padding: 12px 18px; border-radius: 10px; font-weight: 900; font-size: 0.92rem; border: 1px solid ${step3Tab === 'RECOMMENDED' ? 'var(--accent-green)' : 'transparent'}; background: ${step3Tab === 'RECOMMENDED' ? 'linear-gradient(135deg, rgba(0,200,133,0.2) 0%, rgba(0,150,199,0.2) 100%)' : 'transparent'}; color: ${step3Tab === 'RECOMMENDED' ? 'var(--accent-green)' : '#94a3b8'}; cursor: pointer; transition: all 0.2s ease;">
                📩 3 OFERTAS RECOMENDADAS (${managerCountry.toUpperCase()})
              </button>
              <button id="tabBtnFavorite" class="btn-tab-step ${step3Tab === 'FAVORITE' ? 'active' : ''}" style="flex: 1; padding: 12px 18px; border-radius: 10px; font-weight: 900; font-size: 0.92rem; border: 1px solid ${step3Tab === 'FAVORITE' ? 'var(--accent-gold)' : 'transparent'}; background: ${step3Tab === 'FAVORITE' ? 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(229,169,60,0.1) 100%)' : 'transparent'}; color: ${step3Tab === 'FAVORITE' ? 'var(--accent-gold)' : '#94a3b8'}; cursor: pointer; transition: all 0.2s ease;">
                ⭐ ELEGIR MI CLUB FAVORITO (LIBRE ELECCIÓN)
              </button>
            </div>

            <!-- CONTENIDO DE LA PESTAÑA SELECCIONADA -->
            <div id="step3ContentContainer"></div>
          </div>
        ` : ''}

        <!-- PASO 4: CONFIGURACIÓN DE EXPERIENCIA -->
        ${currentStep === 4 ? `
          <div class="glass-panel" style="width: 100%; max-width: 700px; padding: 32px; border: 1px solid rgba(255,255,255,0.1); background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(16px); border-radius: 18px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
            <div class="text-center mb-4">
              <h3 style="color: var(--accent-cyan); font-size: 1.35rem; font-weight: 900; margin-bottom: 4px;">⚙️ AJUSTES Y DIFICULTAD DE LA PARTIDA</h3>
              <p class="text-sub" style="font-size: 0.86rem; color: #94a3b8;">Personaliza el nivel de realismo y simulación para tus 25 temporadas:</p>
            </div>

            <!-- Frecuencia de Eventos -->
            <div class="form-group mb-4" style="background:#0b111e; padding:18px; border-radius:12px; border:1px solid rgba(255,255,255,0.08);">
              <label class="form-label" style="font-size: 0.88rem; font-weight: 900; color: var(--accent-gold); margin-bottom: 6px; display: block;">🚨 Frecuencia de Eventos Inesperados & Crisis:</label>
              <select id="selectEventFreqConfig" class="input-select" style="width: 100%; padding: 12px; border-radius: 10px; background: #141d2e; border: 1px solid var(--border-color); color: #fff; font-size: 0.9rem;">
                <option value="off" ${eventFrequency === 'off' ? 'selected' : ''}>Desactivado (Experiencia Lineal sin imprevistos)</option>
                <option value="baja" ${eventFrequency === 'baja' ? 'selected' : ''}>Baja (2 eventos por temporada)</option>
                <option value="normal" ${eventFrequency === 'normal' ? 'selected' : ''}>Normal (4 eventos por temporada — Recomendado)</option>
                <option value="alta" ${eventFrequency === 'alta' ? 'selected' : ''}>Alta (8 eventos por temporada — Máxima tensión)</option>
              </select>
            </div>

            <!-- Sistema de Regens PES -->
            <div class="form-group mb-4" style="background:#0b111e; padding:18px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <label class="form-label" style="font-size: 0.88rem; font-weight: 900; color: var(--accent-green); margin:0;">♻️ Sistema de Regens Nostálgico (PES):</label>
                <p class="text-sub" style="font-size:0.78rem; color:#94a3b8; margin:4px 0 0 0;">Jugadores retirados reaparecen con 16 años en sus clubes de origen.</p>
              </div>
              <input type="checkbox" id="checkEnableRegensConfig" ${enableRegens ? 'checked' : ''} style="width:22px; height:22px; cursor:pointer; accent-color: var(--accent-green);" />
            </div>

            <!-- Mercado de Entrenadores IA -->
            <div class="form-group mb-4" style="background:#0b111e; padding:18px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <label class="form-label" style="font-size: 0.88rem; font-weight: 900; color: var(--accent-cyan); margin:0;">🧑‍💼 Mercado Global de Entrenadores IA:</label>
                <p class="text-sub" style="font-size:0.78rem; color:#94a3b8; margin:4px 0 0 0;">Despidos dinámicos y fichajes de DTs en clubes rivales durante la temporada.</p>
              </div>
              <input type="checkbox" id="checkEnableManagerMarketConfig" ${enableManagerMarket ? 'checked' : ''} style="width:22px; height:22px; cursor:pointer; accent-color: var(--accent-cyan);" />
            </div>

            <div style="display: flex; gap: 16px;">
              <button id="btnBackToStep3" class="btn-secondary" style="flex: 1; padding: 14px; font-weight: 800; border-radius: 12px;">
                ⬅️ VOLVER A CLUBES
              </button>
              <button id="btnConfirmStartGame" class="btn-primary btn-large" style="flex: 2; font-size: 1.05rem; font-weight: 900; padding: 14px; border-radius: 12px; background: linear-gradient(135deg, var(--accent-gold) 0%, #e5a93c 100%); color: #000; box-shadow: 0 6px 20px rgba(245,158,11,0.35);">
                🚀 INICIAR MI CARRERA PROFESIONAL ➔
              </button>
            </div>
          </div>
        ` : ''}

      </div>
    `;

    // EVENT LISTENERS POR PASO
    if (currentStep === 1) {
      const nameInput = document.getElementById('inputManagerName') as HTMLInputElement;
      const ageInput = document.getElementById('inputManagerAge') as HTMLInputElement;
      const countryCard = document.getElementById('selectedCountryCard')!;
      const countryModal = document.getElementById('countryGridModal')!;

      nameInput.addEventListener('input', (e) => { managerName = (e.target as HTMLInputElement).value; });
      ageInput.addEventListener('input', (e) => { managerAge = parseInt((e.target as HTMLInputElement).value) || 35; });

      document.querySelectorAll('.btn-quick-age').forEach(btn => {
        btn.addEventListener('click', (e) => {
          sfx.playClick();
          const age = parseInt((e.currentTarget as HTMLElement).dataset.age || '35');
          managerAge = age;
          if (ageInput) ageInput.value = age.toString();
        });
      });

      countryCard.addEventListener('click', () => {
        sfx.playClick();
        countryModal.classList.toggle('hidden');
      });

      document.querySelectorAll('.country-option-item').forEach(item => {
        item.addEventListener('click', (e) => {
          sfx.playClick();
          managerCountry = (e.currentTarget as HTMLElement).dataset.country!;
          countryModal.classList.add('hidden');

          const displayCountry = document.getElementById('displayCountryName');
          const noteCountry = document.getElementById('noteCountryText');
          if (displayCountry) displayCountry.innerText = managerCountry;
          if (noteCountry) noteCountry.innerText = managerCountry;

          countryCard.querySelector('div')!.innerHTML = `
            ${renderCountryFlagSVG(managerCountry, 28)}
            <strong style="font-size: 1.1rem; color: #ffffff;">${managerCountry}</strong>
          `;
        });
      });

      document.getElementById('btnNextToStep2')!.addEventListener('click', () => {
        sfx.playClick();
        managerName = nameInput.value || 'Director Técnico';
        currentStep = 2;
        renderStep();
      });
    } else if (currentStep === 2) {
      document.querySelectorAll('.archetype-card-step').forEach(card => {
        card.addEventListener('click', (e) => {
          sfx.playClick();
          selectedArchetype = (e.currentTarget as HTMLElement).dataset.id as ManagerArchetypeKey;
          document.querySelectorAll<HTMLElement>('.archetype-card-step').forEach(c => {
            c.classList.remove('selected');
            c.style.borderColor = 'rgba(255,255,255,0.08)';
            c.style.background = '#0b111e';
          });
          (e.currentTarget as HTMLElement).classList.add('selected');
          (e.currentTarget as HTMLElement).style.borderColor = MANAGER_ARCHETYPES[selectedArchetype]?.badgeColor || 'var(--accent-green)';
          (e.currentTarget as HTMLElement).style.background = '#141d2e';
        });
      });

      document.getElementById('btnBackToStep1')!.addEventListener('click', () => {
        sfx.playClick();
        currentStep = 1;
        renderStep();
      });

      document.getElementById('btnNextToStep3')!.addEventListener('click', () => {
        sfx.playWhistle();
        currentStep = 3;
        renderStep();
        renderStep3Content();
      });
    } else if (currentStep === 3) {
      document.getElementById('btnBackToStep2')?.addEventListener('click', () => {
        sfx.playClick();
        currentStep = 2;
        renderStep();
      });

      document.getElementById('tabBtnRecommended')?.addEventListener('click', () => {
        sfx.playClick();
        step3Tab = 'RECOMMENDED';
        renderStep();
        renderStep3Content();
      });

      document.getElementById('tabBtnFavorite')?.addEventListener('click', () => {
        sfx.playClick();
        step3Tab = 'FAVORITE';
        renderStep();
        renderStep3Content();
      });

      renderStep3Content();
    } else if (currentStep === 4) {
      document.getElementById('btnBackToStep3')?.addEventListener('click', () => {
        sfx.playClick();
        currentStep = 3;
        renderStep();
        renderStep3Content();
      });

      document.getElementById('btnConfirmStartGame')?.addEventListener('click', () => {
        const freqSelect = document.getElementById('selectEventFreqConfig') as HTMLSelectElement | null;
        const regensCheck = document.getElementById('checkEnableRegensConfig') as HTMLInputElement | null;
        const marketCheck = document.getElementById('checkEnableManagerMarketConfig') as HTMLInputElement | null;

        if (freqSelect) eventFrequency = freqSelect.value as EventFrequency;
        if (regensCheck) enableRegens = regensCheck.checked;
        if (marketCheck) enableManagerMarket = marketCheck.checked;

        sfx.playGoal();
        db.newCareer(selectedTeamIdForStart!, managerName, managerCountry, managerAge, selectedArchetype, {
          eventFrequency,
          enableRegens,
          enableManagerMarket
        });
        onCareerStarted();
      });
    }
  };

  /**
   * Renderiza el contenido del Paso 3 (Ofertas Recomendadas o Buscador de Club Favorito)
   */
  const renderStep3Content = () => {
    const containerEl = document.getElementById('step3ContentContainer');
    if (!containerEl) return;

    if (step3Tab === 'RECOMMENDED') {
      const offers = getMatchingTeams();

      containerEl.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
          ${offers.map(o => `
            <div class="team-select-card glass-panel text-center" style="border: 1px solid rgba(255,255,255,0.1); padding: 24px; border-radius: 16px; background: rgba(18, 24, 38, 0.9); backdrop-filter: blur(12px); display: flex; flex-direction: column; justify-content: space-between; transition: all 0.25s ease;">
              <div>
                <span class="badge mb-2" style="background: ${o.badgeColor}; color: #000; font-weight: 900; font-size: 0.78rem; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px;">${o.projectType}</span>
                
                <div style="margin: 18px 0; display: flex; justify-content: center; align-items: center; min-height: 70px;">
                  ${renderTeamBadgeSVG(o.team, 72)}
                </div>

                <h3 style="margin-top: 4px; font-size: 1.3rem; font-weight: 900; color: #ffffff;">${o.team.name}</h3>
                <span class="text-sub" style="font-size: 0.84rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; justify-content: center; color: #94a3b8;">
                  ${renderCountryFlagSVG(o.team.country, 18)} ${o.team.country} — ${o.team.leagueName}
                </span>

                <!-- CARTA NARRATIVA DE LA JUNTA DIRECTIVA -->
                <div style="background: #0b111e; border: 1px solid var(--border-color); padding: 14px; border-radius: 12px; margin: 16px 0; text-align: left; font-size: 0.82rem; line-height: 1.45; color: #cbd5e1;">
                  📩 <strong>Carta de la Comisión Directiva:</strong><br>
                  <em style="color: #94a3b8;">"${o.letterMessage}"</em>
                </div>

                <div style="background: #080d16; padding: 12px 14px; border-radius: 10px; margin-bottom: 16px; text-align: left; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.04);">
                  <p style="margin-bottom: 6px; color: #fff;">📊 <strong>Nivel Plantilla:</strong> <span style="color: var(--accent-cyan); font-weight: 800;">OVR ${o.team.overall}</span></p>
                  <p style="margin-bottom: 0; color: #fff;">💰 <strong>Presupuesto Fichajes:</strong> <strong class="text-highlight" style="color: var(--accent-gold);">€${(o.team.budget / 1000000).toFixed(1)}M</strong></p>
                </div>
              </div>

              <button class="btn-primary btn-sign-club" data-id="${o.team.id}" style="width: 100%; padding: 14px; font-weight: 900; font-size: 0.98rem; background: linear-gradient(135deg, var(--accent-green) 0%, #0096c7 100%); color: #000; border-radius: 12px; border: none; box-shadow: 0 4px 15px rgba(0,200,133,0.3); cursor: pointer;">
                ✍️ FIRMAR CON ${o.team.name.toUpperCase()} ➔
              </button>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      // PESTAÑA: ELECCIÓN DE CLUB FAVORITO (TODAS LAS LIGAS)
      const allEnrichedTeams = getAllEnrichedTeams();
      const leagues = db.leagues;

      // Filtrar por liga seleccionada y por query de búsqueda
      let filteredTeams = allEnrichedTeams;
      if (favoriteFilterLeagueId !== 'ALL') {
        filteredTeams = filteredTeams.filter(t => t.leagueId === favoriteFilterLeagueId);
      }
      if (favoriteSearchQuery.trim()) {
        const q = favoriteSearchQuery.toLowerCase().trim();
        filteredTeams = filteredTeams.filter(t => 
          t.name.toLowerCase().includes(q) || 
          t.country.toLowerCase().includes(q) || 
          t.leagueName.toLowerCase().includes(q)
        );
      }

      containerEl.innerHTML = `
        <div class="glass-panel" style="padding: 24px; border-radius: 16px; background: rgba(18, 24, 38, 0.9); border: 1px solid rgba(255,255,255,0.1);">
          
          <!-- FILTROS Y BARRA DE BÚSQUEDA -->
          <div style="display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; align-items: center;">
            <div style="flex: 1; min-width: 240px;">
              <label style="font-size: 0.8rem; font-weight: 800; color: var(--accent-gold); display: block; margin-bottom: 4px;">🔍 Buscar Club por Nombre:</label>
              <input type="text" id="inputSearchFavorite" class="input-text" value="${favoriteSearchQuery}" placeholder="Ej: Alianza Lima, Universitario, Real Madrid, Barcelona, Boca..." style="width: 100%; padding: 10px 14px; border-radius: 10px; background: #0b111e; border: 1px solid var(--border-color); color: #fff; font-size: 0.9rem;" />
            </div>

            <div style="flex: 1; min-width: 240px;">
              <label style="font-size: 0.8rem; font-weight: 800; color: var(--accent-cyan); display: block; margin-bottom: 4px;">🏆 Filtrar por Liga / Competición:</label>
              <select id="selectLeagueFavorite" class="input-select" style="width: 100%; padding: 10px 14px; border-radius: 10px; background: #0b111e; border: 1px solid var(--border-color); color: #fff; font-size: 0.9rem;">
                <option value="ALL" ${favoriteFilterLeagueId === 'ALL' ? 'selected' : ''}>🌐 TODAS LAS LIGAS (${allEnrichedTeams.length} Clubes)</option>
                ${leagues.map(l => `
                  <option value="${l.id}" ${favoriteFilterLeagueId === l.id ? 'selected' : ''}>
                    ${l.country} — ${l.name} (${l.teams.length} equipos)
                  </option>
                `).join('')}
              </select>
            </div>
          </div>

          <div style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 16px;">
            Mostrando <strong>${filteredTeams.length}</strong> club(es) disponible(s). Haz clic en <strong>"Elegir Club"</strong> para comenzar tu trayectoria:
          </div>

          <!-- REJILLA DE CLUBES PARA SELECCIÓN LIBRE -->
          <div style="max-height: 480px; overflow-y: auto; padding-right: 6px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
            ${filteredTeams.length === 0 ? `
              <div style="grid-column: span 3; padding: 40px; text-align: center; color: #94a3b8;">
                ❌ No se encontraron clubes que coincidan con "${favoriteSearchQuery}". Intenta buscar otro nombre o cambiar de liga.
              </div>
            ` : filteredTeams.map(t => `
              <div class="team-fav-card" style="background: #0b111e; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease;">
                <div>
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                    ${renderTeamBadgeSVG(t, 42)}
                    <div style="flex: 1; min-width: 0;">
                      <h4 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.name}</h4>
                      <span style="font-size: 0.76rem; color: #94a3b8; display: flex; align-items: center; gap: 4px;">
                        ${renderCountryFlagSVG(t.country, 14)} ${t.leagueName}
                      </span>
                    </div>
                  </div>

                  <div style="display: flex; justify-content: space-between; background: #070b13; padding: 8px 12px; border-radius: 8px; font-size: 0.78rem; margin-bottom: 12px;">
                    <span>📊 Media: <strong style="color: var(--accent-cyan); font-weight: 800;">OVR ${t.overall}</strong></span>
                    <span>💰 Presupuesto: <strong style="color: var(--accent-gold); font-weight: 800;">€${(t.budget / 1000000).toFixed(1)}M</strong></span>
                  </div>
                </div>

                <button class="btn-primary btn-sign-club" data-id="${t.id}" style="width: 100%; padding: 10px; font-weight: 900; font-size: 0.85rem; background: linear-gradient(135deg, var(--accent-gold) 0%, #e5a93c 100%); color: #000; border-radius: 10px; border: none; cursor: pointer;">
                  ✍️ ELEGIR ${t.short || t.name} ➔
                </button>
              </div>
            `).join('')}
          </div>

        </div>
      `;

      // Event listeners para la pestaña de club favorito
      const searchInput = document.getElementById('inputSearchFavorite') as HTMLInputElement | null;
      const leagueSelect = document.getElementById('selectLeagueFavorite') as HTMLSelectElement | null;

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          favoriteSearchQuery = (e.target as HTMLInputElement).value;
          renderStep3Content();
        });
      }

      if (leagueSelect) {
        leagueSelect.addEventListener('change', (e) => {
          favoriteFilterLeagueId = (e.target as HTMLSelectElement).value;
          renderStep3Content();
        });
      }
    }

    // Registrar evento clic para el botón de firmas
    document.querySelectorAll('.btn-sign-club').forEach(btn => {
      btn.addEventListener('click', (e) => {
        selectedTeamIdForStart = (e.currentTarget as HTMLElement).dataset.id!;
        sfx.playClick();
        currentStep = 4;
        renderStep();
      });
    });
  };

  renderStep();
}
