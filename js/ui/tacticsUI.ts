// Vista de Tácticas & Alineación 2D Estilo EA FC / FIFA (Drag and Drop, Formaciones y Auto-Alineación)
// Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.

import { db } from '../data/db.js';
import { TacticsEngine, FORMATIONS, FC_IQ_ROLES } from '../engine/tactics.js';
import { cleanStyle } from '../engine/probability.js';
import { openPlayerInspectorModal } from './playerInspectorUI.js';
import { sfx } from '../../assets/audio/sfx.js';
import { ManagerRPG, TALENTS_CATALOG } from '../engine/managerRPG.js';
import { PlayerFormEngine } from '../engine/playerForm.js';

import type { FCIQRole, FormationId, PlayStyle, Player, Position, SkillLevels, StartingXIEntry, ManagerRPGState } from '../types.js';

function getDtTitle(level: number): string {
  if (level >= 20) return 'Leyenda Absoluta del Banquillo';
  if (level >= 12) return 'Maestro Táctico de Élite';
  if (level >= 7) return 'Mánager Consagrado';
  if (level >= 4) return 'Estratega en Ascenso';
  return 'Director Técnico Debutante';
}

function renderBranchTalents(branch: 'tactics' | 'locker' | 'scouting' | 'business', rpg: ManagerRPGState): string {
  const talents = TALENTS_CATALOG.filter(t => t.branch === branch);
  return talents.map(t => {
    const isUnlocked = Boolean(rpg.unlockedTalents[t.id]);
    const hasLevel = rpg.level >= t.requiredLevel;
    const prereq = t.prerequisiteId ? TALENTS_CATALOG.find(x => x.id === t.prerequisiteId) : null;
    const hasPrereq = !t.prerequisiteId || Boolean(rpg.unlockedTalents[t.prerequisiteId]);
    const canUnlock = !isUnlocked && hasLevel && hasPrereq && rpg.talentPoints >= t.cost;

    return `
      <div style="background: ${isUnlocked ? 'rgba(0, 200, 133, 0.08)' : '#141d2e'}; border: 1px solid ${isUnlocked ? 'var(--accent-green)' : '#23324a'}; padding: 10px; border-radius: 8px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.72rem; font-weight: 800; color: var(--accent-cyan); background: #0f172a; padding: 2px 6px; border-radius: 3px;">${t.icon}</span>
            <strong style="color: ${isUnlocked ? '#fff' : '#cbd5e1'}; font-size: 0.84rem;">${t.name}</strong>
            <span style="font-size: 0.65rem; color: #94a3b8; background: #0f172a; padding: 1px 5px; border-radius: 3px;">Tier ${t.tier}</span>
          </div>
          ${isUnlocked ? `
            <span style="color: var(--accent-green); font-size: 0.72rem; font-weight: 900; background: rgba(0, 200, 133, 0.15); padding: 3px 6px; border-radius: 4px;">ACTIVO</span>
          ` : canUnlock ? `
            <button class="btn-primary btn-sm btn-unlock-talent" data-talent="${t.id}" style="background: var(--accent-gold); color: #000; font-weight: 900; font-size: 0.72rem; padding: 4px 8px; cursor: pointer;">
              Desbloquear (${t.cost} pt)
            </button>
          ` : `
            <span style="color: #64748b; font-size: 0.68rem; background: #0f172a; padding: 2px 6px; border-radius: 4px;">
              Req: Nv.${t.requiredLevel}${!hasPrereq && prereq ? ` + ${prereq.name}` : ''}
            </span>
          `}
        </div>
        <p class="text-sub" style="font-size: 0.74rem; margin: 0 0 4px 0; line-height: 1.3;">${t.desc}</p>
        <div style="font-size: 0.72rem; color: var(--accent-cyan); font-weight: 700;">
          ${t.effectSummary}
        </div>
      </div>
    `;
  }).join('');
}

export function renderTactics(container: HTMLElement): void {
  const gameState = db.gameState!;
  const squad = db.getTeamPlayers(gameState.userTeamId);
  const currentFormation: FormationId = gameState.tactics.formation || '4-3-3';

  // ── XI REAL (el que juega el motor = los 11 primeros del array de plantilla) ──
  const formation = FORMATIONS[currentFormation] || FORMATIONS['4-3-3'];
  const buildXITable = (): { startingXI: StartingXIEntry[]; substitutes: Player[] } => {
    const slots = formation.positions;
    const startingXI: StartingXIEntry[] = [];
    const substitutes: Player[] = [];

    squad.forEach((p, i) => {
      if (i < slots.length) {
        startingXI.push({ player: p, slot: slots[i]! });
      } else {
        substitutes.push(p);
      }
    });

    return { startingXI, substitutes };
  };

  const { startingXI, substitutes } = buildXITable();
  const effectiveOvr = TacticsEngine.calculateEffectiveRating(startingXI, gameState.tactics);
  const displayStyle = cleanStyle(gameState.tactics.style || 'Tiki-Taka');

  // Estado RPG del DT
  const rpg = ManagerRPG.initIfMissing();
  const xpNeeded = ManagerRPG.getXpRequired(rpg.level);
  const xpPercent = Math.min(100, Math.round((rpg.xp / xpNeeded) * 100));
  const dtTitle = getDtTitle(rpg.level);

  let draggedPlayerId: string | null = null;

  container.innerHTML = `
    <div class="squad-layout">
      <!-- Cancha 2D interactiva con Drag and Drop -->
      <div class="pitch-container glass-panel">
        <div class="pitch-header">
          <h3>Formación Táctica: ${currentFormation} — suelta un jugador sobre una carta para moverlo a ese puesto exacto</h3>
          <span class="ovr-badge stat-ovr">Nivel Táctico: ${effectiveOvr}</span>
        </div>
        
        <div class="football-pitch" id="pitchArea">
          <div class="pitch-lines">
            <div class="center-circle"></div>
            <div class="penalty-box top"></div>
            <div class="penalty-box bottom"></div>
          </div>

          <!-- Jugadores en cancha con selector de Rol FC IQ (v2.0) y Rachas -->
          ${startingXI.map((item, idx) => {
            const playerPos = item.player.pos;
            const availableRoles = FC_IQ_ROLES[playerPos] || ['Estándar'];
            const currentRole = item.player.fcIqRole || availableRoles[0];

            const slotOvr = TacticsEngine.getSlotOvr(item.player, item.slot.role as Position);
            const outOfPosition = item.player.pos !== item.slot.role;
            const naturalOvr = item.player.overall;

            // Badge de liderazgo: Capitán (dorado) o Mentor (plateado)
            const role = item.player.personalityRole;
            const leaderBadge = role === 'captain'
              ? `<span title="Capitán del equipo — prioridad en la alineación titular" style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:var(--accent-gold);color:#000;font-size:0.56rem;font-weight:900;padding:1px 5px;border-radius:3px;letter-spacing:0.5px;white-space:nowrap;z-index:5;">CAPITÁN</span>`
              : role === 'mentor'
              ? `<span title="Mentor de la plantilla — prioridad en la alineación titular" style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#94a3b8;color:#000;font-size:0.56rem;font-weight:900;padding:1px 5px;border-radius:3px;letter-spacing:0.5px;white-space:nowrap;z-index:5;">MENTOR</span>`
              : '';

            const formBadge = PlayerFormEngine.getFormBadgeHTML(item.player);

            return `
              <div class="player-pitch-card" 
                   draggable="true" 
                   data-id="${item.player.id}" 
                   data-idx="${idx}"
                   style="left: ${item.slot.x}%; top: ${item.slot.y}%; position: absolute;">
                ${leaderBadge}
                <div class="player-number ${outOfPosition ? 'oop' : ''}"
                     title="${outOfPosition
                       ? `${item.player.name} (${item.player.pos}) · Media natural ${naturalOvr} · Como ${item.slot.role}: ${slotOvr}`
                       : `${item.player.name} (${item.player.pos}) · Media ${slotOvr}`}">
                  ${slotOvr}${outOfPosition ? ' <span class="oop-arrow">▼</span>' : ''}
                </div>
                <div class="player-name">${item.player.name.split(' ').pop()}</div>
                <div style="display: flex; justify-content: center; align-items: center; gap: 2px; margin-top: 1px;">
                  <div class="player-pos-badge" style="background:var(--accent-gold); color:#000;">${item.slot.role}</div>
                  ${formBadge}
                </div>
                
                <!-- Selector de Rol FC IQ -->
                <select class="fc-iq-role-select" 
                        data-player-id="${item.player.id}" 
                        onclick="event.stopPropagation();"
                        style="font-size:0.62rem; font-weight:800; background:rgba(15,23,42,0.9); color:var(--accent-cyan); border:1px solid var(--accent-cyan); border-radius:3px; margin-top:2px; cursor:pointer; max-width:85px;">
                  ${availableRoles.map(r => `
                    <option value="${r}" ${r === currentRole ? 'selected' : ''}>${r}</option>
                  `).join('')}
                </select>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Panel de Ajustes Tácticos, Árbol de Talentos y Banca de Suplentes -->
      <div class="tactics-panel glass-panel">
        <!-- BOTÓN DE AJUSTE AUTOMÁTICO DE MEJORES 11 -->
        <button id="btnAutoXI" class="btn-primary mb-3" style="width: 100%; font-size: 1rem; padding: 14px; background: var(--accent-gold); color: #000; font-weight: 800;">
          AUTO-ALINEACIÓN (MEJORES 11 TITULARES)
        </button>

        <h3>Estrategia y Sistema de Juego</h3>
        
        <div class="form-group mb-3">
          <label>Formación Táctica:</label>
          <select id="selectFormation" class="input-select">
            ${(Object.keys(FORMATIONS) as FormationId[]).map(fKey => `
              <option value="${fKey}" ${fKey === currentFormation ? 'selected' : ''}>${FORMATIONS[fKey].name}</option>
            `).join('')}
          </select>
        </div>

        <div class="form-group mb-3">
          <label>Estilo de Juego Real:</label>
          <select id="selectStyle" class="input-select">
            <option value="Tiki-Taka" ${displayStyle === 'Tiki-Taka' ? 'selected' : ''}>Tiki-Taka & Juego de Posición</option>
            <option value="Gegenpressing" ${displayStyle === 'Gegenpressing' ? 'selected' : ''}>Gegenpressing & Presión Alta</option>
            <option value="Catenaccio" ${displayStyle === 'Catenaccio' ? 'selected' : ''}>Catenaccio & Bloque Bajo</option>
            <option value="Juego por Bandas" ${displayStyle === 'Juego por Bandas' ? 'selected' : ''}>Juego por Bandas & Centros</option>
            <option value="Contraataque" ${displayStyle === 'Contraataque' ? 'selected' : ''}>Contraataque Directo & Balón Largo</option>
          </select>
        </div>

        <!-- ÁRBOL DE TALENTOS Y PROGRESIÓN DEL ENTRENADOR (RPG DT) -->
        <div class="glass-panel" style="background: linear-gradient(135deg, #0b1120 0%, #0f172a 100%); border: 1px solid var(--accent-gold); padding: 14px; border-radius: 10px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div>
              <h4 style="color: var(--accent-gold); font-size: 0.95rem; margin: 0; display: flex; align-items: center; gap: 6px;">
                Árbol de Talentos del DT
              </h4>
              <span style="font-size: 0.76rem; color: #94a3b8;">${dtTitle}</span>
            </div>
            <div style="text-align: right;">
              <span class="badge" style="background: var(--accent-gold); color: #000; font-weight: 900; font-size: 0.78rem;">
                Nivel ${rpg.level}
              </span>
              <div style="font-size: 0.72rem; color: var(--accent-cyan); font-weight: 800; margin-top: 2px;">
                ${rpg.talentPoints} ${rpg.talentPoints === 1 ? 'Punto disponible' : 'Puntos disponibles'}
              </div>
            </div>
          </div>

          <!-- Barra de EXP del DT -->
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: #94a3b8; margin-bottom: 3px;">
              <span>EXP de Carrera</span>
              <span><strong>${rpg.xp}</strong> / ${xpNeeded} EXP</span>
            </div>
            <div style="width: 100%; height: 7px; background: #1e293b; border-radius: 4px; overflow: hidden; border: 1px solid #334155;">
              <div style="width: ${xpPercent}%; height: 100%; background: linear-gradient(90deg, var(--accent-cyan), var(--accent-gold)); border-radius: 4px;"></div>
            </div>
          </div>

          <!-- Selector de Ramas de Habilidades -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 12px;" id="talentBranchTabs">
            <button type="button" class="btn-secondary btn-branch-tab active" data-branch="tactics" style="padding: 6px 2px; font-size: 0.72rem; font-weight: 800;">Pizarra</button>
            <button type="button" class="btn-secondary btn-branch-tab" data-branch="locker" style="padding: 6px 2px; font-size: 0.72rem; font-weight: 800;">Vestuario</button>
            <button type="button" class="btn-secondary btn-branch-tab" data-branch="scouting" style="padding: 6px 2px; font-size: 0.72rem; font-weight: 800;">Cantera</button>
            <button type="button" class="btn-secondary btn-branch-tab" data-branch="business" style="padding: 6px 2px; font-size: 0.72rem; font-weight: 800;">Finanzas</button>
          </div>

          <!-- Contenedor de Talentos por Rama -->
          <div id="talentCardsContainer">
            ${renderBranchTalents('tactics', rpg)}
          </div>
        </div>

        <!-- MÓDULO DE HABILIDADES TÁCTICAS ADICIONALES (EXP) -->
        <div style="background: #0f172a; border: 1px solid var(--border-color); padding: 10px; border-radius: 8px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.78rem; font-weight: 800; color: #cbd5e1;">Enfoques de Juego</span>
            <span style="font-size: 0.72rem; color: var(--accent-gold);">EXP Táctica: <strong>${(gameState.managerTactics?.exp || 400)} EXP</strong></span>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: #141d2e; padding: 6px 8px; border-radius: 6px;">
              <span style="font-size: 0.74rem;">Posesión: <strong>Nivel ${gameState.managerTactics?.skillLevels?.skill1 || 1}/10</strong></span>
              <button class="btn-primary btn-sm btn-upgrade-skill" data-skill="skill1" style="font-size:0.7rem; padding:2px 8px;">Subir (+1)</button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: #141d2e; padding: 6px 8px; border-radius: 6px;">
              <span style="font-size: 0.74rem;">Balón Parado: <strong>Nivel ${gameState.managerTactics?.skillLevels?.skill2 || 1}/10</strong></span>
              <button class="btn-primary btn-sm btn-upgrade-skill" data-skill="skill2" style="font-size:0.7rem; padding:2px 8px;">Subir (+1)</button>
            </div>
          </div>
        </div>

        <h3>Suplentes (Haz clic para Inspeccionar/Vender)</h3>
        <div class="table-responsive squad-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>POS</th>
                <th>Nombre</th>
                <th>OVR</th>
                <th>Edad</th>
              </tr>
            </thead>
            <tbody>
              ${substitutes.map(p => {
                const formBadge = PlayerFormEngine.getFormBadgeHTML(p);
                return `
                <tr class="draggable-sub-row" draggable="true" data-id="${p.id}" style="cursor: pointer;">
                  <td><span class="pos-tag pos-${p.pos}">${p.pos}</span></td>
                  <td><strong>${p.name}</strong> ${formBadge}</td>
                  <td><span class="stat-ovr">${p.overall}</span></td>
                  <td>${p.age}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // BOTÓN AUTO-ALINEACIÓN
  document.getElementById('btnAutoXI')!.addEventListener('click', () => {
    sfx.playClick();
    const { startingXI: bestXI, substitutes: bestSubs } = TacticsEngine.getBestStartingXI(squad, currentFormation);
    
    const newOrder = [
      ...bestXI.map(item => item.player),
      ...bestSubs
    ];

    squad.length = 0;
    squad.push(...newOrder);

    db.saveGame();
    renderTactics(container);
  });

  // Configurar listeners de desbloqueo de talentos RPG
  const setupTalentListeners = () => {
    document.querySelectorAll<HTMLElement>('.btn-unlock-talent').forEach(btn => {
      btn.addEventListener('click', (e) => {
        sfx.playClick();
        const talentId = (e.currentTarget as HTMLElement).dataset.talent;
        if (!talentId) return;
        const res = ManagerRPG.unlockTalent(talentId);
        if (res.success) {
          sfx.playLevelUp();
          alert(res.message);
          window.updateGlobalUI?.();
          renderTactics(container);
        } else {
          alert(res.reason);
        }
      });
    });
  };

  const branchTabs = document.querySelectorAll<HTMLElement>('.btn-branch-tab');
  const talentContainer = document.getElementById('talentCardsContainer');

  branchTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      sfx.playClick();
      branchTabs.forEach(t => t.classList.remove('active'));
      const target = e.currentTarget as HTMLElement;
      target.classList.add('active');
      const branchKey = target.dataset.branch as 'tactics' | 'locker' | 'scouting' | 'business';
      if (talentContainer) {
        talentContainer.innerHTML = renderBranchTalents(branchKey, ManagerRPG.initIfMissing());
        setupTalentListeners();
      }
    });
  });

  setupTalentListeners();

  // Configurar Drag and Drop API y Clics de Inspección
  const pitchCards = document.querySelectorAll<HTMLElement>('.player-pitch-card');
  const subRows = document.querySelectorAll<HTMLElement>('.draggable-sub-row');

  const handleDragStart = (e: Event) => {
    draggedPlayerId = (e.currentTarget as HTMLElement).dataset.id ?? null;
    (e as DragEvent).dataTransfer!.setData('text/plain', draggedPlayerId!);
    (e.currentTarget as HTMLElement).classList.add('dragging');
  };

  const handleDragEnd = (e: Event) => {
    (e.currentTarget as HTMLElement).classList.remove('dragging');
  };

  pitchCards.forEach(card => {
    card.addEventListener('click', () => {
      if (!card.classList.contains('dragging')) {
        const playerId = card.dataset.id;
        const player = squad.find(p => p.id === playerId);
        if (player) {
          sfx.playClick();
          openPlayerInspectorModal(player, () => renderTactics(container));
        }
      }
    });

    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const targetId = card.dataset.id;

      if (draggedPlayerId && targetId && draggedPlayerId !== targetId) {
        const p1 = squad.find(p => p.id === draggedPlayerId);
        const p2 = squad.find(p => p.id === targetId);

        if (p1 && p2) {
          const idx1 = squad.indexOf(p1);
          const idx2 = squad.indexOf(p2);
          squad[idx1] = p2;
          squad[idx2] = p1;

          sfx.playClick();
          db.saveGame();
          renderTactics(container);
        }
      }
    });
  });

  subRows.forEach(row => {
    row.addEventListener('click', () => {
      const playerId = row.dataset.id;
      const player = squad.find(p => p.id === playerId);
      if (player) {
        sfx.playClick();
        openPlayerInspectorModal(player, () => renderTactics(container));
      }
    });

    row.addEventListener('dragstart', handleDragStart);
    row.addEventListener('dragend', handleDragEnd);

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      row.style.background = 'rgba(0, 200, 133, 0.25)';
      row.style.outline = '1px solid var(--accent-green)';
    });

    row.addEventListener('dragleave', () => {
      row.style.background = '';
      row.style.outline = '';
    });

    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.style.background = '';
      row.style.outline = '';
      const targetId = row.dataset.id;

      if (draggedPlayerId && targetId && draggedPlayerId !== targetId) {
        const p1 = squad.find(p => p.id === draggedPlayerId);
        const p2 = squad.find(p => p.id === targetId);

        if (p1 && p2) {
          const idx1 = squad.indexOf(p1);
          const idx2 = squad.indexOf(p2);
          squad[idx1] = p2;
          squad[idx2] = p1;

          sfx.playClick();
          db.saveGame();
          renderTactics(container);
        }
      }
    });
  });

  document.querySelectorAll('.btn-upgrade-skill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      sfx.playClick();
      const skillKey = (e.currentTarget as HTMLElement).dataset.skill as keyof SkillLevels;
      const res = TacticsEngine.upgradeManagerSkill(skillKey);
      if (res.success) {
        sfx.playGoal();
        alert(res.message);
        renderTactics(container);
      } else {
        alert(res.reason);
      }
    });
  });

  // Handlers para cambios de rol FC IQ
  document.querySelectorAll('.fc-iq-role-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      e.stopPropagation();
      const target = e.target as HTMLSelectElement;
      const playerId = target.dataset.playerId;
      const roleVal = target.value as FCIQRole;
      const player = squad.find(p => p.id === playerId);
      if (player) {
        player.fcIqRole = roleVal;
        db.saveGame();
        sfx.playClick();
        renderTactics(container);
      }
    });
  });

  // Handlers para cambios de formación y tácticas
  document.getElementById('selectFormation')!.addEventListener('change', (e) => {
    sfx.playClick();
    gameState.tactics.formation = (e.target as HTMLSelectElement).value as FormationId;
    db.saveGame();
    renderTactics(container);
  });

  document.getElementById('selectStyle')!.addEventListener('change', (e) => {
    gameState.tactics.style = (e.target as HTMLSelectElement).value as PlayStyle;
    db.saveGame();
  });
}
