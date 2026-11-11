# 📋 SPEC 002: Restricciones de Fichajes por Categoría y Techos OVR/POT

- **Estado:** Aprobado / MVP
- **Responsables:** `transfers-economy`
- **Módulos Afectados:** `js/engine/transfers.ts`, `js/ui/transfersUI.ts`

---

## 1. Objetivo y Visión

Evitar situaciones irreales donde un equipo de 5ª división pueda fichar jugadores de primera categoría o joyas mundiales con 90 de potencial. Se establece una barrera realista de reputación y prestigio.

## 2. Regla de Techo Deportivo

$$\text{OVR Máximo Fichable} = 55 + (6 - \text{Tier}) \times 7$$
$$\text{POT Máximo Fichable} = 65 + (6 - \text{Tier}) \times 6$$

| División (Tier) | Reputación Promedio Club | OVR Máximo Fichable | POT Máximo Fichable |
| :---: | :---: | :---: | :---: |
| **Tier 5 (Barro)** | 45 - 58 | **66** | **74** |
| **Tier 4** | 55 - 66 | **70** | **78** |
| **Tier 3** | 64 - 74 | **74** | **82** |
| **Tier 2** | 72 - 80 | **78** | **86** |
| **Tier 1 (Élite)** | 80 - 99 | **94** | **95** |

## 3. Comportamiento en Negociación

1. **Rechazo Instantáneo por Desprestigio**:
   - Si un club de Tier 5 intenta ofertar por un jugador con $OVR > 66$ o $POT > 74$, el representante responderá:
     > *"El jugador no está dispuesto a competir en categorías regionales en este momento de su carrera."*
2. **Excepción de la Cantera (Youth Academy)**:
   - La restricción aplica únicamente al mercado de transferencias externas. Si la Academia Juvenil propia descubre un canterano de $POT = 88$, el club puede inscribirlo y retenerlo en el primer equipo.
3. **Escalamiento por Ascenso**:
   - Al ascender a la categoría superior, el techo deportivo se actualiza de inmediato para la siguiente ventana de transferencias.

## 4. Casos de Prueba

- [ ] Intentar ofertar por un jugador de 78 OVR desde un club de Tier 5 arroja `{ success: false, reason: "..." }`.
- [ ] Jugadores de agentes libres con OVR alto rechazan la propuesta contractual por bajo prestigio del club.
- [ ] Los filtros del panel de transferencias muestran por defecto futbolistas compatibles con el tier del club actual.
