# 📋 SPEC 003: Red de Ojeo Dinámica y Ventajas Gacha (Scouting Perks)

- **Estado:** Aprobado / MVP
- **Responsables:** `transfers-economy` & `pixel-ui-designer`
- **Módulos Afectados:** `js/types.ts`, `js/engine/transfers.ts`, `js/ui/scoutingUI.ts`

---

## 1. Objetivo y Visión

Implementar un sistema de invocaciones/sobres contextualizado como **"Carpetas de Inteligencia de Ojeadores"**, adquirido exclusivamente con el presupuesto del club (`team.budget`). En lugar de entregar cromos aleatorios inconexos, otorga **cartas de ventaja táctica y administrativa** escaladas por el prestigio de la institución.

## 2. Tipos de Ventajas Obtenibles

| ID de Ventaja | Nombre | Efecto | Duración / Uso |
| :--- | :--- | :--- | :--- |
| `AGENT_DIRECT_LINE` | **Línea Directa con Agente** | Omite rondas de espera; negociación de contrato resuelta en 1 turno. | 1 fichaje |
| `TRANSFER_DISCOUNT_15` | **Descuento de Traspaso (15%)** | Reduce la tarifa de traspaso exigida por el club vendedor en un 15%. | 1 fichaje |
| `TRANSFER_DISCOUNT_25` | **Descuento de Traspaso Élite (25%)** | Reduce la tarifa exigida en un 25% (solo disponible para Tiers 1-3). | 1 fichaje |
| `RELEASE_CLAUSE_BYPASS` | **Omisión de Cláusula de Rescisión** | Permite negociar un precio de mercado regular ignorando la cláusula fija. | 1 fichaje |
| `SCOUT_WONDERKID_REVEAL` | **Radar de Joyas Ocultas** | Revela un agente libre o juvenil con potencial $\ge 82$ en la región. | Inmediato |
| `FAST_TRACK_ACADEMY` | **Beca de Alto Rendimiento** | Concede $+3$ OVR directo a un canterano de la academia menor de 18 años. | 1 juvenil |

## 3. Niveles de Paquetes de Ojeo

| Paquete | Costo | Tiers Habilitados | Garantía (Pity) |
| :--- | :---: | :---: | :--- |
| **Ojeo Regional (Barro)** | €35.000 | Tiers 3, 4 y 5 | 1 ventaja común/rara garantizada cada 3 tiradas. |
| **Red Continental** | €180.000 | Tiers 2 y 1 | 1 ventaja épica garantizada cada 10 tiradas. |
| **Cartera Global Élite** | €750.000 | Exclusivo Tier 1 | 1 ventaja legendaria garantizada cada 20 tiradas. |

## 4. Invariante Ético y Económico
- Todo el sistema se nutre del presupuesto virtual del club. No existen microtransacciones con dinero real.
- Las cartas duplicadas se liquidan automáticamente reintegrando el 70% de su valor al presupuesto de fichajes.
