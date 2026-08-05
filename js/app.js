/**
 * ============================================================================
 * ENTRENADOR LEYENDA - APLICACIÓN PRINCIPAL (Router & Global Layout)
 * ============================================================================
 * Módulo central que orquesta:
 * 1. Inicialización de la Base de Datos (db.js) y verificación de guardado.
 * 2. Carga de la pantalla inicial de Nueva Carrera (newCareerUI.js) o el Layout Principal.
 * 3. Renderizado de la Navbar superior estilo EA FC (DT, Club, Presupuesto, Confianza, Temporada).
 * 4. Navegación entre vistas sin recarga de página (Single Page Application - SPA).
 * 5. Manejo defensivo de errores con sanitización y recuperación automática.
 */

import { db } from './data/db.js';
import { renderNewCareer } from './ui/newCareerUI.js';
import { renderDashboard } from './ui/dashboardUI.js';
import { renderSquad } from './ui/squadUI.js';
import { renderTactics } from './ui/tacticsUI.js';
import { renderTransfers } from './ui/transfersUI.js';
import { renderYouth } from './ui/youthUI.js';
import { renderTrophyRoom } from './ui/trophyUI.js';
import { renderMatch } from './ui/matchUI.js';
import { renderContractView } from './ui/contractUI.js';
import { renderFinances } from './ui/financesUI.js';
import { renderScoutingView } from './ui/scoutingUI.js';
import { ContractEngine } from './engine/contracts.js';
import { sfx } from '../assets/audio/sfx.js';
import { renderCountryFlagSVG } from './ui/badgeHelper.js';

class App {
  constructor() {
    /** @type {string} Vista activa actual en pantalla */
    this.currentView = 'dashboard';

    /** @type {HTMLElement|null} Referencia al contenedor HTML <main id="mainContent"> */
    this.mainContainer = null;
  }

  /**
   * Punto de entrada de la aplicación.
   * Carga la BD y decide si mostrar la selección de carrera o el dashboard.
   */
  async init() {
    await db.init();
    const appEl = document.getElementById('app');
    
    // Si no hay guardado previo ni estado de juego activo, ir a Nueva Carrera
    if (!db.hasSave() && !db.gameState) {
      renderNewCareer(appEl, () => this.startMainLayout());
    } else {
      db.loadGame();
      this.startMainLayout();
    }
  }

  /**
   * Construye el marco principal (Navbar + Sidebar + Main Content)
   */
  startMainLayout() {
    const appEl = document.getElementById('app');
    const userTeam = db.teams[db.gameState.userTeamId] || { name: 'Mi Club' };
    const contract = ContractEngine.evaluatePerformance() || ContractEngine.startClubContract(db.gameState.userTeamId, 3);
    const seasonLabel = `${db.gameState.season}/${db.gameState.season + 1}`;

    appEl.innerHTML = `
      <!-- Navbar Superior estilo EA FC con KPIs en Tiempo Real -->
      <nav class="top-navbar">
        <div class="brand-logo">⚽ ENTRENADOR LEYENDA</div>

        <div class="manager-status-bar" id="topStatusBar">
          <div class="status-pill">DT: <strong id="topManagerDisplay">${db.gameState.managerName}</strong></div>
          <div class="status-pill">Club: <strong id="topClubDisplay">${userTeam.name}</strong></div>
          <div class="status-pill">Presupuesto: <strong class="text-highlight" id="topBudgetDisplay">€${(db.gameState.budget / 1000000).toFixed(1)}M</strong></div>
          <div class="status-pill">Confianza Directiva: <strong class="text-highlight" id="topConfidenceDisplay">${contract.boardConfidence}%</strong></div>
          <div class="status-pill">Temporada: <strong id="topSeasonDisplay">${seasonLabel}</strong></div>
        </div>
      </nav>

      <div class="main-wrapper">
        <!-- Sidebar de Navegación Lateral -->
        <aside class="sidebar-nav">
          <a class="nav-item active" data-view="dashboard">🏠 Dashboard</a>
          <a class="nav-item" data-view="contract" id="navItemContract">📜 Mi Contrato (${contract.yearsRemaining}a)</a>
          <a class="nav-item" data-view="squad">📋 Plantilla Hub</a>
          <a class="nav-item" data-view="tactics">🧩 Tácticas & Alineación</a>
          <a class="nav-item" data-view="transfers">📝 Mercado Fichajes</a>
          <a class="nav-item" data-view="scouting">🔭 Centro de Análisis</a>
          <a class="nav-item" data-view="youth">🌱 Cantera</a>
          <a class="nav-item" data-view="finances">💶 Finanzas</a>
          <a class="nav-item" data-view="trophies">🏆 Palmarés</a>
          <a class="nav-item mt-4" id="btnResetCareer" style="color: var(--accent-red);">🔄 Nueva Carrera</a>
        </aside>

        <!-- Contenedor Dinámico para Renderizar Vistas -->
        <main id="mainContent" class="main-content"></main>
      </div>

      <!-- Botón de Apoyo Voluntario (Aparece ÚNICAMENTE al completar las 25 temporadas) -->
      <a id="supportTipBtn" 
         href="https://buymeacoffee.com" 
         target="_blank" 
         rel="noopener noreferrer" 
         class="support-tip-btn hidden">
        ☕ 💰 Apoyar el proyecto
      </a>
    `;

    this.mainContainer = document.getElementById('mainContent');

    // Registrar función global para refrescar la barra de estado superior desde cualquier módulo
    window.updateGlobalUI = () => this.updateTopStatusBar();

    // Event listeners para la navegación del Sidebar
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', (e) => {
        sfx.playClick();
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.navigateTo(e.currentTarget.dataset.view);
      });
    });

    // Event listener para Reiniciar Carrera
    document.getElementById('btnResetCareer').addEventListener('click', () => {
      if (confirm('¿Estás seguro de reiniciar la carrera actual de DT? Se perderán los datos de guardado.')) {
        localStorage.removeItem('entrenador_leyenda_save');
        location.reload();
      }
    });

    this.checkSupportTipVisibility();
    this.navigateTo('dashboard');
  }

  /**
   * Sincronización instantánea de los KPIs en la barra superior (DT, Club, Presupuesto, Confianza, Temporada)
   */
  updateTopStatusBar() {
    if (!db.gameState) return;

    const contract = ContractEngine.evaluatePerformance();

    const mDisplay = document.getElementById('topManagerDisplay');
    const cDisplay = document.getElementById('topClubDisplay');
    const bDisplay = document.getElementById('topBudgetDisplay');
    const confDisplay = document.getElementById('topConfidenceDisplay');
    const sDisplay = document.getElementById('topSeasonDisplay');
    const navContract = document.getElementById('navItemContract');

    if (mDisplay) {
      const country = db.gameState.managerCountry || '';
      const age = db.gameState.managerAge ? ` (${db.gameState.managerAge}a)` : '';
      mDisplay.innerHTML = `${db.gameState.managerName || 'Director Técnico'} ${country ? renderCountryFlagSVG(country, 16) : ''}${age}`;
    }
    
    const userTeam = db.teams[db.gameState.userTeamId];
    if (cDisplay && userTeam) cDisplay.innerText = userTeam.name;

    if (bDisplay) bDisplay.innerText = `€${(db.gameState.budget / 1000000).toFixed(1)}M`;
    
    if (confDisplay && contract) {
      confDisplay.innerText = `${contract.boardConfidence}%`;
      confDisplay.style.color = contract.boardConfidence > 65 ? 'var(--accent-green)' : (contract.boardConfidence > 45 ? '#ffd700' : 'var(--accent-red)');
    }

    if (sDisplay) {
      sDisplay.innerText = `${db.gameState.season}/${db.gameState.season + 1}`;
    }

    if (navContract && contract) {
      navContract.innerText = `📜 Mi Contrato (${contract.yearsRemaining}a)`;
    }
  }

  /**
   * Controla la visibilidad del botón de donaciones voluntarias al final de la trayectoria
   */
  checkSupportTipVisibility() {
    const tipBtn = document.getElementById('supportTipBtn');
    if (!tipBtn) return;

    const isCareerFinished = db.gameState && (db.gameState.isCareerFinished || db.gameState.season >= 2050);
    if (isCareerFinished) {
      tipBtn.classList.remove('hidden');
    } else {
      tipBtn.classList.add('hidden');
    }
  }

  /**
   * Cambia la vista activa del juego (Router SPA)
   * @param {string} viewName - Nombre de la vista destino
   * @param {Object} [params={}] - Parámetros adicionales para la vista (ej. rival, mode, isFinal)
   */
  navigateTo(viewName, params = {}) {
    this.currentView = viewName;
    if (!this.mainContainer) return;
    this.updateTopStatusBar();
    this.checkSupportTipVisibility();

    try {
      if (viewName === 'dashboard') {
        renderDashboard(this.mainContainer, (v, p) => this.navigateTo(v, p));
      } else if (viewName === 'contract') {
        renderContractView(this.mainContainer, (v, p) => this.navigateTo(v, p));
      } else if (viewName === 'squad') {
        renderSquad(this.mainContainer);
      } else if (viewName === 'tactics') {
        renderTactics(this.mainContainer);
      } else if (viewName === 'transfers') {
        renderTransfers(this.mainContainer);
      } else if (viewName === 'youth') {
        renderYouth(this.mainContainer);
      } else if (viewName === 'finances') {
        renderFinances(this.mainContainer, (v, p) => this.navigateTo(v, p));
      } else if (viewName === 'scouting') {
        renderScoutingView(this.mainContainer);
      } else if (viewName === 'trophies') {
        renderTrophyRoom(this.mainContainer);
      } else if (viewName === 'match') {
        renderMatch(this.mainContainer, params.rival, params.mode, params.isFinal, (v, p) => this.navigateTo(v, p));
      }
    } catch (err) {
      console.error(`Error al renderizar vista '${viewName}':`, err);
      this.mainContainer.innerHTML = `
        <div class="glass-panel text-center py-5">
          <h2>⚠️ Restauración de Datos de Carrera</h2>
          <p class="text-sub mt-2">La partida actual ha sido sanitizada y protegida automáticamente.</p>
          <div class="mt-4" style="display: flex; gap: 14px; justify-content: center;">
            <button id="btnRecoverDashboard" class="btn-primary">🏠 Cargar Dashboard</button>
            <button id="btnResetDataModal" class="btn-secondary">🔄 Nueva Carrera</button>
          </div>
        </div>
      `;
      document.getElementById('btnRecoverDashboard')?.addEventListener('click', () => {
        if (db.gameState && db.gameState.userTeamId) {
          const userTeam = db.teams[db.gameState.userTeamId];
          const userLeague = db.leagues.find(l => l.id === userTeam?.leagueId);
          if (userLeague && (!db.gameState.standings || db.gameState.standings.length === 0)) {
            db.gameState.standings = userLeague.teams.map(t => ({
              teamId: t.id, name: t.name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0
            }));
          }
        }
        location.reload();
      });
      document.getElementById('btnResetDataModal')?.addEventListener('click', () => {
        localStorage.removeItem('entrenador_leyenda_save');
        location.reload();
      });
    }
  }
}

// Inicialización cuando el DOM está completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
