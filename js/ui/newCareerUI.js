/**
 * ============================================================================
 * ENTRENADOR LEYENDA - SELECCIÓN INICIAL DE CARRERA (newCareerUI.js)
 * ============================================================================
 * Asistente narrativo interactivo en 3 pasos estilo EA FC / FIFA:
 * 1. PASO 1: Entrevista de Bienvenida & Datos del DT (Nombre, Edad 30-65, Nacionalidad).
 * 2. PASO 2: Selección de Filosofía Táctica (Guardiola / Xabi Alonso / De la Fuente).
 * 3. PASO 3: Algoritmo de Coincidencia Táctica Automática que selecciona 3 Proyectos
 *    Deportivos de la Base de Datos coincidentes con la identidad del Entrenador.
 */

import { db } from '../data/db.js';
import { renderTeamBadgeSVG } from './badgeHelper.js';
import { sfx } from '../../assets/audio/sfx.js';
import { MANAGER_ARCHETYPES } from '../engine/tactics.js';

const COUNTRY_FLAGS = {
  'Argentina': '🇦🇷', 'Brasil': '🇧🇷', 'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Uruguay': '🇺🇾',
  'Perú': '🇵🇪', 'Ecuador': '🇪🇨', 'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴', 'Venezuela': '🇻🇪',
  'España': '🇪🇸', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Italia': '🇮🇹', 'Alemania': '🇩🇪', 'Francia': '🇫🇷',
  'Portugal': '🇵🇹', 'Países Bajos': '🇳🇱', 'Bélgica': '🇧🇪', 'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Turquía': '🇹🇷',
  'Grecia': '🇬🇷', 'Suiza': '🇨🇭', 'Austria': '🇦🇹', 'Dinamarca': '🇩🇰', 'Noruega': '🇳🇴',
  'Suecia': '🇸🇪', 'Polonia': '🇵🇱', 'República Checa': '🇨🇿', 'Croacia': '🇭🇷', 'México': '🇲🇽',
  'Estados Unidos': '🇺🇸', 'Arabia Saudita': '🇸🇦', 'Japón': '🇯🇵', 'Emiratos Árabes': '🇦🇪',
  'Australia': '🇦🇺', 'Marruecos': '🇲🇦', 'Egipto': '🇪🇬'
};

/**
 * Renderiza el asistente cinematográfico de inicio de carrera en 3 pasos.
 * @param {HTMLElement} container - Contenedor principal #app
 * @param {Function} onCareerStarted - Callback para iniciar la interfaz principal
 */
export function renderNewCareer(container, onCareerStarted) {
  let currentStep = 1;

  // Estado del perfil del entrenador
  let managerName = 'Director Técnico';
  let managerAge = 35;
  let managerCountry = 'Argentina';
  let selectedArchetype = 'GUARDIOLA';
  let selectedRegionFilter = 'ALL';

  // Obtener lista completa de países presentes en las ligas de la BD
  const countriesInDB = Array.from(new Set(db.leagues.map(l => l.country))).sort();

  /**
   * Algoritmo inteligente que selecciona automáticamente 3 clubes coincidentes
   * con la filosofía del entrenador a partir de toda la base de datos de ligas.
   */
  const getMatchingTeams = () => {
    let availableLeagues = db.leagues;
    if (selectedRegionFilter !== 'ALL') {
      availableLeagues = db.leagues.filter(l => l.region === selectedRegionFilter);
      if (availableLeagues.length === 0) availableLeagues = db.leagues;
    }

    // Reunir todos los equipos disponibles con sus metadatos
    const allTeams = [];
    availableLeagues.forEach(l => {
      l.teams.forEach(t => {
        allTeams.push({
          ...t,
          leagueName: l.name,
          country: l.country,
          region: l.region
        });
      });
    });

    // Ordenar de mayor a menor OVR
    allTeams.sort((a, b) => b.overall - a.overall);

    let topCandidates = [];
    let midCandidates = [];
    let underdogCandidates = [];

    if (selectedArchetype === 'GUARDIOLA') {
      // Priorizar clubes con alto OVR/Presupuesto de toque y posesión
      topCandidates = allTeams.filter(t => t.overall >= 80);
      midCandidates = allTeams.filter(t => t.overall >= 72 && t.overall < 80);
      underdogCandidates = allTeams.filter(t => t.overall < 72);
    } else if (selectedArchetype === 'XABI_ALONSO') {
      // Priorizar clubes dinámicos y verticales
      topCandidates = allTeams.filter(t => t.overall >= 79);
      midCandidates = allTeams.filter(t => t.overall >= 71 && t.overall < 79);
      underdogCandidates = allTeams.filter(t => t.overall < 71);
    } else {
      // DE_LA_FUENTE: Priorizar clubes de garra, presión física e intensidad
      topCandidates = allTeams.filter(t => t.overall >= 78);
      midCandidates = allTeams.filter(t => t.overall >= 70 && t.overall < 78);
      underdogCandidates = allTeams.filter(t => t.overall < 70);
    }

    const club1 = topCandidates[Math.floor(Math.random() * Math.min(6, topCandidates.length))] || allTeams[0];
    const club2 = midCandidates[Math.floor(Math.random() * Math.min(8, midCandidates.length))] || allTeams[Math.floor(allTeams.length / 2)];
    const club3 = underdogCandidates[Math.floor(Math.random() * Math.min(8, underdogCandidates.length))] || allTeams[allTeams.length - 1];

    const archetypeData = MANAGER_ARCHETYPES[selectedArchetype] || MANAGER_ARCHETYPES['GUARDIOLA'];

    return [
      {
        team: club1,
        projectType: '🏆 PROYECTO ÉLITE / CANDIDATO',
        badgeColor: 'var(--accent-gold)',
        letterMessage: `La Junta Directiva de ${club1.name} te busca específicamente por tu filosofía de ${archetypeData.name.toLowerCase()} para conquistar el título de liga y pelear copas internacionales.`
      },
      {
        team: club2,
        projectType: '⚽ PROYECTO PROTAGONISTA',
        badgeColor: 'var(--accent-cyan)',
        letterMessage: `La directiva de ${club2.name} necesita un DT con tu identidad táctica para dar el salto de calidad, consolidar una idea de juego y clasificar a torneos continentales.`
      },
      {
        team: club3,
        projectType: '🌱 DESAFÍO DE POTRERO Y CANTERA',
        badgeColor: 'var(--accent-green)',
        letterMessage: `En ${club3.name} apuestan por tu perfil de entrenador para potenciar la cantera, imprimir garra en la cancha y maximizar el rendimiento de la plantilla.`
      }
    ];
  };

  /**
   * Renderiza el paso actual del Wizard
   */
  const renderStep = () => {
    container.innerHTML = `
      <div style="min-height: 100vh; background: linear-gradient(135deg, #090d16 0%, #0f172a 100%); display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px; color: #ffffff;">
        
        <!-- ENCABEZADO DE BIENVENIDA ESTILO EA FC -->
        <div class="text-center mb-4" style="max-width: 720px;">
          <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(0, 200, 133, 0.12); border: 1px solid var(--accent-green); padding: 6px 16px; border-radius: 20px; color: var(--accent-green); font-weight: 800; font-size: 0.82rem; margin-bottom: 12px;">
            ⚽ BIENVENIDO A TU CARRERA DE DIRECTOR TÉCNICO LEYENDA (2026 - 2051)
          </div>
          <h1 style="font-size: 2.2rem; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 6px;">
            ${currentStep === 1 ? '🎙️ PASO 1: PERFIL PROFESIONAL DEL ENTRENADOR' : (currentStep === 2 ? '🧩 PASO 2: SELECCIÓN DE FILOSOFÍA TÁCTICA' : '💼 PASO 3: OFERTAS DE CLUBES COINCIDENTES')}
          </h1>
          <p class="text-sub" style="font-size: 0.92rem;">
            ${currentStep === 1 ? 'Ingresa tus datos personales para la presentación oficial ante los medios internacionales.' : (currentStep === 2 ? 'Define tu modelo de juego. La junta directiva evaluará si tu estilo encaja con su proyecto deportivo.' : 'Basado en tu identidad táctica, estos 3 clubes han presentado ofertas formales de contrato para contratarte.')}
          </p>
        </div>

        <!-- INDICADOR DE PROGRESO DE 3 PASOS -->
        <div style="display: flex; gap: 12px; margin-bottom: 24px; width: 100%; max-width: 600px; justify-content: center;">
          <div style="flex: 1; height: 6px; border-radius: 3px; background: ${currentStep >= 1 ? 'var(--accent-green)' : '#1e293b'}; transition: background 0.3s ease;"></div>
          <div style="flex: 1; height: 6px; border-radius: 3px; background: ${currentStep >= 2 ? 'var(--accent-green)' : '#1e293b'}; transition: background 0.3s ease;"></div>
          <div style="flex: 1; height: 6px; border-radius: 3px; background: ${currentStep >= 3 ? 'var(--accent-green)' : '#1e293b'}; transition: background 0.3s ease;"></div>
        </div>

        <!-- PASO 1: PERFIL DEL DT -->
        ${currentStep === 1 ? `
          <div class="glass-panel" style="width: 100%; max-width: 620px; padding: 28px; border: 1px solid var(--border-color); background: #121826;">
            <div style="display: flex; align-items: center; gap: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 20px;">
              <div style="background: linear-gradient(135deg, var(--accent-cyan), var(--accent-green)); width: 58px; height: 58px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #000;">
                👔
              </div>
              <div>
                <h3 style="margin: 0; font-size: 1.2rem;">Ficha Personal del Director Técnico</h3>
                <span class="text-sub" style="font-size: 0.8rem;">Completa tus datos de presentación profesional</span>
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label" style="font-size: 0.84rem; font-weight: 800; color: var(--accent-cyan);">👤 Nombre Completo del Entrenador:</label>
              <input type="text" id="inputManagerName" class="input-text" value="${managerName}" style="width: 100%; font-size: 0.95rem;" placeholder="Ej: Marcelo Gallardo, Pep Guardiola..." />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 16px; margin-bottom: 20px;">
              <div class="form-group">
                <label class="form-label" style="font-size: 0.84rem; font-weight: 800; color: var(--accent-gold);">🎂 Edad Actual (Años):</label>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <input type="number" id="inputManagerAge" class="input-text" value="${managerAge}" min="30" max="65" style="width: 100%; font-size: 0.95rem; text-align: center;" />
                  <span class="text-sub" style="font-size: 0.8rem;">(30 - 65)</span>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" style="font-size: 0.84rem; font-weight: 800; color: var(--accent-green);">🌎 Nacionalidad:</label>
                <select id="selectManagerCountry" class="input-select" style="width: 100%; font-size: 0.9rem;">
                  ${countriesInDB.map(c => `
                    <option value="${c}" ${c === managerCountry ? 'selected' : ''}>
                      ${COUNTRY_FLAGS[c] || '🏳️'} ${c}
                    </option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div style="background: #0d1320; padding: 14px; border-radius: 10px; border: 1px solid var(--border-color); margin-bottom: 20px; font-size: 0.82rem;" class="text-sub">
              📅 <strong>Línea de Tiempo Profesional:</strong> Comenzarás tu carrera en el año <strong>2026</strong> a tus <strong><span id="displayAge">${managerAge}</span> años</strong>, finalizando a tus <strong><span id="displayEndAge">${managerAge + 25}</span> años</strong> en la temporada 2050/2051.
            </div>

            <button id="btnNextToStep2" class="btn-primary btn-large" style="width: 100%; font-size: 1rem; font-weight: 900;">
              SIGUIENTE: FILOSOFÍA TÁCTICA ➔
            </button>
          </div>
        ` : ''}

        <!-- PASO 2: FILOSOFÍA TÁCTICA -->
        ${currentStep === 2 ? `
          <div class="glass-panel" style="width: 100%; max-width: 860px; padding: 28px; border: 1px solid var(--border-color); background: #121826;">
            <div class="text-center mb-3">
              <h3 style="color: var(--accent-gold); font-size: 1.3rem; margin-bottom: 4px;">¿CUÁL ES TU FILOSOFÍA DE JUEGO COMO DT?</h3>
              <p class="text-sub" style="font-size: 0.86rem;">Selecciona el modelo táctico con el que se identificará tu equipo:</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
              
              <!-- GUARDIOLA -->
              <div class="archetype-card-step glass-panel text-center ${selectedArchetype === 'GUARDIOLA' ? 'selected' : ''}" 
                   data-id="GUARDIOLA" 
                   style="padding: 20px 14px; cursor: pointer; border: 2px solid ${selectedArchetype === 'GUARDIOLA' ? 'var(--accent-green)' : 'transparent'}; background: ${selectedArchetype === 'GUARDIOLA' ? '#141d2e' : '#0f172a'}; border-radius: 12px; transition: all 0.2s ease;">
                <div style="font-size: 2.2rem; margin-bottom: 8px;">⚽</div>
                <h4 style="font-size: 1rem; color: #ffffff; margin-bottom: 4px;">MAESTRO POSESIÓN</h4>
                <span class="text-sub" style="font-size: 0.76rem; display: block; margin-bottom: 10px;">Pep Guardiola / Xavi Hernández</span>
                
                <div style="background: rgba(0, 200, 133, 0.15); color: var(--accent-green); padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 0.74rem; margin-bottom: 10px;">
                  +8 PASES CORTOS | POSESIÓN
                </div>
                <p class="text-sub" style="font-size: 0.78rem; text-align: left; line-height: 1.4;">
                  Dominio territorial, triangulaciones en salida, paciencia táctica y presión alta tras pérdida.
                </p>
              </div>

              <!-- XABI ALONSO -->
              <div class="archetype-card-step glass-panel text-center ${selectedArchetype === 'XABI_ALONSO' ? 'selected' : ''}" 
                   data-id="XABI_ALONSO" 
                   style="padding: 20px 14px; cursor: pointer; border: 2px solid ${selectedArchetype === 'XABI_ALONSO' ? 'var(--accent-cyan)' : 'transparent'}; background: ${selectedArchetype === 'XABI_ALONSO' ? '#141d2e' : '#0f172a'}; border-radius: 12px; transition: all 0.2s ease;">
                <div style="font-size: 2.2rem; margin-bottom: 8px;">⚡</div>
                <h4 style="font-size: 1rem; color: #ffffff; margin-bottom: 4px;">REY CONTRAATAQUE</h4>
                <span class="text-sub" style="font-size: 0.76rem; display: block; margin-bottom: 10px;">Xabi Alonso / Klopp / Ancelotti</span>
                
                <div style="background: rgba(0, 150, 199, 0.15); color: var(--accent-cyan); padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 0.74rem; margin-bottom: 10px;">
                  +8 VELOCIDAD ATAQUE | VERTICAL
                </div>
                <p class="text-sub" style="font-size: 0.78rem; text-align: left; line-height: 1.4;">
                  Transición relámpago al espacio, extremos veloces y ataque directo e implacable.
                </p>
              </div>

              <!-- DE LA FUENTE / POTRERO -->
              <div class="archetype-card-step glass-panel text-center ${selectedArchetype === 'DE_LA_FUENTE' ? 'selected' : ''}" 
                   data-id="DE_LA_FUENTE" 
                   style="padding: 20px 14px; cursor: pointer; border: 2px solid ${selectedArchetype === 'DE_LA_FUENTE' ? 'var(--accent-gold)' : 'transparent'}; background: ${selectedArchetype === 'DE_LA_FUENTE' ? '#141d2e' : '#0f172a'}; border-radius: 12px; transition: all 0.2s ease;">
                <div style="font-size: 2.2rem; margin-bottom: 8px;">🔥</div>
                <h4 style="font-size: 1rem; color: #ffffff; margin-bottom: 4px;">POTRERO & PRESIÓN</h4>
                <span class="text-sub" style="font-size: 0.76rem; display: block; margin-bottom: 10px;">Luis de la Fuente / Cholo Simeone</span>
                
                <div style="background: rgba(229, 169, 60, 0.15); color: var(--accent-gold); padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 0.74rem; margin-bottom: 10px;">
                  +8 BALÓN PARADO | GARRA
                </div>
                <p class="text-sub" style="font-size: 0.78rem; text-align: left; line-height: 1.4;">
                  Solidez defensiva asfixiante, balones parados letales, garra de potrero y fuerza en finales.
                </p>
              </div>

            </div>

            <!-- FILTRO DE REGIÓN PREFERIDA -->
            <div style="background: #0f172a; padding: 14px; border-radius: 10px; border: 1px solid var(--border-color); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div>
                <span style="font-size: 0.84rem; font-weight: 800; color: #fff;">🌍 Preferencia de Región para buscar Clubes:</span>
                <span class="text-sub d-block" style="font-size: 0.76rem;">Elige si deseas explorar una región en específico o cualquier lugar del mundo.</span>
              </div>
              <select id="selectRegionFilter" class="input-select" style="min-width: 200px;">
                <option value="ALL" ${selectedRegionFilter === 'ALL' ? 'selected' : ''}>🌐 Cualquier Región (Mundial)</option>
                <option value="Sudamérica" ${selectedRegionFilter === 'Sudamérica' ? 'selected' : ''}>🌎 Sudamérica</option>
                <option value="Europa" ${selectedRegionFilter === 'Europa' ? 'selected' : ''}>🌍 Europa</option>
                <option value="Norteamérica" ${selectedRegionFilter === 'Norteamérica' ? 'selected' : ''}>🦅 Norteamérica</option>
                <option value="Asia" ${selectedRegionFilter === 'Asia' ? 'selected' : ''}>🌸 Asia</option>
              </select>
            </div>

            <div style="display: flex; gap: 14px;">
              <button id="btnBackToStep1" class="btn-secondary" style="flex: 1; padding: 14px; font-weight: 800;">
                ⬅️ VOLVER AL PERFIL
              </button>
              <button id="btnNextToStep3" class="btn-primary btn-large" style="flex: 2; font-size: 1rem; font-weight: 900;">
                🔍 BUSCAR CLUBES COINCIDENTES ➔
              </button>
            </div>
          </div>
        ` : ''}

        <!-- PASO 3: RECOMENDACIÓN DE 3 CLUBES COINCIDENTES -->
        ${currentStep === 3 ? `
          <div style="width: 100%; max-width: 1100px;">
            <div class="glass-panel mb-3 text-center" style="padding: 16px; border: 1px solid var(--border-color); background: #121826;">
              <span class="text-sub" style="font-weight: 800; font-size: 0.82rem;">DIRECTOR TÉCNICO: <strong style="color: #fff;">${managerName}</strong> (${COUNTRY_FLAGS[managerCountry] || '🏳️'} ${managerCountry}, ${managerAge}a)</span>
              <span style="margin: 0 10px; color: var(--border-color);">|</span>
              <span class="text-sub" style="font-weight: 800; font-size: 0.82rem;">IDENTIDAD TÁCTICA: <strong style="color: var(--accent-gold);">${MANAGER_ARCHETYPES[selectedArchetype]?.name || 'POSESIÓN'}</strong></span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px;" id="matchingOffersContainer"></div>

            <div style="margin-top: 20px; text-align: center;">
              <button id="btnBackToStep2" class="btn-secondary" style="padding: 12px 24px; font-weight: 800;">
                ⬅️ RECALCULAR O CAMBIAR FILOSOFÍA TÁCTICA
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
      const countrySelect = document.getElementById('selectManagerCountry');
      const displayAge = document.getElementById('displayAge');
      const displayEndAge = document.getElementById('displayEndAge');

      nameInput.addEventListener('input', (e) => { managerName = e.target.value; });
      ageInput.addEventListener('input', (e) => {
        managerAge = parseInt(e.target.value) || 35;
        if (displayAge) displayAge.innerText = managerAge;
        if (displayEndAge) displayEndAge.innerText = managerAge + 25;
      });
      countrySelect.addEventListener('change', (e) => { managerCountry = e.target.value; });

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
          e.currentTarget.style.borderColor = selectedArchetype === 'GUARDIOLA' ? 'var(--accent-green)' : (selectedArchetype === 'XABI_ALONSO' ? 'var(--accent-cyan)' : 'var(--accent-gold)');
          e.currentTarget.style.background = '#141d2e';
        });
      });

      document.getElementById('selectRegionFilter').addEventListener('change', (e) => {
        selectedRegionFilter = e.target.value;
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
    }
  };

  /**
   * Renderiza las 3 tarjetas de ofertas de clubes coincidentes en el Paso 3
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
          <span class="text-sub" style="font-size: 0.8rem;">${o.team.leagueName} (${COUNTRY_FLAGS[o.team.country] || '🏳️'} ${o.team.country})</span>

          <!-- CARTA NARRATIVA DE LA JUNTA DIRECTIVA -->
          <div style="background: #0f172a; border: 1px solid var(--border-color); padding: 12px; border-radius: 10px; margin: 14px 0; text-align: left; font-size: 0.8rem; line-height: 1.4;" class="text-sub">
            📩 <strong>Propuesta de la Directiva:</strong><br>
            <em>"${o.letterMessage}"</em>
          </div>

          <div style="background: #0d1320; padding: 10px 12px; border-radius: 8px; margin-bottom: 14px; text-align: left; font-size: 0.82rem;">
            <p style="margin-bottom: 4px;">📊 <strong>Nivel Plantilla:</strong> OVR ${o.team.overall}</p>
            <p style="margin-bottom: 0;">💰 <strong>Presupuesto Fichajes:</strong> <strong class="text-highlight">€${(o.team.budget / 1000000).toFixed(1)}M</strong></p>
          </div>
        </div>

        <button class="btn-primary btn-sign-club" data-id="${o.team.id}" style="width: 100%; padding: 12px; font-weight: 900; font-size: 0.95rem; background: var(--accent-green); color: #000;">
          ✍️ FIRMAR CONTRATO CON ${o.team.name.toUpperCase()}
        </button>
      </div>
    `).join('');

    document.querySelectorAll('.btn-sign-club').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const teamId = e.currentTarget.dataset.id;

        sfx.playGoal();
        db.newCareer(teamId, managerName, managerCountry, managerAge, selectedArchetype);
        onCareerStarted();
      });
    });
  };

  renderStep();
}
