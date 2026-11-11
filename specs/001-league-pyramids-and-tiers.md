# 📋 SPEC 001: Pirámides de Ligas y Divisiones Inferiores (Los 5 Pilares)

- **Estado:** Aprobado / MVP
- **Responsables:** `Tech Lead` & `transfers-economy`
- **Módulos Afectados:** `assets/data/leagues.json`, `js/types.ts`, `js/ui/newCareerUI.ts`

---

## 1. Objetivo y Visión

Permitir que el jugador experimente un verdadero "Road to Glory" al iniciar su carrera como DT novato (35 años) exclusivamente en la **división más baja** de una de las 5 grandes ligas europeas (Inglaterra, España, Italia, Alemania y Francia), ascendiendo mediante mérito deportivo.

## 2. Definición de Tiers por País

```
🏴󠁧󠁢󠁥󠁮󠁧󠁿 INGLATERRA
- Tier 1: Premier League (20 equipos)
- Tier 2: EFL Championship (24 equipos)
- Tier 3: EFL League One (24 equipos)
- Tier 4: EFL League Two (24 equipos)
- Tier 5: National League (24 equipos - División de Barro - INICIO OBLIGATORIO)

🇪🇸 ESPAÑA
- Tier 1: LaLiga EA Sports (20 equipos)
- Tier 2: LALIGA Hypermotion (22 equipos)
- Tier 3: Primera Federación (RFEF)
- Tier 4: Segunda Federación (RFEF)
- Tier 5: Tercera Federación (RFEF - División de Barro - INICIO OBLIGATORIO)

🇮🇹 ITALIA
- Tier 1: Serie A (20 equipos)
- Tier 2: Serie B (20 equipos)
- Tier 3: Serie C (Girone A/B/C - División de Barro - INICIO OBLIGATORIO)

🇩🇪 ALEMANIA
- Tier 1: Bundesliga (18 equipos)
- Tier 2: 2. Bundesliga (18 equipos)
- Tier 3: 3. Liga (División de Barro - INICIO OBLIGATORIO)

🇫🇷 FRANCIA
- Tier 1: Ligue 1 (18 equipos)
- Tier 2: Ligue 2 (18 equipos)
- Tier 3: Championnat National (División de Barro - INICIO OBLIGATORIO)
```

## 3. Contratos de Datos (`js/types.ts`)

```typescript
export type EuropeanPillarCountry = 'Inglaterra' | 'España' | 'Italia' | 'Alemania' | 'Francia';

export interface LeagueTierMetadata {
  tier: number;            // 1 (Élite) a 5 (Barro)
  maxSignableOvr: number;   // Límite de OVR para fichar del mercado exterior
  maxSignablePot: number;   // Límite de POT para fichar del mercado exterior
  weeklyWageCap: number;    // Techo salarial representativo
  promotionSpots: number;   // Plazas de ascenso directo
  playoffSpots: number;     // Plazas de promoción / playoffs
  relegationSpots: number;  // Plazas de descenso directo
}
```

## 4. Invariantes de Inicio de Carrera (`newCareerUI.ts`)

1. Al seleccionar país de origen entre los 5 pilares, el sistema filtrará únicamente las ofertas de clubes correspondientes a la **división inferior disponible** (`tier === 5` o `tier === 3` según el país).
2. Los clubes de 1ª y 2ª división no están disponibles como opciones iniciales.
3. El DT recibe 3 ofertas de clubes con baja reputación (Reputación 45-62) para elegir su destino.

## 5. Casos de Prueba (Criterios de Aceptación)

- [ ] Un nuevo DT novato en Inglaterra solo recibe ofertas de la *National League* (Tier 5).
- [ ] La tabla de posiciones simula jornadas para todos los tiers y aplica ascensos/descensos al cerrar la temporada.
- [ ] Ningún club de Tier 5 cuenta con un presupuesto inicial superior a €1.2M ni salarios individuales superiores a €3.000/semana.
