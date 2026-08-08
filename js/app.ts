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
 * Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.
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
import type { Team } from './types.js';

class App {
  /** Vista activa actual en pantalla (propiedad pública como en el JS original) */
  currentView: string = 'dashboard';

  /** Referencia al contenedor HTML <main id="mainContent"> */
  private mainContainer: HTMLElement | null = null;

  /**
   * Punto de entrada de la aplicación.
   * Carga la BD y decide si mostrar la selección de carrera o el dashboard.
   */
  async init(): Promise<void> {
    await db.init();
    const appEl = document.getElementById('app');

    // Si no hay guardado previo ni estado de juego activo, ir a Nueva Carrera
    if (!db.hasSave() && !db.gameState) {
      renderNewCareer(appEl!, () => this.startMainLayout());
    } else {
      // v3.7: verificar la integridad del save (JSON + checksum FNV-1a) antes
      // de cargar; si está corrupto o truncado, ofrecer recuperar el último
      // autoguardado válido en lugar de arrancar con un estado roto.
      const integrity = db.checkSaveIntegrity();
      if (integrity === 'corrupted') {
        this.showSaveRecoveryModal();
      } else {
        db.loadGame();
        this.startMainLayout();
      }
    }
  }

  /**
   * Modal de recuperación (v3.7): se muestra cuando el save principal está
   * corrupto o truncado. Ofrece restaurar el último autoguardado válido
   * (si existe) o empezar una nueva carrera.
   */
  private showSaveRecoveryModal(): void {
    const hasBackup = db.hasValidBackup();
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,.85);display:flex;align-items:center;justify-content:center;z-index:9999;';
    overlay.innerHTML = `
      <div class="glass-panel" style="max-width:440px;width:90%;padding:24px;text-align:center;">
        <div style="font-size:2.4rem;">🚑</div>
        <h2 style="color:var(--accent-red);margin:8px 0;">¡Partida dañada!</h2>
        <p class="text-sub" style="font-size:0.9rem;line-height:1.5;">
          El guardado principal está <strong>corrupto o truncado</strong> y no puede leerse
          (verificación de checksum fallida).
          ${hasBackup
            ? 'Se encontró un <strong>autoguardado válido</strong> de tu última sesión.'
            : 'No se encontró ningún autoguardado válido.'}
        </p>
        <div class="mt-4" style="display:flex;gap:12px;justify-content:center;">
          ${hasBackup ? '<button id="btnRecoverSave" class="btn-primary" style="flex:1;">⬅️ Recuperar autoguardado</button>' : ''}
          <button id="btnNewCareerAfterCorrupt" class="btn-secondary" style="flex:1;">🔄 Nueva carrera</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('btnNewCareerAfterCorrupt')!.addEventListener('click', () => {
      sfx.playClick();
      db.clearSave();
      location.reload();
    });

    const recoverBtn = document.getElementById('btnRecoverSave');
    if (recoverBtn) {
      recoverBtn.addEventListener('click', () => {
        sfx.playClick();
        if (db.recoverFromBackup()) {
          overlay.remove();
          this.startMainLayout();
        } else {
          alert('No se pudo recuperar el autoguardado. Inicia una nueva carrera.');
        }
      });
    }
  }

  /**
   * Construye el marco principal (Navbar + Sidebar + Main Content)
   */
  startMainLayout(): void {
    const appEl = document.getElementById('app')!;
    const gameState = db.gameState!;
    const userTeam = db.teams[gameState.userTeamId] || { id: gameState.userTeamId, name: 'Mi Club', short: 'FC', overall: 70, colors: ['#00aaff', '#00ffaa'], stadium: 'Estadio Principal', budget: 0, reputation: 50 };
    const contract = ContractEngine.evaluatePerformance() || ContractEngine.startClubContract(gameState.userTeamId, 3);
    const seasonLabel = `${gameState.season}/${gameState.season + 1}`;

    appEl.innerHTML = `
      <!-- Navbar Superior estilo EA FC con KPIs en Tiempo Real -->
      <nav class="top-navbar">
        <div class="brand-logo">⚽ ENTRENADOR LEYENDA</div>

        <div class="manager-status-bar" id="topStatusBar">
          <div class="status-pill">DT: <strong id="topManagerDisplay">${gameState.managerName}</strong></div>
          <div class="status-pill">Club: <strong id="topClubDisplay">${userTeam.name}</strong></div>
          <div class="status-pill">Presupuesto: <strong class="text-highlight" id="topBudgetDisplay">€${(gameState.budget / 1000000).toFixed(1)}M</strong></div>
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
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        this.navigateTo(target.dataset.view!);
      });
    });

    // Event listener para Reiniciar Carrera
    document.getElementById('btnResetCareer')!.addEventListener('click', () => {
      if (confirm('¿Estás seguro de reiniciar la carrera actual de DT? Se perderán los datos de guardado.')) {
        db.clearSave();
        location.reload();
      }
    });

    this.checkSupportTipVisibility();
    this.navigateTo('dashboard');
  }

  /**
   * Sincronización instantánea de los KPIs en la barra superior (DT, Club, Presupuesto, Confianza, Temporada)
   */
  updateTopStatusBar(): void {
    if (!db.gameState) return;
    const gameState = db.gameState;

    const contract = ContractEngine.evaluatePerformance();

    const mDisplay = document.getElementById('topManagerDisplay');
    const cDisplay = document.getElementById('topClubDisplay');
    const bDisplay = document.getElementById('topBudgetDisplay');
    const confDisplay = document.getElementById('topConfidenceDisplay');
    const sDisplay = document.getElementById('topSeasonDisplay');
    const navContract = document.getElementById('navItemContract');

    if (mDisplay) {
      const country = gameState.managerCountry || '';
      const age = gameState.managerAge ? ` (${gameState.managerAge}a)` : '';
      mDisplay.innerHTML = `${gameState.managerName || 'Director Técnico'} ${country ? renderCountryFlagSVG(country, 16) : ''}${age}`;
    }
    
    const userTeam = db.teams[gameState.userTeamId];
    if (cDisplay && userTeam) cDisplay.innerText = userTeam.name;

    if (bDisplay) bDisplay.innerText = `€${(gameState.budget / 1000000).toFixed(1)}M`;
    
    if (confDisplay && contract) {
      confDisplay.innerText = `${contract.boardConfidence}%`;
      confDisplay.style.color = contract.boardConfidence > 65 ? 'var(--accent-green)' : (contract.boardConfidence > 45 ? '#ffd700' : 'var(--accent-red)');
    }

    if (sDisplay) {
      sDisplay.innerText = `${gameState.season}/${gameState.season + 1}`;
    }

    if (navContract && contract) {
      navContract.innerText = `📜 Mi Contrato (${contract.yearsRemaining}a)`;
    }
  }

  /**
   * Controla la visibilidad del botón de donaciones voluntarias al final de la trayectoria
   */
  checkSupportTipVisibility(): void {
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
   * @param viewName - Nombre de la vista destino
   * @param params - Parámetros adicionales para la vista (ej. rival, mode, isFinal)
   */
  navigateTo(viewName: string, params: Record<string, unknown> = {}): void {
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
        // Contrato que establece dashboardUI al navegar: { rival: Team, mode?, isFinal? }
        const matchParams = params as { rival: Team; mode?: string; isFinal?: boolean };
        renderMatch(this.mainContainer, matchParams.rival, matchParams.mode, matchParams.isFinal, (v: string, p?: Record<string, unknown>) => this.navigateTo(v, p));
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
        db.clearSave();
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
