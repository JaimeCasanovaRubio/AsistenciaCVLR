// ============================================================
// store.ts — EL ALMACEN (copia simple del DataContext de React)
// ============================================================
// En la app vieja esto era DataContext.tsx con useReducer + AsyncStorage.
// Aqui es lo MISMO pero sin React:
// - DataState vive en memoria (variable "state").
// - Cada cambio se guarda en localStorage (el AsyncStorage del navegador).
// - dataReducer() es un switch como en Java: recibe (estado, accion) y devuelve NUEVO estado.
// Si entiendes este archivo, entiendes el 80% de la app vieja.
// ------------------------------------------------------------
// 1. CLAVE Y ESTADO INICIAL
// ------------------------------------------------------------
// STORAGE_KEY es el "nombre del cajón" dentro de localStorage.
// localStorage solo guarda TEXTO, asi que convertimos el objeto a JSON.
const STORAGE_KEY = '@asistencia_data';
// Estado vacio al arrancar si no hay nada guardado.
// En Java seria: new AppState(emptyList, emptyList, emptyList).
function emptyState() {
    return { teams: [], players: [], attendances: [] };
}
// Nuestra "memoria viva". La cargamos una vez al arrancar con load().
let state = emptyState();
// ------------------------------------------------------------
// 2. GENERADOR DE IDS
// ------------------------------------------------------------
// La app vieja usaba Math.random().toString(36). Hacemos lo mismo.
// Ej: "a3k9x2pz". No es perfecto como UUID pero vale para local.
// En C# seria Guid.NewGuid().ToString(), aqui version casera.
export function generateId() {
    return Math.random().toString(36).substring(2, 10);
}
// ------------------------------------------------------------
// 4. REDUCER: el cerebro (copia de dataReducer de la app vieja)
// ------------------------------------------------------------
// ¿Por que "...state"? Se llama "spread": crea una COPIA del objeto.
// En React/JS no se modifica el estado a mano (state.teams.push),
// se devuelve un objeto NUEVO. Asi detecta cambios facil.
// Piensa en ello como en Java: en vez de mutar la lista, devuelves una nueva.
function dataReducer(prev, action) {
    // switch(action.type) como en Java: segun el tipo, una rama.
    switch (action.type) {
        case 'ADD_TEAM':
            // Devolvemos TODO lo anterior (...prev) pero con teams + 1 mas.
            return { ...prev, teams: [...prev.teams, action.payload] };
        case 'DELETE_TEAM': {
            // Borrar equipo = borrar equipo + sus jugadores + sus asistencias (cascada).
            // 1. Filtramos equipos: nos quedamos con los que NO son el borrado.
            const teams = prev.teams.filter((t) => t.id !== action.payload);
            // 2. Jugadores que NO sean de ese equipo.
            const players = prev.players.filter((p) => p.teamId !== action.payload);
            // 3. Asistencias cuyos jugadores sigan existiendo (buscamos al jugador de cada marca).
            const attendances = prev.attendances.filter((a) => {
                const owner = prev.players.find((p) => p.id === a.playerId);
                return owner?.teamId !== action.payload;
            });
            return { teams, players, attendances };
        }
        case 'ADD_PLAYER':
            return { ...prev, players: [...prev.players, action.payload] };
        case 'DELETE_PLAYER':
            // Borrar jugador = borrar jugador + todas sus marcas.
            return {
                ...prev,
                players: prev.players.filter((p) => p.id !== action.payload),
                attendances: prev.attendances.filter((a) => a.playerId !== action.payload),
            };
        case 'ADD_ATTENDANCE': {
            // REGLA CLAVE: solo UNA marca por jugador+fecha.
            // Buscamos si ya existe una marca para ese jugador en esa fecha.
            const idx = prev.attendances.findIndex((a) => a.playerId === action.payload.playerId && a.date === action.payload.date);
            // Si existe (>=0), la REEMPLAZAMOS (copiamos lista y cambiamos esa posicion).
            if (idx >= 0) {
                const copy = [...prev.attendances];
                copy[idx] = action.payload;
                return { ...prev, attendances: copy };
            }
            // Si no existe, la añadimos al final.
            return { ...prev, attendances: [...prev.attendances, action.payload] };
        }
        case 'DELETE_ATTENDANCE':
            return {
                ...prev,
                attendances: prev.attendances.filter((a) => a.id !== action.payload),
            };
        case 'LOAD_DATA':
            // Sustituir todo el estado por lo que venia guardado.
            return action.payload;
        default:
            // Si llega una accion desconocida, no tocamos nada.
            return prev;
    }
}
// ------------------------------------------------------------
// 5. GUARDAR Y CARGAR (localStorage = AsyncStorage del navegador)
// ------------------------------------------------------------
// save(): convierte state a texto JSON y lo guarda bajo STORAGE_KEY.
// Se llama despues de CADA cambio (ver dispatch abajo).
function save() {
    // JSON.stringify({a:1}) -> '{"a":1}' (objeto a texto).
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
// load(): al arrancar, lee el texto y lo convierte de vuelta a objeto.
// Si no hay nada o esta corrupto, nos quedamos con estado vacio.
export function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            // JSON.parse('{"teams":[]}') -> objeto de verdad.
            // "as DataState" = le decimos a TS "confia, esto tiene forma DataState".
            const parsed = JSON.parse(raw);
            // Pequeña defensa: si el JSON no trae las 3 listas, lo ignoramos.
            if (parsed.teams && parsed.players && parsed.attendances) {
                state = parsed;
            }
        }
    }
    catch {
        // Si el JSON esta roto, empezamos de cero (no romper la app).
        state = emptyState();
    }
}
// dispatch(): la UNICA forma de cambiar el estado.
// 1. Pasa (state, action) por el reducer -> nuevo estado.
// 2. Lo guarda en la variable + en localStorage.
function dispatch(action) {
    state = dataReducer(state, action);
    save();
}
// ------------------------------------------------------------
// 6. FUNCIONES PUBLICAS (las que usa app.ts, igual que useData())
// ------------------------------------------------------------
// Cada una crea la accion adecuada y la manda a dispatch.
// Omit<Team,'id'> significa "un Team SIN el campo id" (lo generamos aqui).
// En C# seria un DTO sin Id.
export function getState() {
    return state; // Devuelve la foto actual (lectura)
}
export function addTeam(team) {
    const full = { ...team, id: generateId() };
    dispatch({ type: 'ADD_TEAM', payload: full });
    return full;
}
export function deleteTeam(id) {
    dispatch({ type: 'DELETE_TEAM', payload: id });
}
export function addPlayer(player) {
    const full = { ...player, id: generateId() };
    dispatch({ type: 'ADD_PLAYER', payload: full });
    return full;
}
export function deletePlayer(id) {
    dispatch({ type: 'DELETE_PLAYER', payload: id });
}
// Marca asistencia (crea o reemplaza si ya existia ese dia).
export function setAttendance(playerId, date, status) {
    // Buscamos si ya habia marca para reusar su id (asi ADD_ATTENDANCE la reemplaza).
    const existing = state.attendances.find((a) => a.playerId === playerId && a.date === date);
    if (existing) {
        dispatch({ type: 'ADD_ATTENDANCE', payload: { ...existing, status } });
    }
    else {
        dispatch({
            type: 'ADD_ATTENDANCE',
            payload: { id: generateId(), playerId, date, status },
        });
    }
}
// ------------------------------------------------------------
// 7. CONSULTAS (getters, no modifican nada)
// ------------------------------------------------------------
// Todos los jugadores de un equipo.
export function getPlayersByTeam(teamId) {
    return state.players.filter((p) => p.teamId === teamId);
}
// ¿Que marco este jugador este dia? (o undefined si no marco nada).
export function getAttendanceForPlayerOnDate(playerId, date) {
    return state.attendances.find((a) => a.playerId === playerId && a.date === date);
}
function attendanceScore(status) {
    if (status === 'asistido')
        return 1;
    if (status === 'retraso')
        return 0.9;
    return 0;
}
export function getPlayerAttendancePercent(playerId) {
    const valid = state.attendances.filter((a) => a.playerId === playerId && a.status !== 'falta_justificada');
    if (valid.length === 0)
        return 0;
    const score = valid.reduce((sum, a) => sum + attendanceScore(a.status), 0);
    return Math.round((score / valid.length) * 100);
}
export function getTeamAttendancePercent(teamId) {
    const players = state.players.filter((p) => p.teamId === teamId);
    if (players.length === 0)
        return 0;
    let total = 0;
    let score = 0;
    for (const p of players) {
        const valid = state.attendances.filter((a) => a.playerId === p.id && a.status !== 'falta_justificada');
        total += valid.length;
        score += valid.reduce((sum, a) => sum + attendanceScore(a.status), 0);
    }
    if (total === 0)
        return 0;
    return Math.round((score / total) * 100);
}
