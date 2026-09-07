// ============================================================
// app.ts — LA PANTALLA (lo que el usuario ve y toca)
// ============================================================
// ¿Que hace? Pinta HTML con JavaScript y reacciona a clics.
// En la app vieja esto eran 5 archivos .tsx con React.
// Aqui es 1 solo archivo con 3 "pantallas" que cambiamos con el # de la URL:
//   #/                  -> lista de equipos
//   #/team?id=ABC       -> detalle de un equipo (sus jugadores + pasar lista del dia)
//   #/player?team=ABC&player=XYZ -> historial de un jugador (todas las fechas, toca para ciclar estado)
// Esto se llama "hash router casero": al cambiar location.hash, repintamos.
// Si vienes de Java/C#: es como tener 3 Forms y un controlador que muestra uno.

// ------------------------------------------------------------
// 1. IMPORTS: traemos las herramientas de los otros archivos
// ------------------------------------------------------------
// Fijate en ".js" al final: en el navegador importamos el JS compilado,
// aunque escribamos en .ts. TypeScript lo entiende.
import { load, getState, addTeam, deleteTeam, addPlayer, deletePlayer, setAttendance, getAttendanceForPlayerOnDate, getPlayerAttendancePercent, getTeamAttendancePercent } from './store.js';
import { getTrainingDatesForTeam } from './dates.js';
import type { AttendanceStatus } from './types.js';

// ------------------------------------------------------------
// 2. LOS 4 ESTADOS (igual que STATUS_OPTIONS en la app vieja)
// ------------------------------------------------------------
// Cada estado tiene: valor interno, etiqueta bonita y color.
// El ORDEN importa: al tocar una fecha, saltamos al siguiente (ciclo).
const STATUS_LIST: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'asistido', label: '✓ Asistido', color: '#4CAF50' },          // Verde
  { value: 'falta_justificada', label: '⚠ Justificada', color: '#FF9800' }, // Naranja
  { value: 'falta_injustificada', label: '✗ Injustif.', color: '#F44336' }, // Rojo
  { value: 'retraso', label: '⏱ Retraso', color: '#9C7B00' },            // Amarillo oscuro
];

// Dado un estado (o nada), devuelve el SIGUIENTE de la lista.
// Ej: asistido -> falta_justificada -> ... -> retraso -> asistido...
// Si no habia nada (undefined), devuelve el primero (asistido).
function nextStatus(current: AttendanceStatus | undefined): AttendanceStatus {
  const idx = STATUS_LIST.findIndex((s) => s.value === current);
  const next = (idx + 1) % STATUS_LIST.length;
  return (STATUS_LIST[next] as { value: AttendanceStatus }).value;
}

// Busca etiqueta y color de un estado para pintarlo bonito.
function statusInfo(status: AttendanceStatus | undefined): { label: string; color: string } {
  const found = STATUS_LIST.find((s) => s.value === status);
  if (found) return { label: found.label, color: found.color };
  return { label: '— Sin marcar', color: '#999' }; // Gris si no marco nada
}

// ------------------------------------------------------------
// 3. ARRANQUE
// ------------------------------------------------------------
// load() lee localStorage a memoria. Sin esto, siempre verias lista vacia.
load();

// "app" es el <div id="app"> del index.html. Ahi pintamos TODO.
const app = document.getElementById('app') as HTMLElement;

// Cada vez que cambia el # de la URL (el usuario navega), repintamos.
// Ejemplo: al pulsar "Atras" del movil, hash cambia -> render() otra vez.
window.addEventListener('hashchange', render);

// Primer pintado al abrir la app.
render();

// ------------------------------------------------------------
// 4. ROUTER: ¿que pantalla toca segun la URL?
// ------------------------------------------------------------
// location.hash es lo que va despues del # en la URL.
// Lo partimos en ruta + parametros, ej: "#/player?team=A&player=B".
function render(): void {
  const hash = location.hash || '#/';
  // Separamos "#/player?team=A" en ["#/player", "team=A"].
  const [route, queryString] = hash.split('?');
  // URLSearchParams convierte "team=A&player=B" en objeto consultable.
  const params = new URLSearchParams(queryString || '');

  if (route === '#/team') {
    renderTeamDetail(params.get('id') || ''); // Detalle de equipo
  } else if (route === '#/player') {
    renderPlayerDetail(params.get('team') || '', params.get('player') || ''); // Historial jugador
  } else {
    renderTeamsList(); // Por defecto: lista de equipos
  }
}

// Pequeña ayuda para escapar texto del usuario (evita que rompan el HTML con < >).
// En Java seria como sanitizar input antes de pintarlo.
function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ------------------------------------------------------------
// 5. PANTALLA 1: lista de equipos
// ------------------------------------------------------------
function renderTeamsList(): void {
  const state = getState(); // Foto actual: equipos + jugadores + asistencias

  // Construimos el HTML como texto (template string con ` `).
  // .map(...).join('') convierte cada equipo en su tarjeta HTML.
  let html = `<div class="card"><h1>🏟️ Mis Equipos</h1>`;
  html += `<div class="row-form"><input id="newTeam" type="text" placeholder="Nombre del equipo (ej: Benjamines)">`;
  html += `<select id="newDays"><option value="martes_jueves">Martes y Jueves</option><option value="lunes_miercoles">Lunes y Miércoles</option></select>`;
  html += `<button class="btn-main" id="btnAddTeam">+ Crear equipo</button></div></div>`;

  html += `<div class="card"><h1>📋 Lista</h1><div id="teams">`;
  if (state.teams.length === 0) {
    html += `<p class="muted">No hay equipos. Crea uno arriba.</p>`;
  }
  for (const t of state.teams) {
    const pct = getTeamAttendancePercent(t.id); // % general del equipo
    const count = state.players.filter((p) => p.teamId === t.id).length;
    const days = t.trainingDays === 'martes_jueves' ? 'Mar/Jue' : 'Lun/Mié';
    html += `<div class="row"><div><a href="#/team?id=${t.id}"><b>${esc(t.name)}</b></a><div class="muted">${days} · ${count} jugadores · ${pct}%</div></div>`;
    html += `<button class="btn-danger" data-del-team="${t.id}">✕</button></div>`;
  }
  html += `</div></div>`;

  // Pintamos de golpe en el div principal.
  app.innerHTML = html;

  // --- Conectamos los botones RECIEN creados (si no, no hacen nada) ---
  // 1. Boton crear equipo: lee input + select, llama a addTeam(), repinta.
  const btn = document.getElementById('btnAddTeam') as HTMLButtonElement;
  btn.onclick = () => {
    const nameInput = document.getElementById('newTeam') as HTMLInputElement;
    const daysSel = document.getElementById('newDays') as HTMLSelectElement;
    const name = nameInput.value.trim();
    if (!name) return; // No crear equipos sin nombre
    // "as any" aqui porque el select devuelve string generico y TrainingDays es mas estricto.
    addTeam({ name, trainingDays: daysSel.value as 'martes_jueves' | 'lunes_miercoles' });
    render(); // Repintar para ver el nuevo equipo
  };

  // 2. Botones ✕ de borrar: cada uno lleva data-del-team="id".
  // querySelectorAll los busca a todos y les ponemos su onclick.
  app.querySelectorAll('[data-del-team]').forEach((el) => {
    (el as HTMLButtonElement).onclick = () => {
      const id = (el as HTMLElement).dataset.delTeam as string;
      if (confirm('¿Eliminar equipo y sus jugadores?')) {
        deleteTeam(id);
        render();
      }
    };
  });
}

// ------------------------------------------------------------
// 6. PANTALLA 2: detalle de equipo + pasar lista del dia
// ------------------------------------------------------------
function renderTeamDetail(teamId: string): void {
  const state = getState();
  const team = state.teams.find((t) => t.id === teamId);
  if (!team) {
    // Si el id no existe (ej: lo borraron), volvemos a la lista.
    location.hash = '#/';
    return;
  }

  // Fechas de entrenamiento de ESTE equipo (solo Mar/Jue o Lun/Mie).
  const dates = getTrainingDatesForTeam(team.trainingDays);
  // Fecha elegida: la guardamos en variable global de ventana para recordar.
  // Por defecto hoy en formato AAAA-MM-DD.
  const today = new Date().toISOString().split('T')[0] as string;
  const currentDate = (window as unknown as { _selDate?: string })._selDate || today;

  const players = state.players.filter((p) => p.teamId === teamId);
  const pct = getTeamAttendancePercent(teamId);

  let html = `<div class="card"><a href="#/">← Equipos</a><h1>${esc(team.name)}</h1>`;
  html += `<div class="muted">${team.trainingDays === 'martes_jueves' ? 'Martes y Jueves' : 'Lunes y Miércoles'} · General ${pct}%</div>`;
  // Selector de fecha: solo fechas de entrenamiento (un <select> con todas).
  html += `<label>Fecha de entreno:</label><select id="selDate">`;
  for (const d of dates) {
    html += `<option value="${d}" ${d === currentDate ? 'selected' : ''}>${d}</option>`;
  }
  html += `</select></div>`;

  html += `<div class="card"><div class="row-form"><input id="newPlayer" type="text" placeholder="Nombre del jugador"><button class="btn-main" id="btnAddPlayer">+ Añadir</button></div></div>`;

  html += `<div class="card"><h1>📋 Pasar lista (${esc(currentDate)})</h1>`;
  if (players.length === 0) {
    html += `<p class="muted">Sin jugadores. Añade uno arriba.</p>`;
  }
  // Cada jugador = una fila con su % y un boton que CICLA los 4 estados al tocarlo.
  for (const p of players) {
    const att = getAttendanceForPlayerOnDate(p.id, currentDate);
    const info = statusInfo(att?.status);
    const pp = getPlayerAttendancePercent(p.id);
    html += `<div class="row"><div><a href="#/player?team=${team.id}&player=${p.id}"><b>${esc(p.name)}</b></a><div class="muted">${pp}% asistencia</div></div>`;
    html += `<div><button class="btn-status" data-cycle="${p.id}" style="border-color:${info.color};color:${info.color}">${info.label}</button> `;
    html += `<button class="btn-danger" data-del-player="${p.id}">✕</button></div></div>`;
  }
  html += `<div class="row-form"><button class="btn-export" id="btnCsv">📥 Exportar CSV</button></div></div>`;

  app.innerHTML = html;

  // Guardamos la fecha elegida cuando el usuario cambia el select.
  const sel = document.getElementById('selDate') as HTMLSelectElement;
  sel.onchange = () => {
    (window as unknown as { _selDate?: string })._selDate = sel.value;
    render();
  };

  // Añadir jugador a ESTE equipo.
  (document.getElementById('btnAddPlayer') as HTMLButtonElement).onclick = () => {
    const inp = document.getElementById('newPlayer') as HTMLInputElement;
    const name = inp.value.trim();
    if (!name) return;
    addPlayer({ teamId: team.id, name });
    render();
  };

  // TOCAR el boton de estado = pasar al siguiente (asistido -> justificada -> ...).
  // Esto copia handlePressDate de la app vieja ([jugadorId].tsx:54).
  app.querySelectorAll('[data-cycle]').forEach((el) => {
    (el as HTMLButtonElement).onclick = () => {
      const pid = (el as HTMLElement).dataset.cycle as string;
      const cur = getAttendanceForPlayerOnDate(pid, currentDate)?.status;
      setAttendance(pid, currentDate, nextStatus(cur));
      render(); // Repintamos para ver el nuevo color/etiqueta
    };
  });

  // Borrar jugador (con confirmacion).
  app.querySelectorAll('[data-del-player]').forEach((el) => {
    (el as HTMLButtonElement).onclick = () => {
      const pid = (el as HTMLElement).dataset.delPlayer as string;
      if (confirm('¿Quitar jugador?')) {
        deletePlayer(pid);
        render();
      }
    };
  });

  // Exportar CSV de ESTE equipo (Fecha,Jugador,Estado).
  (document.getElementById('btnCsv') as HTMLButtonElement).onclick = () => {
    const s = getState();
    let csv = 'Fecha,Jugador,Estado\n';
    for (const a of s.attendances) {
      const owner = s.players.find((p) => p.id === a.playerId);
      if (owner && owner.teamId === team.id) {
        csv += `"${a.date}","${owner.name}","${a.status}"\n`;
      }
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `asistencias_${team.name}_${currentDate}.csv`;
    link.click();
  };
}

// ------------------------------------------------------------
// 7. PANTALLA 3: historial de un jugador (todas las fechas)
// ------------------------------------------------------------
// Copia la idea de [jugadorId].tsx: lista de fechas, cada una con su
// estado; tocar = ciclar al siguiente.
function renderPlayerDetail(teamId: string, playerId: string): void {
  const state = getState();
  const team = state.teams.find((t) => t.id === teamId);
  const player = state.players.find((p) => p.id === playerId);
  if (!team || !player) {
    location.hash = '#/';
    return;
  }

  const dates = getTrainingDatesForTeam(team.trainingDays);
  const marked = state.attendances.filter((a) => a.playerId === player.id).length;

  let html = `<div class="card"><a href="#/team?id=${team.id}">← ${esc(team.name)}</a><h1>${esc(player.name)}</h1>`;
  html += `<div class="muted">${marked}/${dates.length} días marcados · ${getPlayerAttendancePercent(player.id)}% asistencia</div>`;
  html += `<p class="muted">Toca una fecha para ciclar: ✓ → ⚠ → ✗ → ⏱ → ✓ ...</p></div>`;
  html += `<div class="card">`;
  for (const d of dates) {
    const att = getAttendanceForPlayerOnDate(player.id, d);
    const info = statusInfo(att?.status);
    html += `<div class="row"><span>${d}</span><button class="btn-status" data-date="${d}" style="border-color:${info.color};color:${info.color}">${info.label}</button></div>`;
  }
  html += `</div>`;

  app.innerHTML = html;

  // Cada boton guarda su fecha en data-date; al tocar, cicla ese dia.
  app.querySelectorAll('[data-date]').forEach((el) => {
    (el as HTMLButtonElement).onclick = () => {
      const date = (el as HTMLElement).dataset.date as string;
      const cur = getAttendanceForPlayerOnDate(player.id, date)?.status;
      setAttendance(player.id, date, nextStatus(cur));
      render();
    };
  });
}
