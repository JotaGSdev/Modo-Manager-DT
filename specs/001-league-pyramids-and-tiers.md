# 📋 SPEC 001: Pirámides de Ligas y Divisiones Inferiores (Los 5 Pilares)

- **Estado:** Aprobado / MVP
- **Responsables:** `Tech Lead` & `transfers-economy`
- **Módulos Afectados:** `assets/data/leagues.json`, `js/types.ts`, `js/ui/newCareerUI.ts`

---

## 1. Objetivo y Visión

Permitir que el jugador experimente un verdadero "Road to Glory" al iniciar su carrera como DT novato (35 años) exclusivamente en la **división más baja** de una de las 5 grandes ligas europeas (Inglaterra, España, Italia, Alemania y Francia), ascendiendo mediante mérito deportivo.

## 2. Definición de Tiers por País

```
[INGLATERRA]
- Tier 1: Premier League (20 equipos)
- Tier 2: EFL Championship (24 equipos)
- Tier 5: National League (24 equipos - 5ª División - INICIO OBLIGATORIO)

[ESPAÑA]
- Tier 1: LaLiga EA Sports (20 equipos)
- Tier 2: LALIGA Hypermotion (22 equipos)
- Tier 5: Tercera Federación RFEF (8 equipos - 5ª División - INICIO OBLIGATORIO)

[ITALIA]
- Tier 1: Serie A (20 equipos)
- Tier 2: Serie B (20 equipos)
- Tier 5: Eccellenza (10 equipos - 5ª División - INICIO OBLIGATORIO)

[ALEMANIA]
- Tier 1: Bundesliga (18 equipos)
- Tier 2: 2. Bundesliga (18 equipos)
- Tier 5: Oberliga (10 equipos - 5ª División - INICIO OBLIGATORIO)

[FRANCIA]
- Tier 1: Ligue 1 (18 equipos)
- Tier 2: Ligue 2 (18 equipos)
- Tier 5: National 3 (10 equipos - 5ª División - INICIO OBLIGATORIO)
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

1. Al seleccionar la liga a dirigir entre los 5 pilares europeos, el sistema asignará exclusivamente clubes correspondientes a la **5ª división base** (`tier === 5`).
2. Los clubes de 1ª y 2ª división no están disponibles como opciones de inicio.
3. El DT recibe un club asignado de 5ª división con opción de re-sorteo aleatorio libre.

## 5. Casos de Prueba (Criterios de Aceptación)

- [ ] Un nuevo DT novato en Inglaterra solo recibe ofertas de la *National League* (Tier 5).
- [ ] La tabla de posiciones simula jornadas para todos los tiers y aplica ascensos/descensos al cerrar la temporada.
- [ ] Ningún club de Tier 5 cuenta con un presupuesto inicial superior a €1.2M ni salarios individuales superiores a €3.000/semana.
