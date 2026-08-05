/**
 * ============================================================================
 * ENTRENADOR LEYENDA - SELECCIÓN INICIAL DE CARRERA (newCareerUI.js v2.4)
 * ============================================================================
 * Flujo Narrativo en 3 Pasos Obligatorio con Picker Visual de Banderas SVG:
 * 1. PASO 1: Presentación Oficial del DT (Nombre, Edad 30-65, Selector Visual de País con Banderas SVG Reales).
 * 2. PASO 2: Selección de Filosofía Táctica Real (Tiki-Taka, Gegenpressing, Catenaccio, Bandas, Contraataque).
 * 3. PASO 3: Selección Automática de 3 Ofertas de Clubes Modestos/Bajos de su PAÍS DE ORIGEN.
 */

import { db } from '../data/db.js';
import { renderTeamBadgeSVG, renderCountryFlagSVG } from './badgeHelper.js';
import { sfx } from '../../assets/audio/sfx.js';
import { MANAGER_ARCHETYPES } from '../engine/tactics.js';

export function renderNewCareer(container, onCareerStarted) {
  let currentStep = 1;

  // Estado inicial obligatorio: Todo entrenador comienza como Novato de Cantera en su país
  let managerName = 'Director Técnico';
  let managerAge = 35;
  let managerCountry = 'Perú'; // Por defecto
  let selectedArchetype = 'TIKI_TAKA';

  // v2.0: Opciones avanzadas de partida (Paso 4)
  let eventFrequency = 'normal'; // 'off'|'baja'|'normal'|'alta'
  let enableRegens = true;
  let enableManagerMarket = true;

  // Obtener lista completa de países presentes en las ligas de la BD
  const countriesInDB = Array.from(new Set(db.leagues.map(l => l.country))).sort();

  /**
   * Selecciona 3 proyectos modestos/bajos EXCLUSIVAMENTE del PAÍS DE ORIGEN del DT principiante.
   */
  const getMatchingTeams = () => {
    let homeCountryLeagues = db.leagues.filter(l => l.country.toLowerCase() === managerCountry.toLowerCase());
    
    if (homeCountryLeagues.length === 0) {
      const sampleLeague = db.leagues.find(l => l.country === 'Perú') || db.leagues[0];
      homeCountryLeagues = [sampleLeague];
    }

    const homeTeams = [];
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

    const club1 = homeTeams[0] || homeTeams[0];
    const club2 = homeTeams[Math.floor(homeTeams.length / 2)] || homeTeams[1];
    const club3 = homeTeams[homeTeams.length - 1] || homeTeams[homeTeams.length - 1];

    const archetypeData = MANAGER_ARCHETYPES[selectedArchetype] || MANAGER_ARCHETYPES['TIKI_TAKA'];

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
   * Renderiza el paso activo del Wizard
   */
  const renderStep = () => {
    container.innerHTML = `
      <div style="min-height: 100vh; background: linear-gradient(135deg, #090d16 0%, #0f172a 100%); display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px; color: #ffffff;">
        
        <!-- ENCABEZADO DE BIENVENIDA -->
        <div class="text-center mb-4" style="max-width: 760px;">
          <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(0, 200, 133, 0.12); border: 1px solid var(--accent-green); padding: 6px 18px; border-radius: 20px; color: var(--accent-green); font-weight: 800; font-size: 0.82rem; margin-bottom: 12px;">
            ⚽ INICIO DE CARRERA DE DT (TEMPORADA 1 DE 25 — 2026/2027)
          </div>
          <h1 style="font-size: 2.2rem; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 6px;">
            ${currentStep === 1 ? '🎙️ PASO 1: BIENVENIDA & REGISTRO DEL DT' : (currentStep === 2 ? '🧩 PASO 2: FILOSOFÍA TÁCTICA DEL ENTRENADOR' : '💼 PASO 3: PRIMERAS 3 OFERTAS DE CLUBES DE TU PAÍS')}
          </h1>
          <p class="text-sub" style="font-size: 0.92rem;">
            ${currentStep === 1 ? 'Comenzarás como DT Principiante de Cantera en tu país natal. Ingresa tus datos personales:' : (currentStep === 2 ? 'Selecciona tu modelo de juego real. Tus primeros clubes evaluarán si tu estilo encaja con su proyecto.' : 'Basado en tu país natal y tu filosofía táctica, estos 3 clubes nacionales te ofrecen tu primer contrato de 3 años:')}
          </p>
        </div>

        <!-- INDICADOR DE PROGRESO DE 4 PASOS -->
        <div style="display: flex; gap: 12px; margin-bottom: 24px; width: 100%; max-width: 600px; justify-content: center;">
          <div style="flex: 1; height: 6px; border-radius: 3px; background: ${currentStep >= 1 ? 'var(--accent-green)' : '#1e293b'}; transition: background 0.3s ease;"></div>
          <div style="flex: 1; height: 6px; border-radius: 3px; background: ${currentStep >= 2 ? 'var(--accent-green)' : '#1e293b'}; transition: background 0.3s ease;"></div>
          <div style="flex: 1; height: 6px; border-radius: 3px; background: ${currentStep >= 3 ? 'var(--accent-green)' : '#1e293b'}; transition: background 0.3s ease;"></div>
          <div style="flex: 1; height: 6px; border-radius: 3px; background: ${currentStep >= 4 ? 'var(--accent-green)' : '#1e293b'}; transition: background 0.3s ease;"></div>
        </div>

        <!-- PASO 1: PERFIL DEL DT PRINCIPIANTE -->
        ${currentStep === 1 ? `
          <div class="glass-panel" style="width: 100%; max-width: 680px; padding: 28px; border: 1px solid var(--border-color); background: #121826;">
            <div style="display: flex; align-items: center; gap: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 20px;">
              <div style="background: linear-gradient(135deg, var(--accent-cyan), var(--accent-green)); width: 58px; height: 58px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #000;">
                👔
              </div>
              <div>
                <h3 style="margin: 0; font-size: 1.2rem;">Perfil de Entrenador Principiante / Cantera</h3>
                <span class="text-sub" style="font-size: 0.8rem;">0 Años de Experiencia Previa · Contrato Inicial de 3 Temporadas</span>
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label" style="font-size: 0.84rem; font-weight: 800; color: var(--accent-cyan);">👤 Nombre Completo del DT:</label>
              <input type="text" id="inputManagerName" class="input-text" value="${managerName}" style="width: 100%; font-size: 0.95rem;" placeholder="Ej: Lionel Scaloni, Ricardo Gareca..." />
            </div>

            <div class="form-group mb-4">
              <label class="form-label" style="font-size: 0.84rem; font-weight: 800; color: var(--accent-gold);">🎂 Edad Inicial (Años):</label>
              <div style="display: flex; align-items: center; gap: 12px;">
                <input type="number" id="inputManagerAge" class="input-text" value="${managerAge}" min="30" max="65" style="width: 140px; font-size: 0.95rem; text-align: center;" />
                <span class="text-sub" style="font-size: 0.8rem;">(Edad comprendida entre 30 y 65 años)</span>
              </div>
            </div>

            <!-- SELECTOR VISUAL DE PAÍS CON BANDERAS SVG IMAGEN -->
            <div class="form-group mb-4">
              <label class="form-label" style="font-size: 0.84rem; font-weight: 800; color: var(--accent-green);">🌎 Selecciona tu País de Origen:</label>
              
              <!-- TARJETA DEL PAÍS SELECCIONADO ACTUALMENTE -->
              <div id="selectedCountryCard" style="background: #0f172a; border: 2px solid var(--accent-green); padding: 12px 16px; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s ease;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  ${renderCountryFlagSVG(managerCountry, 26)}
                  <strong style="font-size: 1.05rem; color: #ffffff;" id="displayCountryName">${managerCountry}</strong>
                </div>
                <span style="font-size: 0.8rem; background: var(--accent-green); color: #000; font-weight: 900; padding: 4px 10px; border-radius: 6px;">CAMBIAR PAÍS 🔽</span>
              </div>

              <!-- REJILLA VISUAL DESPLEGABLE DE PAÍSES -->
              <div id="countryGridModal" class="hidden" style="margin-top: 10px; max-height: 220px; overflow-y: auto; background: #0b111e; border: 1px solid var(--border-color); border-radius: 10px; padding: 10px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                ${countriesInDB.map(c => `
                  <div class="country-option-item" data-country="${c}" style="display: flex; align-items: center; gap: 10px; background: ${c === managerCountry ? '#142036' : '#0f172a'}; border: 1px solid ${c === managerCountry ? 'var(--accent-green)' : 'var(--border-color)'}; padding: 8px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s ease;">
                    ${renderCountryFlagSVG(c, 20)}
                    <span style="font-size: 0.86rem; font-weight: 700; color: #fff;">${c}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div style="background: #0d1320; padding: 14px; border-radius: 10px; border: 1px solid var(--border-color); margin-bottom: 20px; font-size: 0.82rem;" class="text-sub">
              🔰 <strong>Regla de Carrera:</strong> Como DT novato, tus primeras 3 ofertas pertenecerán obligatoriamente a clubes de <strong id="noteCountryText" style="color: var(--accent-green);">${managerCountry}</strong>.
            </div>

            <button id="btnNextToStep2" class="btn-primary btn-large" style="width: 100%; font-size: 1rem; font-weight: 900;">
              SIGUIENTE: FILOSOFÍA TÁCTICA ➔
            </button>
          </div>
        ` : ''}

        <!-- PASO 2: FILOSOFÍA TÁCTICA REAL -->
        ${currentStep === 2 ? `
          <div class="glass-panel" style="width: 100%; max-width: 920px; padding: 28px; border: 1px solid var(--border-color); background: #121826;">
            <div class="text-center mb-4">
              <h3 style="color: var(--accent-gold); font-size: 1.3rem; margin-bottom: 4px;">🧩 SELECCIONA TU ESTILO TÁCTICO DE FÚTBOL</h3>
              <p class="text-sub" style="font-size: 0.86rem;">Define la identidad táctica que imprimirás en tus primeros 3 años de contrato:</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px;">
              
              <!-- 1. TIKI TAKA -->
              <div class="archetype-card-step glass-panel text-center ${selectedArchetype === 'TIKI_TAKA' ? 'selected' : ''}" 
                   data-id="TIKI_TAKA" 
                   style="padding: 18px 12px; cursor: pointer; border: 2px solid ${selectedArchetype === 'TIKI_TAKA' ? 'var(--accent-green)' : 'transparent'}; background: ${selectedArchetype === 'TIKI_TAKA' ? '#141d2e' : '#0f172a'}; border-radius: 12px; transition: all 0.2s ease;">
                <div style="font-size: 2.2rem; margin-bottom: 6px;">⚽</div>
                <h4 style="font-size: 0.95rem; color: #ffffff; margin-bottom: 4px;">TIKI-TAKA & POSESIÓN</h4>
                <span class="text-sub" style="font-size: 0.75rem; display: block; margin-bottom: 8px;">Juego de Posición & Pase Corto</span>
                <div style="background: rgba(0, 200, 133, 0.15); color: var(--accent-green); padding: 4px 6px; border-radius: 6px; font-weight: 800; font-size: 0.72rem; margin-bottom: 8px;">
                  +8 PASES CORTOS | POSESIÓN
                </div>
                <p class="text-sub" style="font-size: 0.76rem; text-align: left; line-height: 1.4;">
                  Construcción paciente desde atrás, triangulaciones de apoyo y dominio del balón.
                </p>
              </div>

              <!-- 2. GEGENPRESSING -->
              <div class="archetype-card-step glass-panel text-center ${selectedArchetype === 'GEGENPRESSING' ? 'selected' : ''}" 
                   data-id="GEGENPRESSING" 
                   style="padding: 18px 12px; cursor: pointer; border: 2px solid ${selectedArchetype === 'GEGENPRESSING' ? 'var(--accent-cyan)' : 'transparent'}; background: ${selectedArchetype === 'GEGENPRESSING' ? '#141d2e' : '#0f172a'}; border-radius: 12px; transition: all 0.2s ease;">
                <div style="font-size: 2.2rem; margin-bottom: 6px;">⚡</div>
                <h4 style="font-size: 0.95rem; color: #ffffff; margin-bottom: 4px;">GEGENPRESSING & PRESIÓN</h4>
                <span class="text-sub" style="font-size: 0.75rem; display: block; margin-bottom: 8px;">Presión Tras Pérdida & Vértigo</span>
                <div style="background: rgba(0, 150, 199, 0.15); color: var(--accent-cyan); padding: 4px 6px; border-radius: 6px; font-weight: 800; font-size: 0.72rem; margin-bottom: 8px;">
                  +8 RECUPERACIÓN ALTA | VÉRTIGO
                </div>
                <p class="text-sub" style="font-size: 0.76rem; text-align: left; line-height: 1.4;">
                  Asfixia inmediata al rival tras perder la pelota y zarpazo vertical al espacio.
                </p>
              </div>

              <!-- 3. CATENACCIO -->
              <div class="archetype-card-step glass-panel text-center ${selectedArchetype === 'CATENACCIO' ? 'selected' : ''}" 
                   data-id="CATENACCIO" 
                   style="padding: 18px 12px; cursor: pointer; border: 2px solid ${selectedArchetype === 'CATENACCIO' ? 'var(--accent-gold)' : 'transparent'}; background: ${selectedArchetype === 'CATENACCIO' ? '#141d2e' : '#0f172a'}; border-radius: 12px; transition: all 0.2s ease;">
                <div style="font-size: 2.2rem; margin-bottom: 6px;">🚌</div>
                <h4 style="font-size: 0.95rem; color: #ffffff; margin-bottom: 4px;">CATENACCIO & BLOQUE BAJO</h4>
                <span class="text-sub" style="font-size: 0.75rem; display: block; margin-bottom: 8px;">El Autobús & Balón Parado</span>
                <div style="background: rgba(229, 169, 60, 0.15); color: var(--accent-gold); padding: 4px 6px; border-radius: 6px; font-weight: 800; font-size: 0.72rem; margin-bottom: 8px;">
                  +8 SOLIDEZ MARCA | CERROJO
                </div>
                <p class="text-sub" style="font-size: 0.76rem; text-align: left; line-height: 1.4;">
                  Cerrojo defensivo numérico en área propia, garra, contragolpe y córners.
                </p>
              </div>

            </div>

            <!-- SEGUNDA FILA -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px;">
              
              <div class="archetype-card-step glass-panel text-center ${selectedArchetype === 'WING_PLAY' ? 'selected' : ''}" 
                   data-id="WING_PLAY" 
                   style="padding: 16px 14px; cursor: pointer; border: 2px solid ${selectedArchetype === 'WING_PLAY' ? '#a855f7' : 'transparent'}; background: ${selectedArchetype === 'WING_PLAY' ? '#141d2e' : '#0f172a'}; border-radius: 12px; transition: all 0.2s ease; display: flex; align-items: center; gap: 14px; text-align: left;">
                <div style="font-size: 2.2rem;">🌊</div>
                <div>
                  <h4 style="font-size: 0.95rem; color: #ffffff; margin-bottom: 2px;">JUEGO POR BANDAS & CENTROS</h4>
                  <span class="text-sub" style="font-size: 0.74rem;">Amplitud Total, Lateral Desbordante y Envíos al Área</span>
                  <div style="background: rgba(168, 85, 247, 0.18); color: #c084fc; padding: 3px 6px; border-radius: 6px; font-weight: 800; font-size: 0.70rem; margin-top: 4px; display: inline-block;">
                    +8 CENTROS & DESBORDE | REMATE AÉREO
                  </div>
                </div>
              </div>

              <div class="archetype-card-step glass-panel text-center ${selectedArchetype === 'DIRECT_ATTACK' ? 'selected' : ''}" 
                   data-id="DIRECT_ATTACK" 
                   style="padding: 16px 14px; cursor: pointer; border: 2px solid ${selectedArchetype === 'DIRECT_ATTACK' ? '#ff0055' : 'transparent'}; background: ${selectedArchetype === 'DIRECT_ATTACK' ? '#141d2e' : '#0f172a'}; border-radius: 12px; transition: all 0.2s ease; display: flex; align-items: center; gap: 14px; text-align: left;">
                <div style="font-size: 2.2rem;">🎯</div>
                <div>
                  <h4 style="font-size: 0.95rem; color: #ffffff; margin-bottom: 2px;">CONTRAATAQUE DIRECTO</h4>
                  <span class="text-sub" style="font-size: 0.74rem;">Balón Largo a la Espalda y Zarpazos a Alta Velocidad</span>
                  <div style="background: rgba(255, 0, 85, 0.18); color: #ff5588; padding: 3px 6px; border-radius: 6px; font-weight: 800; font-size: 0.70rem; margin-top: 4px; display: inline-block;">
                    +8 BALÓN LARGO | VELOCIDAD
                  </div>
                </div>
              </div>

            </div>

            <div style="display: flex; gap: 14px;">
              <button id="btnBackToStep1" class="btn-secondary" style="flex: 1; padding: 14px; font-weight: 800;">
                ⬅️ VOLVER AL PERFIL
              </button>
              <button id="btnNextToStep3" class="btn-primary btn-large" style="flex: 2; font-size: 1rem; font-weight: 900;">
                🔍 VER OFERTAS EN ${managerCountry.toUpperCase()} ➔
              </button>
            </div>
          </div>
        ` : ''}

        <!-- PASO 3: RECOMENDACIÓN DE 3 CLUBES NACIONALES -->
        ${currentStep === 3 ? `
          <div style="width: 100%; max-width: 1120px;">
            <div class="glass-panel mb-3 text-center" style="padding: 16px; border: 1px solid var(--border-color); background: #121826; display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap;">
              <span class="text-sub" style="font-weight: 800; font-size: 0.84rem; display: flex; align-items: center; gap: 8px;">
                ENTRENADOR: <strong style="color: #fff;">${managerName}</strong> (${renderCountryFlagSVG(managerCountry, 18)} ${managerCountry}, ${managerAge}a)
              </span>
              <span style="color: var(--border-color);">|</span>
              <span class="text-sub" style="font-weight: 800; font-size: 0.84rem;">EXPERIENCIA: <strong style="color: var(--accent-green);">🔰 PRINCIPIANTE DE CANTERA (0a)</strong></span>
              <span style="color: var(--border-color);">|</span>
              <span class="text-sub" style="font-weight: 800; font-size: 0.84rem;">FILOSOFÍA: <strong style="color: var(--accent-gold);">${MANAGER_ARCHETYPES[selectedArchetype]?.name || 'TIKI-TAKA'}</strong></span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px;" id="matchingOffersContainer"></div>

            <div style="margin-top: 20px; text-align: center;">
              <button id="btnBackToStep2" class="btn-secondary" style="padding: 12px 24px; font-weight: 800;">
                ⬅️ MODIFICAR ESTILO TÁCTICO O DATOS
              </button>
            </div>
          </div>
        ` : ''}

        <!-- PASO 4: CONFIGURACIÓN DE EXPERIENCIA (FASE 6D) -->
        ${currentStep === 4 ? `
          <div class="glass-panel" style="width: 100%; max-width: 680px; padding: 28px; border: 1px solid var(--border-color); background: #121826;">
            <div class="text-center mb-4">
              <h3 style="color: var(--accent-cyan); font-size: 1.3rem; margin-bottom: 4px;">⚙️ PASO 4: CONFIGURACIÓN DE EXPERIENCIA DE JUEGO</h3>
              <p class="text-sub" style="font-size: 0.86rem;">Ajusta la dificultad y sistemas dinámicos para tu partida:</p>
            </div>

            <!-- Frecuencia de Eventos -->
            <div class="form-group mb-4" style="background:#0f172a; padding:14px; border-radius:10px; border:1px solid var(--border-color);">
              <label class="form-label" style="font-size: 0.84rem; font-weight: 800; color: var(--accent-gold);">🚨 Frecuencia de Eventos Inesperados & Crisis:</label>
              <select id="selectEventFreqConfig" class="input-select" style="width: 100%; margin-top:6px;">
                <option value="off" ${eventFrequency === 'off' ? 'selected' : ''}>Desactivado (Experiencia Lineal sin imprevistos)</option>
                <option value="baja" ${eventFrequency === 'baja' ? 'selected' : ''}>Baja (2 eventos por temporada)</option>
                <option value="normal" ${eventFrequency === 'normal' ? 'selected' : ''}>Normal (4 eventos por temporada — Recomendado)</option>
                <option value="alta" ${eventFrequency === 'alta' ? 'selected' : ''}>Alta (8 eventos por temporada — Máxima tensión)</option>
              </select>
            </div>

            <!-- Sistema de Regens PES -->
            <div class="form-group mb-4" style="background:#0f172a; padding:14px; border-radius:10px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <label class="form-label" style="font-size: 0.84rem; font-weight: 800; color: var(--accent-green); margin:0;">♻️ Sistema de Regens Nostálgico (PES):</label>
                <p class="text-sub" style="font-size:0.75rem; margin:2px 0 0 0;">Jugadores retirados reaparecen de 16 años en sus clubes de origen.</p>
              </div>
              <input type="checkbox" id="checkEnableRegensConfig" ${enableRegens ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer;" />
            </div>

            <!-- Mercado de Entrenadores IA -->
            <div class="form-group mb-4" style="background:#0f172a; padding:14px; border-radius:10px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <label class="form-label" style="font-size: 0.84rem; font-weight: 800; color: var(--accent-cyan); margin:0;">🧑‍💼 Mercado Global de Entrenadores IA:</label>
                <p class="text-sub" style="font-size:0.75rem; margin:2px 0 0 0;">Despidos dinámicos de DTs en clubes rivales durante la temporada.</p>
              </div>
              <input type="checkbox" id="checkEnableManagerMarketConfig" ${enableManagerMarket ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer;" />
            </div>

            <div style="display: flex; gap: 14px;">
              <button id="btnBackToStep3" class="btn-secondary" style="flex: 1; padding: 14px; font-weight: 800;">
                ⬅️ VOLVER A OFERTAS
              </button>
              <button id="btnConfirmStartGame" class="btn-primary btn-large" style="flex: 2; font-size: 1rem; font-weight: 900; background:var(--accent-gold); color:#000;">
                🚀 INICIAR MI CARRERA PROFESIONAL DE DT ➔
              </button>
            </div>
          </div>
        ` : ''}

      </div>
    `;

    // EVENT LISTENERS POR PASO
    if (currentStep === 1) {
      const nameInput = document.getElementById('inputManagerName');
      const ageInput = document.getElementById('inputManagerAge');
      const countryCard = document.getElementById('selectedCountryCard');
      const countryModal = document.getElementById('countryGridModal');

      nameInput.addEventListener('input', (e) => { managerName = e.target.value; });
      ageInput.addEventListener('input', (e) => { managerAge = parseInt(e.target.value) || 35; });

      countryCard.addEventListener('click', () => {
        sfx.playClick();
        countryModal.classList.toggle('hidden');
      });

      document.querySelectorAll('.country-option-item').forEach(item => {
        item.addEventListener('click', (e) => {
          sfx.playClick();
          managerCountry = e.currentTarget.dataset.country;
          countryModal.classList.add('hidden');

          // Actualizar UI del card
          const displayCountry = document.getElementById('displayCountryName');
          const noteCountry = document.getElementById('noteCountryText');
          if (displayCountry) displayCountry.innerText = managerCountry;
          if (noteCountry) noteCountry.innerText = managerCountry;

          // Re-renderizar tarjeta del país
          countryCard.querySelector('div').innerHTML = `
            ${renderCountryFlagSVG(managerCountry, 26)}
            <strong style="font-size: 1.05rem; color: #ffffff;">${managerCountry}</strong>
          `;
        });
      });

      document.getElementById('btnNextToStep2').addEventListener('click', () => {
        sfx.playClick();
        managerName = nameInput.value || 'Director Técnico';
        currentStep = 2;
        renderStep();
      });
    } else if (currentStep === 2) {
      document.querySelectorAll('.archetype-card-step').forEach(card => {
        card.addEventListener('click', (e) => {
          sfx.playClick();
          selectedArchetype = e.currentTarget.dataset.id;
          document.querySelectorAll('.archetype-card-step').forEach(c => {
            c.classList.remove('selected');
            c.style.borderColor = 'transparent';
            c.style.background = '#0f172a';
          });
          e.currentTarget.classList.add('selected');
          e.currentTarget.style.borderColor = MANAGER_ARCHETYPES[selectedArchetype]?.badgeColor || 'var(--accent-green)';
          e.currentTarget.style.background = '#141d2e';
        });
      });

      document.getElementById('btnBackToStep1').addEventListener('click', () => {
        sfx.playClick();
        currentStep = 1;
        renderStep();
      });

      document.getElementById('btnNextToStep3').addEventListener('click', () => {
        sfx.playWhistle();
        currentStep = 3;
        renderStep();
        renderStep3Offers();
      });
    } else if (currentStep === 3) {
      document.getElementById('btnBackToStep2')?.addEventListener('click', () => {
        sfx.playClick();
        currentStep = 2;
        renderStep();
      });
    } else if (currentStep === 4) {
      document.getElementById('btnBackToStep3')?.addEventListener('click', () => {
        sfx.playClick();
        currentStep = 3;
        renderStep();
        renderStep3Offers();
      });

      document.getElementById('btnConfirmStartGame')?.addEventListener('click', () => {
        const freqSelect = document.getElementById('selectEventFreqConfig');
        const regensCheck = document.getElementById('checkEnableRegensConfig');
        const marketCheck = document.getElementById('checkEnableManagerMarketConfig');

        if (freqSelect) eventFrequency = freqSelect.value;
        if (regensCheck) enableRegens = regensCheck.checked;
        if (marketCheck) enableManagerMarket = marketCheck.checked;

        sfx.playGoal();
        db.newCareer(selectedTeamIdForStart, managerName, managerCountry, managerAge, selectedArchetype, {
          eventFrequency,
          enableRegens,
          enableManagerMarket
        });
        onCareerStarted();
      });
    }
  };

  let selectedTeamIdForStart = null;

  /**
   * Renderiza las 3 tarjetas de ofertas de clubes nacionales en el Paso 3
   */
  const renderStep3Offers = () => {
    const offersContainer = document.getElementById('matchingOffersContainer');
    if (!offersContainer) return;

    const offers = getMatchingTeams();

    offersContainer.innerHTML = offers.map(o => `
      <div class="team-select-card glass-panel text-center" style="border: 1px solid var(--border-color); padding: 22px; border-radius: 14px; background: #121826; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <span class="badge mb-2" style="background: ${o.badgeColor}; color: #000; font-weight: 900; font-size: 0.78rem;">${o.projectType}</span>
          
          <div style="margin: 14px 0;">
            ${renderTeamBadgeSVG(o.team, 64)}
          </div>

          <h3 style="margin-top: 4px; font-size: 1.25rem; color: #ffffff;">${o.team.name}</h3>
          <span class="text-sub" style="font-size: 0.82rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; justify-content: center;">
            ${renderCountryFlagSVG(o.team.country, 18)} ${o.team.country} — ${o.team.leagueName}
          </span>

          <!-- CARTA NARRATIVA DE LA JUNTA DIRECTIVA -->
          <div style="background: #0f172a; border: 1px solid var(--border-color); padding: 12px; border-radius: 10px; margin: 14px 0; text-align: left; font-size: 0.8rem; line-height: 1.4;" class="text-sub">
            📩 <strong>Carta de la Comisión Directiva:</strong><br>
            <em>"${o.letterMessage}"</em>
          </div>

          <div style="background: #0d1320; padding: 10px 12px; border-radius: 8px; margin-bottom: 14px; text-align: left; font-size: 0.82rem;">
            <p style="margin-bottom: 4px;">📊 <strong>Nivel Plantilla:</strong> OVR ${o.team.overall}</p>
            <p style="margin-bottom: 0;">💰 <strong>Presupuesto Fichajes:</strong> <strong class="text-highlight">€${(o.team.budget / 1000000).toFixed(1)}M</strong></p>
          </div>
        </div>

        <button class="btn-primary btn-sign-club" data-id="${o.team.id}" style="width: 100%; padding: 12px; font-weight: 900; font-size: 0.95rem; background: var(--accent-green); color: #000;">
          ✍️ SELECCIONAR ${o.team.name.toUpperCase()} (PASO FINAL ➔)
        </button>
      </div>
    `).join('');

    document.querySelectorAll('.btn-sign-club').forEach(btn => {
      btn.addEventListener('click', (e) => {
        selectedTeamIdForStart = e.currentTarget.dataset.id;
        sfx.playClick();
        currentStep = 4;
        renderStep();
      });
    });
  };

  renderStep();
}
