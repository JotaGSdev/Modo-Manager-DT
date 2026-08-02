// Pantalla Cinemática de Selección de 3 Ofertas de Clubes e Inicio de Carrera de DT con Todos los Países de la BD y Diseño UI/UX Rediseñado

import { db } from '../data/db.js';
import { renderTeamBadgeSVG } from './badgeHelper.js';
import { sfx } from '../../assets/audio/sfx.js';

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

export function renderNewCareer(container, onCareerStarted) {
  let selectedRegion = 'Sudamérica';
  let selectedLeagueId = 'arg_1';
  let selectedArchetype = 'GUARDIOLA';

  // Obtener lista completa de países presentes en las ligas de la BD
  const countriesInDB = Array.from(new Set(db.leagues.map(l => l.country))).sort();

  const updateOffersGrid = () => {
    const league = db.leagues.find(l => l.id === selectedLeagueId) || db.leagues[0];
    const offersContainer = document.getElementById('threeOffersGrid');
    if (!league || !offersContainer) return;

    const teams = [...league.teams].sort((a, b) => b.overall - a.overall);
    
    const topTeam = teams[0] || teams[0]; 
    const midTeam = teams[Math.floor(teams.length / 2)] || teams[1]; 
    const underdogTeam = teams[teams.length - 1] || teams[2]; 

    const offers = [
      {
        team: topTeam,
        projectType: '🏆 PROYECTO ÉLITE / CANDIDATO',
        objective: 'Pelear el Título de Liga y Consagración Continental',
        badgeColor: 'var(--accent-gold)',
        expectation: 'Exigencia Máxima: Obligado a campeonar'
      },
      {
        team: midTeam,
        projectType: '⚽ PROYECTO PROTAGONISTA',
        objective: 'Clasificar a Copas Internacionales y Consolidar Estilo',
        badgeColor: 'var(--accent-cyan)',
        expectation: 'Exigencia Media: Luchar en la zona alta'
      },
      {
        team: underdogTeam,
        projectType: '🌱 DESAFÍO CANTERANO',
        objective: 'Desarrollar Jóvenes Talentos y Mantener la Categoría',
        badgeColor: 'var(--accent-green)',
        expectation: 'Exigencia Moderada: Maximizar la cantera'
      }
    ];

    offersContainer.innerHTML = offers.map(o => `
      <div class="team-select-card glass-panel text-center" style="border: 1px solid var(--border-color); padding: 18px; border-radius: 12px; transition: transform 0.2s ease;">
        <span class="badge mb-2" style="background: ${o.badgeColor}; color: #000; font-weight: 800; font-size: 0.76rem;">${o.projectType}</span>
        
        <div style="margin: 10px 0;">
          ${renderTeamBadgeSVG(o.team, 58)}
        </div>

        <h3 style="margin-top: 4px; font-size: 1.15rem; color: #ffffff;">${o.team.name}</h3>
        <span class="text-sub" style="font-size: 0.78rem;">${league.name} (${league.country})</span>

        <div style="background: #0f172a; padding: 10px; border-radius: 8px; margin: 12px 0; width: 100%; text-align: left; font-size: 0.8rem;">
          <p style="margin-bottom: 3px;">🎯 <strong>Objetivo:</strong> ${o.objective}</p>
          <p style="margin-bottom: 3px;">📊 <strong>Nivel Plantilla:</strong> OVR ${o.team.overall}</p>
          <p style="margin-bottom: 3px;">💰 <strong>Presupuesto:</strong> <strong class="text-highlight">€${(o.team.budget / 1000000).toFixed(1)}M</strong></p>
          <p style="margin-bottom: 0;">📣 <strong>Directiva:</strong> ${o.expectation}</p>
        </div>

        <button class="btn-primary btn-sign-club" data-id="${o.team.id}" style="width: 100%; padding: 10px; font-weight: 800; font-size: 0.88rem;">
          ✍️ FIRMAR POR ESTE CLUB
        </button>
      </div>
    `).join('');

    document.querySelectorAll('.btn-sign-club').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const teamId = e.currentTarget.dataset.id;
        const nameInput = document.getElementById('inputManagerName');
        const countryInput = document.getElementById('selectManagerCountry');

        const finalName = nameInput?.value || 'Director Técnico';
        const finalCountry = countryInput?.value || 'Argentina';

        sfx.playWhistle();
        db.newCareer(teamId, finalName, finalCountry);
        onCareerStarted();
      });
    });
  };

  const updateLeagueSelect = () => {
    const leagues = db.leagues.filter(l => l.region === selectedRegion);
    const leagueSelect = document.getElementById('selectLeague');
    if (!leagueSelect) return;

    leagueSelect.innerHTML = leagues.map(l => `
      <option value="${l.id}" ${l.id === selectedLeagueId ? 'selected' : ''}>${l.name} (${l.country})</option>
    `).join('');

    if (!leagues.some(l => l.id === selectedLeagueId)) {
      selectedLeagueId = leagues[0]?.id || 'arg_1';
    }
    updateOffersGrid();
  };

  container.innerHTML = `
    <div class="new-career-narrative-layout" style="display: grid; grid-template-columns: 320px 1fr; gap: 20px; max-width: 1320px; margin: 0 auto;">
      
      <!-- COLUMNA IZQUIERDA: PERFIL DEL DT Y LÍNEA DE TIEMPO (EDAD 35 A 60) -->
      <div class="glass-panel text-center" style="padding: 20px 16px; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid var(--border-color);">
        <div>
          <div style="background: linear-gradient(135deg, var(--accent-cyan), var(--accent-green)); width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 12px auto;">
            👔
          </div>
          <h2 style="font-size: 1.3rem; color: #ffffff; margin-bottom: 2px;">Director Técnico</h2>
          <span class="text-sub" style="font-size: 0.8rem;">Inicio de Carrera Leyenda (2026)</span>

          <div class="form-group mt-3 text-left">
            <label class="form-label" style="font-size: 0.78rem; font-weight: 700;">Nombre del Entrenador:</label>
            <input type="text" id="inputManagerName" class="input-text" value="Director Técnico" style="width: 100%; font-size: 0.85rem;" />
          </div>

          <div class="form-group mt-2 text-left">
            <label class="form-label" style="font-size: 0.78rem; font-weight: 700;">Nacionalidad (Todos los Países):</label>
            <select id="selectManagerCountry" class="input-select" style="width: 100%; font-size: 0.85rem;">
              ${countriesInDB.map(c => `
                <option value="${c}" ${c === 'Argentina' ? 'selected' : ''}>
                  ${COUNTRY_FLAGS[c] || '🏳️'} ${c}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- LÍNEA DE TIEMPO NARRATIVA DE LA CARRERA (EDAD 35 A 60) -->
        <div style="background: #0f172a; border: 1px solid var(--border-color); padding: 12px; border-radius: 10px; margin-top: 14px; text-align: left;">
          <h4 style="color: var(--accent-gold); font-size: 0.85rem; margin-bottom: 8px;">📅 Trayectoria Profesional (35 a 60 años)</h4>
          
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.75rem;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <span class="badge" style="background: var(--accent-green); color: #000; font-weight: 900; padding: 2px 6px;">35a</span>
              <span><strong>2026:</strong> Debut & Elección de Club</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span class="badge" style="background: #334155; color: #fff; padding: 2px 6px;">42a</span>
              <span><strong>2033:</strong> Consolidación & Copas</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span class="badge" style="background: #334155; color: #fff; padding: 2px 6px;">50a</span>
              <span><strong>2041:</strong> Consagración Élite Mundial</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span class="badge" style="background: var(--accent-gold); color: #000; font-weight: 900; padding: 2px 6px;">60a</span>
              <span><strong>2051:</strong> Retiro & Vitrina Leyenda</span>
            </div>
          </div>
        </div>
      </div>

      <!-- COLUMNA DERECHA: ARQUETIPOS TÁCTICOS Y 3 OFERTAS INICIALES DE CLUB -->
      <div>
        <!-- SELECCIÓN INTERACTIVA DE ARQUETIPO DE ENTRENADOR -->
        <div class="glass-panel mb-3" style="padding: 16px; border: 1px solid var(--border-color);">
          <h2 style="font-size: 1.25rem; color: var(--accent-gold); margin-bottom: 2px;">¿QUÉ CLASE DE DIRECTOR TÉCNICO SOS?</h2>
          <p class="text-sub mb-3" style="font-size: 0.82rem;">Selecciona tu arquetipo táctico para definir la filosofía del equipo:</p>
          
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;" id="archetypeGrid">
            
            <div class="archetype-card glass-panel text-center selected" data-id="GUARDIOLA" style="padding: 12px; cursor: pointer; border: 2px solid var(--accent-green); background: #141d2e;">
              <span style="font-size: 1.6rem;">⚽</span>
              <h4 style="font-size: 0.88rem; margin-top: 4px; color: #fff;">MAESTRO POSESIÓN</h4>
              <span class="text-sub" style="font-size: 0.72rem;">Pep Guardiola / Xavi</span>
              <div class="badge mt-2" style="background: rgba(0, 200, 133, 0.2); color: var(--accent-green); font-size: 0.7rem; font-weight: 800;">+8 PASES CORTOS</div>
            </div>

            <div class="archetype-card glass-panel text-center" data-id="XABI_ALONSO" style="padding: 12px; cursor: pointer; border: 2px solid transparent; background: #0f172a;">
              <span style="font-size: 1.6rem;">⚡</span>
              <h4 style="font-size: 0.88rem; margin-top: 4px; color: #fff;">REY CONTRAATAQUE</h4>
              <span class="text-sub" style="font-size: 0.72rem;">Xabi Alonso / Klopp</span>
              <div class="badge mt-2" style="background: rgba(0, 150, 199, 0.2); color: var(--accent-cyan); font-size: 0.7rem; font-weight: 800;">+8 VELOCIDAD ATAQUE</div>
            </div>

            <div class="archetype-card glass-panel text-center" data-id="DE_LA_FUENTE" style="padding: 12px; cursor: pointer; border: 2px solid transparent; background: #0f172a;">
              <span style="font-size: 1.6rem;">🔥</span>
              <h4 style="font-size: 0.88rem; margin-top: 4px; color: #fff;">POTRERO & BALÓN PARADO</h4>
              <span class="text-sub" style="font-size: 0.72rem;">Luis de la Fuente / Simeone</span>
              <div class="badge mt-2" style="background: rgba(229, 169, 60, 0.2); color: var(--accent-gold); font-size: 0.7rem; font-weight: 800;">+8 BALÓN PARADO</div>
            </div>

          </div>
        </div>

        <!-- SELECCIÓN DE REGIÓN/LIGA Y REJILLA DE 3 OFERTAS -->
        <div class="glass-panel mb-3" style="padding: 16px; border: 1px solid var(--border-color);">
          <div style="display: flex; gap: 14px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 180px;">
              <label class="form-label" style="font-size: 0.78rem;">Región Continental:</label>
              <select id="selectRegion" class="input-select" style="width: 100%; font-size: 0.85rem;">
                <option value="Sudamérica" selected>Sudamérica (Argentina, Brasil, Col...)</option>
                <option value="Europa">Europa (España, Ing, Ita, Ale...)</option>
                <option value="Norteamérica">Norteamérica (Liga MX / MLS)</option>
                <option value="Asia">Asia (Arabia Saudita / Japón)</option>
              </select>
            </div>

            <div style="flex: 1; min-width: 180px;">
              <label class="form-label" style="font-size: 0.78rem;">Liga / Competición:</label>
              <select id="selectLeague" class="input-select" style="width: 100%; font-size: 0.85rem;"></select>
            </div>
          </div>
        </div>

        <!-- REJILLA DE LAS 3 OFERTAS DE CONTRATO INICIALES -->
        <h3 class="mb-2" style="color: var(--accent-cyan); font-size: 1rem;">💼 Ofertas de Proyecto Deportivo Presentadas (Elige 1 de los 3 Clubes):</h3>
        <div id="threeOffersGrid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;"></div>
      </div>

    </div>
  `;

  // Listener para cambio de arquetipo interactivo
  document.querySelectorAll('.archetype-card').forEach(card => {
    card.addEventListener('click', (e) => {
      sfx.playClick();
      selectedArchetype = e.currentTarget.dataset.id;
      document.querySelectorAll('.archetype-card').forEach(c => {
        c.classList.remove('selected');
        c.style.borderColor = 'transparent';
        c.style.background = '#0f172a';
      });
      e.currentTarget.classList.add('selected');
      e.currentTarget.style.borderColor = 'var(--accent-green)';
      e.currentTarget.style.background = '#141d2e';
    });
  });

  document.getElementById('selectRegion').addEventListener('change', (e) => {
    selectedRegion = e.target.value;
    updateLeagueSelect();
  });

  document.getElementById('selectLeague').addEventListener('change', (e) => {
    selectedLeagueId = e.target.value;
    updateOffersGrid();
  });

  updateLeagueSelect();
}
