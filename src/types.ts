// ============================================================
// types.ts — EL DICCIONARIO DE DATOS
// ============================================================
// ¿Que es esto? En Java/C# harias "class Team { String id; ... }".
// En TypeScript usamos "interface": solo describe la FORMA del objeto,
// no crea codigo. Es como un contrato: "todo Team TIENE que tener esto".
// El navegador nunca ve este archivo: "tsc" lo borra al compilar a JS.
// Es solo para que el editor te avise de errores ANTES de ejecutar.

// ------------------------------------------------------------
// TrainingDays: ¿que dias entrena cada equipo?
// ------------------------------------------------------------
// Esto se llama "union type". Es como un enum de Java/C# pero mas simple.
// Solo permite EXACTAMENTE estos dos textos. Si escribes otro, error.
// Ejemplo: let d: TrainingDays = "martes_jueves"; // OK
//          let d: TrainingDays = "viernes";       // ERROR en rojo
export type TrainingDays = 'martes_jueves' | 'lunes_miercoles';

// ------------------------------------------------------------
// AttendanceStatus: LOS 4 ESTADOS que pediste
// ------------------------------------------------------------
// Antes tenias solo checkbox (presente/ausente). Ahora copiamos a la app vieja:
// - asistido: vino
// - falta_justificada: aviso (cuenta como "no falta grave")
// - falta_injustificada: no vino ni aviso (es la que baja el %)
// - retraso: vino tarde
export type AttendanceStatus = 'asistido' | 'falta_justificada' | 'falta_injustificada' | 'retraso';

// ------------------------------------------------------------
// Team: un equipo (ej: "Benjamines")
// ------------------------------------------------------------
// Equivale en Java a: class Team { String id; String name; TrainingDays trainingDays; }
export interface Team {
  id: string;               // Identificador unico, lo generamos con generateId()
  name: string;             // Nombre que escribe el usuario
  trainingDays: TrainingDays; // Que dias entrena (de arriba)
}

// ------------------------------------------------------------
// Player: un jugador, SIEMPRE pertenece a un equipo
// ------------------------------------------------------------
// En base de datos seria una tabla con "foreign key" teamId -> Team.id
export interface Player {
  id: string;     // Id unico del jugador
  teamId: string; // A que equipo pertenece (relacion padre/hijo)
  name: string;   // Nombre del jugador
}

// ------------------------------------------------------------
// Attendance: UNA marca de asistencia (un jugador + un dia + un estado)
// ------------------------------------------------------------
// Ejemplo: { playerId: "abc", date: "2026-09-08", status: "asistido" }
// Regla: solo puede haber UNA por jugador y fecha (la reescribimos si existe).
export interface Attendance {
  id: string;                  // Id unico de la marca
  playerId: string;            // A que jugador pertenece
  date: string;                // Fecha en formato "AAAA-MM-DD" (ej: "2026-09-08")
  status: AttendanceStatus;    // Uno de los 4 estados de arriba
}

// ------------------------------------------------------------
// DataState: TODA la app en un solo objeto
// ------------------------------------------------------------
// En Java seria como tener 3 ArrayList dentro de una clase AppState.
// Lo guardamos entero en localStorage como texto JSON.
export interface DataState {
  teams: Team[];             // Todos los equipos
  players: Player[];         // Todos los jugadores de todos los equipos
  attendances: Attendance[]; // Todas las marcas de asistencia
}
