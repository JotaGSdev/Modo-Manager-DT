// Pantalla Cinemática de Selección de 3 Ofertas de Clubes e Inicio de Carrera de DT con Línea de Tiempo Narrativa (Edad 35 a 60)

import { db } from '../data/db.js';
import { renderTeamBadgeSVG } from './badgeHelper.js';
import { sfx } from '../../assets/audio/sfx.js';

export function renderNewCareer(container, onCareerStarted) {
  let selectedRegion = 'Sudamérica';
  let selectedLeagueId = 'arg_1';
  let managerName = 'Director Técnico';
  let managerCountry = 'Argentina';

  const updateOffersGrid = () => {
    const league = db.leagues.find(l => l.id === selectedLeagueId) || db.leagues[0];
    const offersContainer = document.getElementById('threeOffersGrid');
    if (!league || !offersContainer) return;

    const teams = [...league.teams].sort((a, b) => b.overall - a.overall);
    
    // Seleccionar 3 clubes con distintas narrativas y objetivos
    const topTeam = teams[0] || teams[0]; // Élite / Candidato
    const midTeam = teams[Math.floor(teams.length / 2)] || teams[1]; // Protagonista
    const underdogTeam = teams[teams.length - 1] || teams[2]; // Desafío de Cantera

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
      <div class="team-select-card glass-panel text-center">
        <span class="badge mb-2" style="background: ${o.badgeColor}; color: #000; font-weight: 800; font-size: 0.78rem;">${o.projectType}</span>
        
        <div style="margin: 12px 0;">
          ${renderTeamBadgeSVG(o.team, 64)}
        </div>

        <h3 style="margin-top: 6px; font-size: 1.2rem; color: #ffffff;">${o.team.name}</h3>
        <span class="text-sub" style="font-size: 0.8rem;">${league.name} (${league.country})</span>

        <div style="background: #0f172a; padding: 10px; border-radius: 8px; margin: 14px 0; width: 100%; text-align: left; font-size: 0.82rem;">
          <p style="margin-bottom: 4px;">🎯 <strong>Objetivo:</strong> ${o.objective}</p>
          <p style="margin-bottom: 4px;">📊 <strong>Nivel Plantilla:</strong> OVR ${o.team.overall}</p>
          <p style="margin-bottom: 4px;">💰 <strong>Presupuesto:</strong> <strong class="text-highlight">€${(o.team.budget / 1000000).toFixed(1)}M</strong></p>
          <p style="margin-bottom: 0;">📣 <strong>Directiva:</strong> ${o.expectation}</p>
        </div>

        <button class="btn-primary btn-sign-club" data-id="${o.team.id}" style="width: 100%; padding: 12px; font-weight: 800; font-size: 0.9rem;">
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

  let selectedArchetype = 'GUARDIOLA';

  container.innerHTML = `
    <div class="new-career-narrative-layout" style="display: grid; grid-template-columns: 340px 1fr; gap: 24px; max-width: 1320px; margin: 0 auto;">
      
      <!-- COLUMNA IZQUIERDA: PERFIL DEL DT Y LÍNEA DE TIEMPO (EDAD 35 A 60) -->
      <div class="glass-panel text-center" style="padding: 24px 18px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="background: linear-gradient(135deg, var(--accent-cyan), var(--accent-green)); width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; margin: 0 auto 14px auto;">
            👔
          </div>
          <h2 style="font-size: 1.4rem; color: #ffffff; margin-bottom: 4px;">Director Técnico</h2>
          <span class="text-sub" style="font-size: 0.85rem;">Inicio de Carrera Leyenda (2026)</span>

          <div class="form-group mt-3 text-left">
            <label class="form-label" style="font-size: 0.8rem; font-weight: 700;">Nombre del Entrenador:</label>
            <input type="text" id="inputManagerName" class="input-text" value="Director Técnico" style="width: 100%;" />
          </div>

          <div class="form-group mt-2 text-left">
            <label class="form-label" style="font-size: 0.8rem; font-weight: 700;">Nacionalidad:</label>
            <select id="selectManagerCountry" class="input-select" style="width: 100%;">
              <option value="Argentina" selected>🇦🇷 Argentina</option>
              <option value="Brasil">🇧🇷 Brasil</option>
              <option value="España">🇪🇸 España</option>
              <option value="Colombia">🇨🇴 Colombia</option>
              <option value="México">🇲🇽 México</option>
              <option value="Chile">🇨🇱 Chile</option>
              <option value="Uruguay">🇺🇾 Uruguay</option>
              <option value="Inglaterra">🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra</option>
              <option value="Francia">🇫🇷 Francia</option>
            </select>
          </div>
        </div>

        <!-- LÍNEA DE TIEMPO NARRATIVA DE LA CARRERA (EDAD 35 A 60) -->
        <div style="background: #0f172a; border: 1px solid var(--border-color); padding: 14px; border-radius: 10px; margin-top: 18px; text-align: left;">
          <h4 style="color: var(--accent-gold); font-size: 0.9rem; margin-bottom: 10px;">📅 Trayectoria Profesional (35 a 60 años)</h4>
          
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.78rem;">
            <div style="display: flex; gap: 10px; align-items: center;">
              <span class="badge" style="background: var(--accent-green); color: #000; font-weight: 900;">35a</span>
              <span><strong>2026:</strong> Debut & Elección entre 3 Clubes</span>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <span class="badge" style="background: #334155; color: #fff;">42a</span>
              <span><strong>2033:</strong> Consolidación Táctica & Copas</span>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <span class="badge" style="background: #334155; color: #fff;">50a</span>
              <span><strong>2041:</strong> Consagración Élite Mundial</span>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <span class="badge" style="background: var(--accent-gold); color: #000; font-weight: 900;">60a</span>
              <span><strong>2051:</strong> Retiro & Vitrina de Trofeos</span>
            </div>
          </div>
        </div>
      </div>

      <!-- COLUMNA DERECHA: SELECCIÓN DE ARQUETIPO TÁCTICO Y 3 OFERTAS -->
      <div>
        <!-- PREGUNTA ESTILO POTRERO: ¿QUÉ CLASE DE DIRECTOR TÉCNICO SOS? -->
        <div class="glass-panel mb-4">
          <h2 style="font-size: 1.4rem; color: var(--accent-gold); margin-bottom: 4px;">¿QUÉ CLASE DE DIRECTOR TÉCNICO SOS?</h2>
          <p class="text-sub mb-3" style="font-size: 0.88rem;">Tu arquetipo táctico te definirá en la cancha y otorgará atributos especiales a tu plantilla:</p>
          
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;" id="archetypeGrid">
            <div class="archetype-card glass-panel text-center selected" data-id="GUARDIOLA" style="padding: 14px; cursor: pointer; border: 2px solid var(--accent-green);">
              <span style="font-size: 1.8rem;">⚽</span>
              <h4 style="font-size: 0.95rem; margin-top: 6px; color: #fff;">EL MAESTRO POSESIÓN</h4>
              <span class="text-sub" style="font-size: 0.75rem;">Estilo Pep Guardiola / Xavi</span>
              <div class="badge mt-2" style="background: rgba(0, 200, 133, 0.2); color: var(--accent-green); font-size: 0.72rem;">+8 PASES CORTOS</div>
            </div>

            <div class="archetype-card glass-panel text-center" data-id="XABI_ALONSO" style="padding: 14px; cursor: pointer; border: 2px solid transparent;">
              <span style="font-size: 1.8rem;">⚡</span>
              <h4 style="font-size: 0.95rem; margin-top: 6px; color: #fff;">REY CONTRAATAQUE</h4>
              <span class="text-sub" style="font-size: 0.75rem;">Estilo Xabi Alonso / Klopp</span>
              <div class="badge mt-2" style="background: rgba(0, 150, 199, 0.2); color: var(--accent-cyan); font-size: 0.72rem;">+8 VELOCIDAD ATAQUE</div>
            </div>

            <div class="archetype-card glass-panel text-center" data-id="DE_LA_FUENTE" style="padding: 14px; cursor: pointer; border: 2px solid transparent;">
              <span style="font-size: 1.8rem;">🔥</span>
              <h4 style="font-size: 0.95rem; margin-top: 6px; color: #fff;">POTRERO & BALÓN PARADO</h4>
              <span class="text-sub" style="font-size: 0.75rem;">Estilo Luis de la Fuente / Simeone</span>
              <div class="badge mt-2" style="background: rgba(229, 169, 60, 0.2); color: var(--accent-gold); font-size: 0.72rem;">+8 BALÓN PARADO</div>
            </div>
          </div>
        </div>

        <div class="glass-panel mb-4">
          <h1 class="brand-heading" style="font-size: 1.6rem; margin: 0;">⚽ LIGA Y PROYECTO INICIAL DE CARRERA</h1>
          <p class="text-sub mt-1">Elige la liga y analiza las 3 ofertas iniciales de contrato:</p>

          <div style="display: flex; gap: 16px; margin-top: 14px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
              <label class="form-label">Región Continental:</label>
              <select id="selectRegion" class="input-select" style="width: 100%;">
                <option value="Sudamérica" selected>Sudamérica (Argentina, Brasil, Col...)</option>
                <option value="Europa">Europa (España, Ing, Ita, Ale...)</option>
                <option value="Norteamérica">Norteamérica (Liga MX / MLS)</option>
                <option value="Asia">Asia (Arabia Saudita / Japón)</option>
              </select>
            </div>

            <div style="flex: 1; min-width: 200px;">
              <label class="form-label">Liga / Competición:</label>
              <select id="selectLeague" class="input-select" style="width: 100%;"></select>
            </div>
          </div>
        </div>

        <!-- REJILLA DE LAS 3 OFERTAS DE CONTRATO INICIALES -->
        <h3 class="mb-3" style="color: var(--accent-cyan);">💼 Ofertas de Proyecto Deportivo Presentadas (Elige 1 de los 3 Clubes):</h3>
        <div id="threeOffersGrid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;"></div>
      </div>

    </div>
  `;

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
