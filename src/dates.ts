// ============================================================
// dates.ts — GENERADOR DE FECHAS DE ENTRENAMIENTO
// ============================================================
// ¿Para que sirve? La app vieja no dejaba elegir cualquier dia:
// si un equipo entrena martes/jueves, solo muestra esos dias
// entre el 2026-09-01 y el 2027-07-31 (la temporada).
// Este archivo es COPIA exacta de DataContext.tsx:104-118.
// Si vienes de Java: es como una clase con un metodo estatico.

// Importamos solo el TIPO TrainingDays (no trae codigo, solo el contrato).
// "import type" = "solo quiero el nombre para comprobar tipos, no codigo".
import type { TrainingDays } from './types.js';

// ------------------------------------------------------------
// Constantes de temporada (IGUAL que en la app vieja)
// ------------------------------------------------------------
// Formato "AAAA-MM-DD". Cambialas aqui y toda la app cambia.
export const SEASON_START = '2026-09-01'; // Primer dia que miramos
export const SEASON_END = '2027-07-31';   // Ultimo dia que miramos

// ------------------------------------------------------------
// DAY_NAMES: traduccion de nuestros grupos a dias ingleses
// ------------------------------------------------------------
// ¿Por que en ingles? Porque JavaScript dice los dias en ingles
// cuando le pides toLocaleDateString('en-US', {weekday:'long'}).
// Martes = Tuesday, Jueves = Thursday, etc.
// Record<> es como un Dictionary<string, string[]> en C#:
// clave = TrainingDays, valor = lista de dias ingleses.
export const DAY_NAMES: Record<TrainingDays, string[]> = {
  martes_jueves: ['Tuesday', 'Thursday'],   // Martes y Jueves
  lunes_miercoles: ['Monday', 'Wednesday'], // Lunes y Miercoles
};

// ------------------------------------------------------------
// getTrainingDatesForTeam(trainingDays)
// ------------------------------------------------------------
// Entrada: 'martes_jueves' o 'lunes_miercoles'
// Salida: ["2026-09-01", "2026-09-03", ...] solo esos dias.
// ¿Como funciona? Como un for en Java:
// 1. Empieza en SEASON_START.
// 2. Dia a dia pregunta "¿que dia de la semana eres?".
// 3. Si esta en la lista DAY_NAMES, lo guarda.
// 4. Suma un dia y repite hasta SEASON_END.
export function getTrainingDatesForTeam(trainingDays: TrainingDays): string[] {
  // Convertimos el texto "2026-09-01" en objeto Date de verdad.
  // new Date("2026-09-01") = ese dia a las 00:00.
  const start = new Date(SEASON_START);
  const end = new Date(SEASON_END);

  // Buscamos que dias ingleses nos tocan, ej: ['Tuesday','Thursday'].
  const dayNames = DAY_NAMES[trainingDays];

  // Aqui iremos guardando las fechas que SI son entrenamiento.
  const dates: string[] = [];

  // "current" es el cursor que avanza dia a dia. Lo clonamos desde start.
  // OJO: new Date(start) crea una COPIA, si hicieramos "current = start"
  // moveriamos tambien start (en JS los Date son objetos por referencia, como en Java).
  const current = new Date(start);

  // Mientras no pasemos el fin de temporada...
  while (current <= end) {
    // Preguntamos: "¿que dia de la semana eres?" en ingles.
    // Ej: un martes devuelve "Tuesday".
    const dayName = current.toLocaleDateString('en-US', { weekday: 'long' });

    // Si ese dia esta en nuestra lista, lo guardamos.
    if (dayNames.includes(dayName)) {
      // toISOString() da "2026-09-01T00:00:00.000Z", partimos por la T
      // y nos quedamos con "2026-09-01".
      dates.push(current.toISOString().split('T')[0] as string);
    }

    // Avanzamos UN dia. setDate(getDate()+1) = "mañana".
    current.setDate(current.getDate() + 1);
  }

  // Devolvemos la lista completa, ej: 90 fechas.
  return dates;
}
