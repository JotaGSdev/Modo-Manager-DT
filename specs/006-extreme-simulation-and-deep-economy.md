# 📋 SPEC 006: Simulación Extrema, Economía Profunda y Revista de Ojeo

- **Estado:** Aprobado / MVP
- **Responsables:** `transfers-economy` & `squad-academy` & `gameplay-engine`
- **Módulos Afectados:** `js/types.ts`, `js/engine/matchEngine.ts`, `js/engine/transfers.ts`, `js/ui/financesUI.ts`, `js/ui/scoutingUI.ts`

---

## 1. Visión y Objetivos

Superar la profundidad de los simuladores convencionales ofreciendo una experiencia inmersiva que combina la inmediatez arcade-táctica de **PES 6 / FIFA 08** con una simulación económica y de club extrema:
1. **Flujo de Caja Realista (Cash Flow Operativo Semanal)**:
   - **Ingresos**: Taquilla progresiva ($Aforo \times Precio \times InterésRival$), Derechos de TV y Merchandising/Venta de Camisetas impulsado por el *Impacto Mediático* de estrellas y canteranos revelación.
   - **Egresos**: Nómina de futbolistas, cuerpo técnico y preparadores físicos (que reducen lesiones y aceleran la recuperación) y mantenimiento de red de ojeadores.
2. **Sistema de Ojeo / Gacha de Inversión (Sobres de 1M€)**:
   - Posibilidad de contratar misiones de ojeo de alto calibre (ej. €1.000.000) con probabilidades matemáticas estrictas de descubrir promesas dentro de los parámetros reglamentarios de la división.
3. **Revista de Ojeo ("Ojeador del Barro / Scouting Magazine")**:
   - Sección narrativa periódica en The Feed destacando joyas ocultas en las categorías inferiores antes de que los grandes clubes las descubran.

---

## 2. Modelo Económico y Fórmulas Operativas

### 2.1 Balance Semanal del Club

$$\text{Balance Semanal} = (\text{Taquilla} + \text{TV} + \text{Merchandising}) - (\text{Sueldos Jugadores} + \text{Preparadores Físicos} + \text{Coste Scouting} + \text{Mantenimiento})$$

### 2.2 Venta de Camisetas por Impacto Mediático (Efecto Estrella / Canterano)

$$\text{Ingreso Semanal por Camisetas} = \text{Base Club} + \sum_{p \in \text{Plantel}} \left(\text{Popularidad}_p \times \text{Factor Estrella}_p \times 1.250€\right)$$

- **Jugadores en Racha o Wonderkids** (Sub-21 con 88+ POT como Lamine Yamal): Multiplicador $\times 2.8$ en venta de camisetas.
- **Canteranos del Barro Promovidos**: Generan apego popular y duplican la afluencia al estadio local en sus primeros 5 partidos.

### 2.3 Paquetes de Ojeo (Gacha de Inversión)

| Paquete | Coste Club | Probabilidades | Garantía (Pity) |
| :--- | :---: | :--- | :--- |
| **Ojeo Regional (Barro)** | €35.000 | 70% Común (OVR 58-64), 25% Rara (OVR 65-70), 5% Épica (POT 75+) | Cada 5 tiradas: 1 Rara garantizada |
| **Misión Élite (€1.000.000)** | €1.000.000 | 45% Rara, 40% Épica (POT 78-84), 15% Joya Mundial (POT 85-90) | Cada 10 tiradas: 1 Joya Mundial garantizada |

*Restricción de División*: Si el club milita en Tier 5, una Joya Mundial descubierta no puede ser contratada de inmediato si exige ficha de élite, pero queda reservada en la Academia Juvenil del club con prioridad exclusiva.

---

## 3. Matriz de Preparadores Físicos y Personal de Apoyo

1. **Nivel 1 (Preparador Básico)**: Costo €3.000/semana. Recuperación de estamina base tras cada encuentro.
2. **Nivel 2 (Fisioterapeuta Deportivo)**: Costo €12.000/semana. $-15\%$ probabilidad de lesiones musculares en simulación.
3. **Nivel 3 (Centro Médico de Alto Rendimiento)**: Costo €35.000/semana. $-35\%$ probabilidad de lesiones y tiempo de baja reducido a la mitad.
