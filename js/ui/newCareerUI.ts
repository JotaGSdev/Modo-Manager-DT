/**
 * ============================================================================
 * ENTRENADOR LEYENDA - SELECCIÓN INICIAL DE CARRERA (newCareerUI.ts v3.3)
 * ============================================================================
 * Flujo de Inicio de Carrera en 4 Pasos — Diseño Profesional & Libre Elección:
 * 1. PASO 1: Perfil del DT (Nombre personalizable, Edad a elección, País sin preselección).
 * 2. PASO 2: Filosofía Táctica (Diseño armónico ejecutivo sin saturación de colores).
 * 3. PASO 3: Selección de Club (Libre elección por defecto + Buscador fluido sin pérdida de foco + 3 Ofertas).
 * 4. PASO 4: Configuración de Partida (Ajustes adaptados con paleta sobria).
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

  // 1. Datos iniciales del DT (Sin pre-selección forzada)
  let managerName = ''; // Inicialmente vacío
  let managerAge = 35;
  let managerCountry = ''; // Sin país preseleccionado por defecto
  let selectedArchetype: ManagerArchetypeKey = 'TIKI_TAKA';

  // 2. Opciones avanzadas de partida (Paso 4)
  let eventFrequency: EventFrequency = 'normal';
  let enableRegens = true;
  let enableManagerMarket = true;

  // 3. Selección de club para iniciar la carrera
  let selectedTeamIdForStart: string | null = null;

  // 4. Estado del Paso 3 (FAVORITE por defecto según requerimiento 1)
  let step3Tab: 'RECOMMENDED' | 'FAVORITE' = 'FAVORITE';
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
   * Selecciona 3 proyectos recomendados del país de origen del DT (o Perú/global si no seleccionó país aún)
   */
  const getMatchingTeams = (): ClubOffer[] => {
    const targetCountry = managerCountry || 'Perú';
    let homeCountryLeagues = db.leagues.filter(l => l.country.toLowerCase() === targetCountry.toLowerCase());

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
      colors: ['#10b981', '#000000'],
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
        badgeColor: '#10b981',
        letterMessage: `La comisión de ${club1.name} en ${targetCountry} apuesta por darte tu primera oportunidad como DT profesional para plasmar tu estilo de ${archetypeData.name}.`
      },
      {
        team: club2,
        projectType: '⚽ PROYECTO DE DESARROLLO NACIONAL',
        badgeColor: '#38bdf8',
        letterMessage: `La directiva de ${club2.name} te invita a asumir tu primer contrato de 3 años para potenciar la plantilla con tu modelo táctico de ${archetypeData.name}.`
      },
      {
        team: club3,
        projectType: '🏟️ PROYECTO BASE DE SU PAÍS',
        badgeColor: '#f59e0b',
        letterMessage: `En ${club3.name} confían en tus ideas de ${archetypeData.name} para consolidar el equipo en la liga nacional durante tus primeros 3 años de experiencia.`
      }
    ];
  };

  /**
   * Renderiza el paso activo con diseño profesional sobrio (Obsidian + Emerald Theme)
   */
  const renderStep = () => {
    container.innerHTML = `
      <div style="min-height: 100vh; background: radial-gradient(circle at top center, #0e1726 0%, #060911 100%); display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px; color: #f8fafc; font-family: 'Inter', system-ui, sans-serif;">
        
        <!-- ENCABEZADO DE NAVEGACIÓN DE CARRERA -->
        <div class="text-center mb-4" style="max-width: 780px;">
          <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 5px 16px; border-radius: 20px; color: #10b981; font-weight: 800; font-size: 0.78rem; margin-bottom: 12px; letter-spacing: 0.5px;">
            ⚽ MODO MANAGER DT (TEMPORADA 1 DE 25 — 2026/2027)
          </div>
          <h1 style="font-size: 2.1rem; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 6px; color: #ffffff;">
            ${currentStep === 1 ? '🎙️ PASO 1: PERFIL DEL DIRECTOR TÉCNICO' : (currentStep === 2 ? '🧩 PASO 2: FILOSOFÍA TÁCTICA DEL ENTRENADOR' : (currentStep === 3 ? '💼 PASO 3: SELECCIÓN DE TU CLUB DE FÚTBOL' : '⚙️ PASO 4: CONFIGURACIÓN DE PARTIDA'))}
          </h1>
          <p class="text-sub" style="font-size: 0.9rem; color: #94a3b8; margin: 0;">
            ${currentStep === 1 ? 'Ingresa tus datos personales de DT y selecciona tu país de origen:' : (currentStep === 2 ? 'Define tu modelo táctico de juego. Marcará el estilo de tu equipo en los partidos:' : (currentStep === 3 ? 'Selecciona tu club favorito para dirigir o revisa ofertas recomendadas:' : 'Ajusta la dificultad y el nivel de simulación para tus 25 temporadas:'))}
          </p>
        </div>

        <!-- INDICADOR DE PROGRESO INTERACTIVO DE 4 PASOS -->
        <div style="display: flex; gap: 8px; margin-bottom: 26px; width: 100%; max-width: 640px; justify-content: center;">
          <div class="step-pill ${currentStep >= 1 ? 'active' : ''}" style="flex: 1; padding: 7px; border-radius: 8px; background: ${currentStep >= 1 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.5)'}; border: 1px solid ${currentStep >= 1 ? '#10b981' : 'rgba(255,255,255,0.08)'}; text-align: center; font-size: 0.75rem; font-weight: 800; color: ${currentStep >= 1 ? '#10b981' : '#64748b'}; transition: all 0.25s ease;">
            1. 👤 PERFIL
          </div>
          <div class="step-pill ${currentStep >= 2 ? 'active' : ''}" style="flex: 1; padding: 7px; border-radius: 8px; background: ${currentStep >= 2 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.5)'}; border: 1px solid ${currentStep >= 2 ? '#10b981' : 'rgba(255,255,255,0.08)'}; text-align: center; font-size: 0.75rem; font-weight: 800; color: ${currentStep >= 2 ? '#10b981' : '#64748b'}; transition: all 0.25s ease;">
            2. 🧩 TÁCTICA
          </div>
          <div class="step-pill ${currentStep >= 3 ? 'active' : ''}" style="flex: 1; padding: 7px; border-radius: 8px; background: ${currentStep >= 3 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.5)'}; border: 1px solid ${currentStep >= 3 ? '#10b981' : 'rgba(255,255,255,0.08)'}; text-align: center; font-size: 0.75rem; font-weight: 800; color: ${currentStep >= 3 ? '#10b981' : '#64748b'}; transition: all 0.25s ease;">
            3. 🏟️ CLUB
          </div>
          <div class="step-pill ${currentStep >= 4 ? 'active' : ''}" style="flex: 1; padding: 7px; border-radius: 8px; background: ${currentStep >= 4 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.5)'}; border: 1px solid ${currentStep >= 4 ? '#10b981' : 'rgba(255,255,255,0.08)'}; text-align: center; font-size: 0.75rem; font-weight: 800; color: ${currentStep >= 4 ? '#10b981' : '#64748b'}; transition: all 0.25s ease;">
            4. ⚙️ AJUSTES
          </div>
        </div>

        <!-- PASO 1: PERFIL DEL DT (REQUERIMIENTO 2: NOMBRE VACÍO + EDAD A ELECCIÓN + PAÍS SIN PRESELECCIONAR) -->
        ${currentStep === 1 ? `
          <div class="glass-panel" style="width: 100%; max-width: 660px; padding: 30px; border: 1px solid rgba(255,255,255,0.08); background: rgba(13, 19, 32, 0.9); backdrop-filter: blur(16px); border-radius: 16px;">
            
            <div style="display: flex; align-items: center; gap: 16px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 16px; margin-bottom: 22px;">
              <div style="background: rgba(16, 185, 129, 0.15); width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; border: 1px solid rgba(16, 185, 129, 0.3);">
                👔
              </div>
              <div>
                <h3 style="margin: 0; font-size: 1.15rem; font-weight: 900; color: #ffffff;">Registro de Entrenador Principal</h3>
                <span class="text-sub" style="font-size: 0.8rem; color: #94a3b8;">0 Años de Experiencia Previa · Contrato Inicial de 3 Temporadas</span>
              </div>
            </div>

            <!-- CAMPO NOMBRE (INICIALMENTE VACÍO) -->
            <div class="form-group mb-4">
              <label class="form-label" style="font-size: 0.84rem; font-weight: 800; color: #f8fafc; margin-bottom: 6px; display: block;">👤 Nombre Completo del DT:</label>
              <input type="text" id="inputManagerName" class="input-text" value="${managerName}" style="width: 100%; font-size: 0.95rem; padding: 11px 14px; border-radius: 10px; background: #080d16; border: 1px solid rgba(255,255,255,0.12); color: #fff;" placeholder="Escribe tu nombre de entrenador..." />
            </div>

            <!-- CAMPO EDAD LIBRE A ELECCIÓN -->
            <div class="form-group mb-4">
              <label class="form-label" style="font-size: 0.84rem; font-weight: 800; color: #f8fafc; margin-bottom: 6px; display: block;">🎂 Edad de Preferencia (Años):</label>
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <input type="number" id="inputManagerAge" class="input-text" value="${managerAge}" min="30" max="65" style="width: 110px; font-size: 1rem; text-align: center; padding: 9px; border-radius: 10px; background: #080d16; border: 1px solid rgba(255,255,255,0.12); color: #fff; font-weight: 900;" />
                <div style="display: flex; gap: 6px;">
                  <button class="btn-secondary btn-quick-age" data-age="30" style="padding: 6px 10px; font-size: 0.75rem; border-radius: 6px; background: #131c2e; border: 1px solid rgba(255,255,255,0.08); color:#cbd5e1;">30a</button>
                  <button class="btn-secondary btn-quick-age" data-age="35" style="padding: 6px 10px; font-size: 0.75rem; border-radius: 6px; background: #131c2e; border: 1px solid rgba(255,255,255,0.08); color:#cbd5e1;">35a</button>
                  <button class="btn-secondary btn-quick-age" data-age="40" style="padding: 6px 10px; font-size: 0.75rem; border-radius: 6px; background: #131c2e; border: 1px solid rgba(255,255,255,0.08); color:#cbd5e1;">40a</button>
                  <button class="btn-secondary btn-quick-age" data-age="45" style="padding: 6px 10px; font-size: 0.75rem; border-radius: 6px; background: #131c2e; border: 1px solid rgba(255,255,255,0.08); color:#cbd5e1;">45a</button>
                  <button class="btn-secondary btn-quick-age" data-age="50" style="padding: 6px 10px; font-size: 0.75rem; border-radius: 6px; background: #131c2e; border: 1px solid rgba(255,255,255,0.08); color:#cbd5e1;">50a</button>
                </div>
              </div>
            </div>

            <!-- PAÍS DE ORIGEN (SIN PRESELECCIONAR) -->
            <div class="form-group mb-4">
              <label class="form-label" style="font-size: 0.84rem; font-weight: 800; color: #f8fafc; margin-bottom: 6px; display: block;">🌎 Selección de País de Origen:</label>
              
              <div id="selectedCountryCard" style="background: #080d16; border: 1px dashed ${managerCountry ? '#10b981' : 'rgba(255,255,255,0.2)'}; padding: 12px 16px; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s ease;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  ${managerCountry ? renderCountryFlagSVG(managerCountry, 26) : '<span style="font-size: 1.4rem;">🌐</span>'}
                  <strong style="font-size: 1rem; color: ${managerCountry ? '#ffffff' : '#94a3b8'};" id="displayCountryName">
                    ${managerCountry || 'Haz clic para seleccionar tu país natal...'}
                  </strong>
                </div>
                <span style="font-size: 0.76rem; background: #10b981; color: #000; font-weight: 900; padding: 5px 12px; border-radius: 6px;">SELECCIONAR PAÍS 🔽</span>
              </div>

              <!-- REJILLA DESPLEGABLE DE PAÍSES -->
              <div id="countryGridModal" class="hidden" style="margin-top: 10px; max-height: 220px; overflow-y: auto; background: #080d16; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 10px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                ${countriesInDB.map(c => `
                  <div class="country-option-item" data-country="${c}" style="display: flex; align-items: center; gap: 10px; background: ${c === managerCountry ? '#13232c' : '#0e1626'}; border: 1px solid ${c === managerCountry ? '#10b981' : 'rgba(255,255,255,0.06)'}; padding: 9px 12px; border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">
                    ${renderCountryFlagSVG(c, 22)}
                    <span style="font-size: 0.86rem; font-weight: 700; color: #fff;">${c}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div id="countryWarningMsg" class="hidden mb-3" style="color: #ef4444; font-size: 0.8rem; font-weight: 800; background: rgba(239,68,68,0.1); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(239,68,68,0.2);">
              ⚠️ Por favor selecciona tu país de origen para continuar.
            </div>

            <button id="btnNextToStep2" class="btn-primary btn-large" style="width: 100%; font-size: 1rem; font-weight: 900; padding: 13px; border-radius: 10px; background: #10b981; color: #000; border: none; cursor: pointer; transition: all 0.2s ease;">
              SIGUIENTE: FILOSOFÍA TÁCTICA ➔
            </button>
          </div>
        ` : ''}

        <!-- PASO 2: SELECCIÓN DE FILOSOFÍA TÁCTICA (DISEÑO PROFESIONAL ARMONIOSO) -->
        ${currentStep === 2 ? `
          <div class="glass-panel" style="width: 100%; max-width: 900px; padding: 30px; border: 1px solid rgba(255,255,255,0.08); background: rgba(13, 19, 32, 0.9); backdrop-filter: blur(16px); border-radius: 16px;">
            <div class="text-center mb-4">
              <h3 style="color: #ffffff; font-size: 1.25rem; font-weight: 900; margin-bottom: 4px;">🧩 FILOSOFÍA TÁCTICA DEL ENTRENADOR</h3>
              <p class="text-sub" style="font-size: 0.85rem; color: #94a3b8;">Selecciona la identidad futbolística que imprimirás a tu equipo:</p>
            </div>

            <!-- REJILLA ARMONIOSA DE 5 ARQUETIPOS -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px;">
              
              <!-- 1. TIKI TAKA -->
              <div class="archetype-card-step ${selectedArchetype === 'TIKI_TAKA' ? 'selected' : ''}" 
                   data-id="TIKI_TAKA" 
                   style="padding: 18px 14px; cursor: pointer; border: 1px solid ${selectedArchetype === 'TIKI_TAKA' ? '#10b981' : 'rgba(255,255,255,0.08)'}; background: ${selectedArchetype === 'TIKI_TAKA' ? 'rgba(16, 185, 129, 0.08)' : '#0e1626'}; border-radius: 12px; transition: all 0.2s ease; position: relative;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                  <span style="font-size: 1.8rem;">⚽</span>
                  ${selectedArchetype === 'TIKI_TAKA' ? '<span style="font-size: 0.68rem; background: #10b981; color: #000; font-weight: 900; padding: 2px 6px; border-radius: 4px;">✓ ELEGIDO</span>' : ''}
                </div>
                <h4 style="font-size: 0.95rem; font-weight: 900; color: #ffffff; margin-bottom: 4px;">TIKI-TAKA & POSESIÓN</h4>
                <span style="font-size: 0.74rem; display: block; margin-bottom: 8px; color: #94a3b8;">Juego de Posición & Pase Corto</span>
                <div style="background: rgba(255,255,255,0.05); color: #cbd5e1; padding: 4px 6px; border-radius: 6px; font-weight: 700; font-size: 0.7rem; margin-bottom: 8px;">
                  +8 Pases Cortos | Posesión
                </div>
                <p style="font-size: 0.76rem; color: #94a3b8; line-height: 1.4; margin: 0;">
                  Construcción paciente desde atrás, triangulaciones de apoyo y control de la pelota.
                </p>
              </div>

              <!-- 2. GEGENPRESSING -->
              <div class="archetype-card-step ${selectedArchetype === 'GEGENPRESSING' ? 'selected' : ''}" 
                   data-id="GEGENPRESSING" 
                   style="padding: 18px 14px; cursor: pointer; border: 1px solid ${selectedArchetype === 'GEGENPRESSING' ? '#10b981' : 'rgba(255,255,255,0.08)'}; background: ${selectedArchetype === 'GEGENPRESSING' ? 'rgba(16, 185, 129, 0.08)' : '#0e1626'}; border-radius: 12px; transition: all 0.2s ease; position: relative;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                  <span style="font-size: 1.8rem;">⚡</span>
                  ${selectedArchetype === 'GEGENPRESSING' ? '<span style="font-size: 0.68rem; background: #10b981; color: #000; font-weight: 900; padding: 2px 6px; border-radius: 4px;">✓ ELEGIDO</span>' : ''}
                </div>
                <h4 style="font-size: 0.95rem; font-weight: 900; color: #ffffff; margin-bottom: 4px;">GEGENPRESSING & PRESIÓN</h4>
                <span style="font-size: 0.74rem; display: block; margin-bottom: 8px; color: #94a3b8;">Presión Tras Pérdida & Vértigo</span>
                <div style="background: rgba(255,255,255,0.05); color: #cbd5e1; padding: 4px 6px; border-radius: 6px; font-weight: 700; font-size: 0.7rem; margin-bottom: 8px;">
                  +8 Recuperación Alta | Vértigo
                </div>
                <p style="font-size: 0.76rem; color: #94a3b8; line-height: 1.4; margin: 0;">
                  Asfixia inmediata al rival tras perder el balón y ataque directo al espacio.
                </p>
              </div>

              <!-- 3. CATENACCIO -->
              <div class="archetype-card-step ${selectedArchetype === 'CATENACCIO' ? 'selected' : ''}" 
                   data-id="CATENACCIO" 
                   style="padding: 18px 14px; cursor: pointer; border: 1px solid ${selectedArchetype === 'CATENACCIO' ? '#10b981' : 'rgba(255,255,255,0.08)'}; background: ${selectedArchetype === 'CATENACCIO' ? 'rgba(16, 185, 129, 0.08)' : '#0e1626'}; border-radius: 12px; transition: all 0.2s ease; position: relative;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                  <span style="font-size: 1.8rem;">🚌</span>
                  ${selectedArchetype === 'CATENACCIO' ? '<span style="font-size: 0.68rem; background: #10b981; color: #000; font-weight: 900; padding: 2px 6px; border-radius: 4px;">✓ ELEGIDO</span>' : ''}
                </div>
                <h4 style="font-size: 0.95rem; font-weight: 900; color: #ffffff; margin-bottom: 4px;">CATENACCIO & BLOQUE BAJO</h4>
                <span style="font-size: 0.74rem; display: block; margin-bottom: 8px; color: #94a3b8;">El Autobús & Cerrojo Defensivo</span>
                <div style="background: rgba(255,255,255,0.05); color: #cbd5e1; padding: 4px 6px; border-radius: 6px; font-weight: 700; font-size: 0.7rem; margin-bottom: 8px;">
                  +8 Solidez Defensiva | Cerrojo
                </div>
                <p style="font-size: 0.76rem; color: #94a3b8; line-height: 1.4; margin: 0;">
                  Organización defensiva impenetrable en área propia, garra y balón parado.
                </p>
              </div>

            </div>

            <!-- SEGUNDA FILA -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px;">
              
              <div class="archetype-card-step ${selectedArchetype === 'WING_PLAY' ? 'selected' : ''}" 
                   data-id="WING_PLAY" 
                   style="padding: 16px; cursor: pointer; border: 1px solid ${selectedArchetype === 'WING_PLAY' ? '#10b981' : 'rgba(255,255,255,0.08)'}; background: ${selectedArchetype === 'WING_PLAY' ? 'rgba(16, 185, 129, 0.08)' : '#0e1626'}; border-radius: 12px; transition: all 0.2s ease; display: flex; align-items: center; gap: 14px;">
                <span style="font-size: 2rem;">🌊</span>
                <div style="flex: 1;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="font-size: 0.95rem; font-weight: 900; color: #ffffff; margin: 0;">JUEGO POR BANDAS & CENTROS</h4>
                    ${selectedArchetype === 'WING_PLAY' ? '<span style="font-size: 0.68rem; background: #10b981; color: #000; font-weight: 900; padding: 2px 6px; border-radius: 4px;">✓ ELEGIDO</span>' : ''}
                  </div>
                  <span style="font-size: 0.74rem; color: #94a3b8; display: block; margin-top: 2px;">Amplitud Total, Desborde y Centros al Área</span>
                  <div style="background: rgba(255,255,255,0.05); color: #cbd5e1; padding: 3px 6px; border-radius: 6px; font-weight: 700; font-size: 0.68rem; margin-top: 6px; display: inline-block;">
                    +8 Centros & Desborde | Remate Aéreo
                  </div>
                </div>
              </div>

              <div class="archetype-card-step ${selectedArchetype === 'DIRECT_ATTACK' ? 'selected' : ''}" 
                   data-id="DIRECT_ATTACK" 
                   style="padding: 16px; cursor: pointer; border: 1px solid ${selectedArchetype === 'DIRECT_ATTACK' ? '#10b981' : 'rgba(255,255,255,0.08)'}; background: ${selectedArchetype === 'DIRECT_ATTACK' ? 'rgba(16, 185, 129, 0.08)' : '#0e1626'}; border-radius: 12px; transition: all 0.2s ease; display: flex; align-items: center; gap: 14px;">
                <span style="font-size: 2rem;">🎯</span>
                <div style="flex: 1;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="font-size: 0.95rem; font-weight: 900; color: #ffffff; margin: 0;">CONTRAATAQUE DIRECTO</h4>
                    ${selectedArchetype === 'DIRECT_ATTACK' ? '<span style="font-size: 0.68rem; background: #10b981; color: #000; font-weight: 900; padding: 2px 6px; border-radius: 4px;">✓ ELEGIDO</span>' : ''}
                  </div>
                  <span style="font-size: 0.74rem; color: #94a3b8; display: block; margin-top: 2px;">Balón Largo a la Espalda y Zarpazos Verticales</span>
                  <div style="background: rgba(255,255,255,0.05); color: #cbd5e1; padding: 3px 6px; border-radius: 6px; font-weight: 700; font-size: 0.68rem; margin-top: 6px; display: inline-block;">
                    +8 Balón Largo | Velocidad
                  </div>
                </div>
              </div>

            </div>

            <div style="display: flex; gap: 14px;">
              <button id="btnBackToStep1" class="btn-secondary" style="flex: 1; padding: 12px; font-weight: 800; border-radius: 10px; background: #131c2e; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
                ⬅️ VOLVER AL PERFIL
              </button>
              <button id="btnNextToStep3" class="btn-primary btn-large" style="flex: 2; font-size: 1rem; font-weight: 900; padding: 12px; border-radius: 10px; background: #10b981; color: #000; border: none; cursor: pointer;">
                🔍 VER CLUBES & SELECCIÓN ➔
              </button>
            </div>
          </div>
        ` : ''}

        <!-- PASO 3: SELECCIÓN DE CLUB (REQUERIMIENTO 1: SIEMPRE LA ELECCIÓN FAVORITA POR DEFECTO + REQUERIMIENTO 4: BUSCADOR FLUIDO) -->
        ${currentStep === 3 ? `
          <div style="width: 100%; max-width: 1100px;">
            
            <!-- CABECERA RESUMEN DEL DT -->
            <div class="glass-panel mb-3" style="padding: 14px 20px; border: 1px solid rgba(255,255,255,0.08); background: rgba(13, 19, 32, 0.9); border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 10px;">
                ${managerCountry ? renderCountryFlagSVG(managerCountry, 22) : '🌐'}
                <span style="font-weight: 900; font-size: 0.95rem; color: #fff;">${managerName || 'Director Técnico'}</span>
                <span style="background: rgba(255,255,255,0.06); color: #cbd5e1; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${managerAge}a ${managerCountry ? `· ${managerCountry}` : ''}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 0.82rem; color: #94a3b8;">Estilo: <strong style="color: #10b981;">${MANAGER_ARCHETYPES[selectedArchetype]?.name || 'TIKI-TAKA'}</strong></span>
                <button id="btnBackToStep2" class="btn-secondary" style="padding: 6px 12px; font-size: 0.78rem; font-weight: 800; border-radius: 6px; background: #131c2e; border: 1px solid rgba(255,255,255,0.08); color:#cbd5e1;">
                  ✏️ Cambiar
                </button>
              </div>
            </div>

            <!-- SELECTOR DE PESTAÑA: FAVORITO ES LA OPCIÓN PRINCIPAL POR DEFECTO -->
            <div class="glass-panel mb-3" style="padding: 6px; border: 1px solid rgba(255,255,255,0.08); background: #080d16; border-radius: 12px; display: flex; gap: 8px;">
              <button id="tabBtnFavorite" class="btn-tab-step ${step3Tab === 'FAVORITE' ? 'active' : ''}" style="flex: 1; padding: 11px 16px; border-radius: 8px; font-weight: 900; font-size: 0.88rem; border: 1px solid ${step3Tab === 'FAVORITE' ? '#10b981' : 'transparent'}; background: ${step3Tab === 'FAVORITE' ? 'rgba(16, 185, 129, 0.15)' : 'transparent'}; color: ${step3Tab === 'FAVORITE' ? '#10b981' : '#94a3b8'}; cursor: pointer; transition: all 0.2s ease;">
                ⭐ ELEGIR MI CLUB FAVORITO (LIBRE ELECCIÓN)
              </button>
              <button id="tabBtnRecommended" class="btn-tab-step ${step3Tab === 'RECOMMENDED' ? 'active' : ''}" style="flex: 1; padding: 11px 16px; border-radius: 8px; font-weight: 900; font-size: 0.88rem; border: 1px solid ${step3Tab === 'RECOMMENDED' ? '#10b981' : 'transparent'}; background: ${step3Tab === 'RECOMMENDED' ? 'rgba(16, 185, 129, 0.15)' : 'transparent'}; color: ${step3Tab === 'RECOMMENDED' ? '#10b981' : '#94a3b8'}; cursor: pointer; transition: all 0.2s ease;">
                📩 3 OFERTAS RECOMENDADAS (${(managerCountry || 'PERÚ').toUpperCase()})
              </button>
            </div>

            <!-- CONTENEDOR PRINCIPAL DEL PASO 3 -->
            <div id="step3ContentContainer"></div>
          </div>
        ` : ''}

        <!-- PASO 4: CONFIGURACIÓN DE PARTIDA (AJUSTES ADAPTADOS CON ESTÉICA SOBRIA) -->
        ${currentStep === 4 ? `
          <div class="glass-panel" style="width: 100%; max-width: 660px; padding: 30px; border: 1px solid rgba(255,255,255,0.08); background: rgba(13, 19, 32, 0.9); backdrop-filter: blur(16px); border-radius: 16px;">
            <div class="text-center mb-4">
              <h3 style="color: #ffffff; font-size: 1.25rem; font-weight: 900; margin-bottom: 4px;">⚙️ AJUSTES Y DIFICULTAD DE PARTIDA</h3>
              <p class="text-sub" style="font-size: 0.85rem; color: #94a3b8;">Ajusta la frecuencia imprevista y sistemas dinámicos para tus 25 temporadas:</p>
            </div>

            <!-- Frecuencia de Eventos -->
            <div class="form-group mb-3" style="background:#080d16; padding:16px; border-radius:10px; border:1px solid rgba(255,255,255,0.06);">
              <label class="form-label" style="font-size: 0.85rem; font-weight: 800; color: #f8fafc; margin-bottom: 6px; display: block;">🚨 Eventos Inesperados & Crisis:</label>
              <select id="selectEventFreqConfig" class="input-select" style="width: 100%; padding: 10px 12px; border-radius: 8px; background: #0e1626; border: 1px solid rgba(255,255,255,0.12); color: #fff; font-size: 0.88rem;">
                <option value="off" ${eventFrequency === 'off' ? 'selected' : ''}>Desactivado (Sin imprevistos)</option>
                <option value="baja" ${eventFrequency === 'baja' ? 'selected' : ''}>Baja (2 eventos por temporada)</option>
                <option value="normal" ${eventFrequency === 'normal' ? 'selected' : ''}>Normal (4 eventos por temporada — Recomendado)</option>
                <option value="alta" ${eventFrequency === 'alta' ? 'selected' : ''}>Alta (8 eventos por temporada — Máxima tensión)</option>
              </select>
            </div>

            <!-- Sistema de Regens PES -->
            <div class="form-group mb-3" style="background:#080d16; padding:16px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <label class="form-label" style="font-size: 0.85rem; font-weight: 800; color: #f8fafc; margin:0;">♻️ Sistema de Regens Nostálgico (PES):</label>
                <p class="text-sub" style="font-size:0.76rem; color:#94a3b8; margin:2px 0 0 0;">Jugadores retirados reaparecen de 16 años en sus clubes de origen.</p>
              </div>
              <input type="checkbox" id="checkEnableRegensConfig" ${enableRegens ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer; accent-color: #10b981;" />
            </div>

            <!-- Mercado de Entrenadores IA -->
            <div class="form-group mb-4" style="background:#080d16; padding:16px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <label class="form-label" style="font-size: 0.85rem; font-weight: 800; color: #f8fafc; margin:0;">🧑‍💼 Mercado Global de Entrenadores IA:</label>
                <p class="text-sub" style="font-size:0.76rem; color:#94a3b8; margin:2px 0 0 0;">Despidos y contrataciones dinámicas de DTs en clubes rivales.</p>
              </div>
              <input type="checkbox" id="checkEnableManagerMarketConfig" ${enableManagerMarket ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer; accent-color: #10b981;" />
            </div>

            <div style="display: flex; gap: 14px;">
              <button id="btnBackToStep3" class="btn-secondary" style="flex: 1; padding: 12px; font-weight: 800; border-radius: 10px; background: #131c2e; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
                ⬅️ VOLVER A CLUBES
              </button>
              <button id="btnConfirmStartGame" class="btn-primary btn-large" style="flex: 2; font-size: 1rem; font-weight: 900; padding: 12px; border-radius: 10px; background: #10b981; color: #000; border: none; cursor: pointer;">
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
      const countryWarning = document.getElementById('countryWarningMsg')!;

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
          if (countryWarning) countryWarning.classList.add('hidden');

          const displayCountry = document.getElementById('displayCountryName');
          if (displayCountry) displayCountry.innerText = managerCountry;

          countryCard.querySelector('div')!.innerHTML = `
            ${renderCountryFlagSVG(managerCountry, 26)}
            <strong style="font-size: 1rem; color: #ffffff;">${managerCountry}</strong>
          `;
          countryCard.style.borderColor = '#10b981';
          countryCard.style.borderStyle = 'solid';
        });
      });

      document.getElementById('btnNextToStep2')!.addEventListener('click', () => {
        sfx.playClick();
        if (!managerCountry) {
          if (countryWarning) countryWarning.classList.remove('hidden');
          countryModal.classList.remove('hidden');
          return;
        }
        managerName = nameInput.value.trim() || 'Director Técnico';
        currentStep = 2;
        renderStep();
      });
    } else if (currentStep === 2) {
      document.querySelectorAll('.archetype-card-step').forEach(card => {
        card.addEventListener('click', (e) => {
          sfx.playClick();
          selectedArchetype = (e.currentTarget as HTMLElement).dataset.id as ManagerArchetypeKey;
          renderStep();
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
        db.newCareer(selectedTeamIdForStart!, managerName || 'Director Técnico', managerCountry || 'Perú', managerAge, selectedArchetype, {
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
   * REQUERIMIENTO 4: BUSCADOR FLUIDO SIN RE-RENDERIZAR EL INPUT EN CADA TECLA
   */
  const renderStep3Content = () => {
    const containerEl = document.getElementById('step3ContentContainer');
    if (!containerEl) return;

    if (step3Tab === 'RECOMMENDED') {
      const offers = getMatchingTeams();

      containerEl.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          ${offers.map(o => `
            <div class="team-select-card glass-panel text-center" style="border: 1px solid rgba(255,255,255,0.08); padding: 20px; border-radius: 14px; background: #0e1626; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease;">
              <div>
                <span style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 800; font-size: 0.74rem; padding: 4px 8px; border-radius: 6px; display: inline-block; margin-bottom: 12px;">${o.projectType}</span>
                
                <div style="margin: 12px 0; display: flex; justify-content: center; align-items: center; min-height: 64px;">
                  ${renderTeamBadgeSVG(o.team, 64)}
                </div>

                <h3 style="margin-top: 4px; font-size: 1.15rem; font-weight: 900; color: #ffffff;">${o.team.name}</h3>
                <span class="text-sub" style="font-size: 0.8rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; justify-content: center; color: #94a3b8;">
                  ${renderCountryFlagSVG(o.team.country, 16)} ${o.team.country} — ${o.team.leagueName}
                </span>

                <!-- CARTA NARRATIVA DE LA JUNTA DIRECTIVA -->
                <div style="background: #080d16; border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 10px; margin: 14px 0; text-align: left; font-size: 0.8rem; line-height: 1.4; color: #cbd5e1;">
                  📩 <strong>Carta de la Comisión Directiva:</strong><br>
                  <em style="color: #94a3b8;">"${o.letterMessage}"</em>
                </div>

                <div style="background: #080d16; padding: 10px 12px; border-radius: 8px; margin-bottom: 14px; text-align: left; font-size: 0.82rem; border: 1px solid rgba(255,255,255,0.04);">
                  <p style="margin-bottom: 4px; color: #fff;">📊 <strong>Nivel Plantilla:</strong> <span style="color: #38bdf8; font-weight: 800;">OVR ${o.team.overall}</span></p>
                  <p style="margin-bottom: 0; color: #fff;">💰 <strong>Presupuesto Fichajes:</strong> <strong style="color: #f59e0b;">€${(o.team.budget / 1000000).toFixed(1)}M</strong></p>
                </div>
              </div>

              <button class="btn-primary btn-sign-club" data-id="${o.team.id}" style="width: 100%; padding: 12px; font-weight: 900; font-size: 0.9rem; background: #10b981; color: #000; border-radius: 10px; border: none; cursor: pointer;">
                ✍️ FIRMAR CON ${o.team.name.toUpperCase()} ➔
              </button>
            </div>
          `).join('')}
        </div>
      `;

      // Event listener para botones de firma
      document.querySelectorAll('.btn-sign-club').forEach(btn => {
        btn.addEventListener('click', (e) => {
          selectedTeamIdForStart = (e.currentTarget as HTMLElement).dataset.id!;
          sfx.playClick();
          currentStep = 4;
          renderStep();
        });
      });

    } else {
      // PESTAÑA: ELECCIÓN DE CLUB FAVORITO (TODAS LAS LIGAS)
      const allEnrichedTeams = getAllEnrichedTeams();
      const leagues = db.leagues;

      containerEl.innerHTML = `
        <div class="glass-panel" style="padding: 22px; border-radius: 14px; background: rgba(13, 19, 32, 0.9); border: 1px solid rgba(255,255,255,0.08);">
          
          <!-- FILTROS Y BARRA DE BÚSQUEDA (SE RENDERIZAN UNA SOLA VEZ) -->
          <div style="display: flex; gap: 14px; margin-bottom: 18px; flex-wrap: wrap; align-items: center;">
            <div style="flex: 1; min-width: 240px;">
              <label style="font-size: 0.8rem; font-weight: 800; color: #f8fafc; display: block; margin-bottom: 4px;">🔍 Buscar Club por Nombre:</label>
              <input type="text" id="inputSearchFavorite" class="input-text" value="${favoriteSearchQuery}" placeholder="Escribe el nombre de tu club... (ej. Alianza Lima, Barcelona, Real Madrid, Boca...)" style="width: 100%; padding: 10px 14px; border-radius: 8px; background: #080d16; border: 1px solid rgba(255,255,255,0.12); color: #fff; font-size: 0.88rem;" />
            </div>

            <div style="flex: 1; min-width: 240px;">
              <label style="font-size: 0.8rem; font-weight: 800; color: #f8fafc; display: block; margin-bottom: 4px;">🏆 Filtrar por Liga / Competición:</label>
              <select id="selectLeagueFavorite" class="input-select" style="width: 100%; padding: 10px 14px; border-radius: 8px; background: #080d16; border: 1px solid rgba(255,255,255,0.12); color: #fff; font-size: 0.88rem;">
                <option value="ALL" ${favoriteFilterLeagueId === 'ALL' ? 'selected' : ''}>🌐 TODAS LAS LIGAS (${allEnrichedTeams.length} Clubes)</option>
                ${leagues.map(l => `
                  <option value="${l.id}" ${favoriteFilterLeagueId === l.id ? 'selected' : ''}>
                    ${l.country} — ${l.name} (${l.teams.length} equipos)
                  </option>
                `).join('')}
              </select>
            </div>
          </div>

          <div id="favCounterText" style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 14px;"></div>

          <!-- CONTENEDOR EXCLUSIVO PARA LA REJILLA DE CLUBES (PERMITE ESCRIBIR CONTINUAMENTE EN EL INPUT) -->
          <div id="favTeamsGrid" style="max-height: 440px; overflow-y: auto; padding-right: 4px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;"></div>

        </div>
      `;

      /**
       * Actualiza únicamente la rejilla de tarjetas sin tocar ni destruir el elemento <input>
       */
      const updateFavGridOnly = () => {
        const gridEl = document.getElementById('favTeamsGrid');
        const counterEl = document.getElementById('favCounterText');
        if (!gridEl) return;

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

        if (counterEl) {
          counterEl.innerHTML = `Mostrando <strong>${filteredTeams.length}</strong> club(es) disponible(s). Haz clic en <strong>"Elegir Club"</strong> para comenzar:`;
        }

        gridEl.innerHTML = filteredTeams.length === 0 ? `
          <div style="grid-column: span 3; padding: 40px; text-align: center; color: #94a3b8;">
            ❌ No se encontraron clubes que coincidan con "${favoriteSearchQuery}". Intenta con otro nombre o cambiando de liga.
          </div>
        ` : filteredTeams.map(t => `
          <div class="team-fav-card" style="background: #080d16; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                ${renderTeamBadgeSVG(t, 40)}
                <div style="flex: 1; min-width: 0;">
                  <h4 style="margin: 0; font-size: 1rem; font-weight: 900; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.name}</h4>
                  <span style="font-size: 0.74rem; color: #94a3b8; display: flex; align-items: center; gap: 4px;">
                    ${renderCountryFlagSVG(t.country, 14)} ${t.leagueName}
                  </span>
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; background: #0e1626; padding: 7px 10px; border-radius: 6px; font-size: 0.76rem; margin-bottom: 10px;">
                <span>📊 Media: <strong style="color: #38bdf8; font-weight: 800;">OVR ${t.overall}</strong></span>
                <span>💰 Presupuesto: <strong style="color: #f59e0b; font-weight: 800;">€${(t.budget / 1000000).toFixed(1)}M</strong></span>
              </div>
            </div>

            <button class="btn-primary btn-sign-club" data-id="${t.id}" style="width: 100%; padding: 9px; font-weight: 900; font-size: 0.84rem; background: #10b981; color: #000; border-radius: 8px; border: none; cursor: pointer;">
              ✍️ ELEGIR ${t.short || t.name} ➔
            </button>
          </div>
        `).join('');

        // Re-vincular clics en los botones de la rejilla actualizada
        gridEl.querySelectorAll('.btn-sign-club').forEach(btn => {
          btn.addEventListener('click', (e) => {
            selectedTeamIdForStart = (e.currentTarget as HTMLElement).dataset.id!;
            sfx.playClick();
            currentStep = 4;
            renderStep();
          });
        });
      };

      // Inicializar rejilla de clubes por primera vez
      updateFavGridOnly();

      // Event Listeners: el input escucha y actualiza SOLO la rejilla, sin re-crear el input
      const searchInput = document.getElementById('inputSearchFavorite') as HTMLInputElement | null;
      const leagueSelect = document.getElementById('selectLeagueFavorite') as HTMLSelectElement | null;

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          favoriteSearchQuery = (e.target as HTMLInputElement).value;
          updateFavGridOnly();
        });
      }

      if (leagueSelect) {
        leagueSelect.addEventListener('change', (e) => {
          favoriteFilterLeagueId = (e.target as HTMLSelectElement).value;
          updateFavGridOnly();
        });
      }
    }
  };

  renderStep();
}
