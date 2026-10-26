import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import VideoBoton from '../components/VideoBoton';

const TIPOS = {
  normal: { nombre: 'Ejercicio suelto' },
  biserie: { nombre: 'Biserie (2 seguidos)' },
  triserie: { nombre: 'Triserie (3 seguidos)' },
  circuito: { nombre: 'Circuito (3 o más)' },
};

const ETIQUETA_ESTADO = { activa: 'Activa', programada: 'Programada', finalizada: 'Finalizada' };

const filaVacia = () => ({ exercise_id: '', repeticiones: '8-10', peso_sugerido: '' });
const bloqueNuevo = () => ({ tipo: 'normal', vueltas: '4', descanso_seg: '90', ejercicios: [filaVacia()] });

const hoyISO = () => new Date().toLocaleDateString('en-CA');
const fechaCorta = (iso) => {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
};
const etiquetaVueltas = (tipo) => (tipo === 'circuito' ? 'Vueltas' : tipo === 'normal' ? 'Series' : 'Rondas');
const descanso = (s) => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s} seg`);
const rangoFechas = (r) =>
  r.fecha_fin
    ? `Del ${fechaCorta(r.fecha_inicio)} al ${fechaCorta(r.fecha_fin)}`
    : `Desde el ${fechaCorta(r.fecha_inicio)}, sin vencimiento`;

export default function Rutinas() {
  const [rutinas, setRutinas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [ejercicios, setEjercicios] = useState([]);
  const [nombre, setNombre] = useState('');
  const [destino, setDestino] = useState('cliente');
  const [userId, setUserId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [inicio, setInicio] = useState(hoyISO());
  const [semanas, setSemanas] = useState('');
  const [bloques, setBloques] = useState([bloqueNuevo()]);
  const [conflicto, setConflicto] = useState(null);
  const [vista, setVista] = useState('vigentes');
  const [detalle, setDetalle] = useState(null);
  const [renovando, setRenovando] = useState(null);
  const [datosRenovar, setDatosRenovar] = useState({ semanas: '4', inicio: hoyISO() });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const cargarRutinas = () =>
    apiFetch('/routines').then(setRutinas).catch((err) => setError(err.message));

  useEffect(() => {
    apiFetch('/routines').then(setRutinas).catch((err) => setError(err.message));
    apiFetch('/clients').then(setClientes).catch((err) => setError(err.message));
    apiFetch('/groups').then(setGrupos).catch((err) => setError(err.message));
    apiFetch('/exercises').then(setEjercicios).catch((err) => setError(err.message));
  }, []);

  // ----- Edición de bloques -----
  const cambiarBloque = (i, campo, valor) =>
    setBloques(bloques.map((b, idx) => (idx === i ? { ...b, [campo]: valor } : b)));

  const cambiarTipo = (i, tipo) => {
    const min = { normal: 1, biserie: 2, triserie: 3, circuito: 3 }[tipo];
    const max = { normal: 1, biserie: 2, triserie: 3, circuito: 12 }[tipo];
    setBloques(
      bloques.map((b, idx) => {
        if (idx !== i) return b;
        const lista = b.ejercicios.slice(0, max);
        while (lista.length < min) lista.push(filaVacia());
        return { ...b, tipo, ejercicios: lista };
      })
    );
  };

  const cambiarEjercicio = (i, j, campo, valor) =>
    setBloques(
      bloques.map((b, idx) =>
        idx !== i
          ? b
          : { ...b, ejercicios: b.ejercicios.map((e, k) => (k === j ? { ...e, [campo]: valor } : e)) }
      )
    );

  const agregarEjercicio = (i) =>
    setBloques(bloques.map((b, idx) => (idx === i ? { ...b, ejercicios: [...b.ejercicios, filaVacia()] } : b)));

  const quitarEjercicio = (i, j) =>
    setBloques(
      bloques.map((b, idx) => (idx === i ? { ...b, ejercicios: b.ejercicios.filter((_, k) => k !== j) } : b))
    );

  const agregarBloque = () => setBloques([...bloques, bloqueNuevo()]);
  const quitarBloque = (i) => setBloques(bloques.filter((_, idx) => idx !== i));

  // ----- Crear -----
  const armarCuerpo = (decision) => {
    const cuerpo = {
      nombre,
      fecha_inicio: inicio,
      semanas: semanas ? Number(semanas) : null,
      bloques: bloques.map((b) => ({
        tipo: b.tipo,
        vueltas: Number(b.vueltas),
        descanso_seg: Number(b.descanso_seg),
        ejercicios: b.ejercicios.map((e) => ({
          exercise_id: Number(e.exercise_id),
          repeticiones: e.repeticiones,
          peso_sugerido: e.peso_sugerido === '' ? null : Number(e.peso_sugerido),
        })),
      })),
    };
    if (destino === 'cliente') cuerpo.user_id = Number(userId);
    else cuerpo.group_id = Number(groupId);
    if (decision) cuerpo.conflicto = decision;
    return cuerpo;
  };

  const enviar = async (decision) => {
    setError('');
    setOk('');
    try {
      await apiFetch('/routines', { method: 'POST', body: JSON.stringify(armarCuerpo(decision)) });
      setNombre('');
      setUserId('');
      setGroupId('');
      setInicio(hoyISO());
      setSemanas('');
      setBloques([bloqueNuevo()]);
      setConflicto(null);
      setOk('Rutina creada');
      cargarRutinas();
    } catch (err) {
      if (err.codigo === 'RUTINA_ACTIVA') {
        setConflicto(err.datos.activas);
        return;
      }
      setConflicto(null);
      setError(err.message);
    }
  };

  const crear = (e) => {
    e.preventDefault();
    if (bloques.some((b) => b.ejercicios.some((x) => !x.exercise_id))) {
      setError('Elegí un ejercicio en cada fila');
      return;
    }
    enviar();
  };

  // ----- Acciones sobre rutinas existentes -----
  const verDetalle = async (id) => {
    setError('');
    try {
      setDetalle(await apiFetch(`/routines/${id}`));
    } catch (err) {
      setError(err.message);
    }
  };

  const archivar = async (id) => {
    setError('');
    setOk('');
    try {
      await apiFetch(`/routines/${id}/archivar`, { method: 'POST' });
      setOk('Rutina archivada: quedó en el historial con todo su progreso');
      if (detalle && detalle.id === id) setDetalle(null);
      cargarRutinas();
    } catch (err) {
      setError(err.message);
    }
  };

  const borrar = async (id) => {
    setError('');
    setOk('');
    try {
      await apiFetch(`/routines/${id}`, { method: 'DELETE' });
      if (detalle && detalle.id === id) setDetalle(null);
      cargarRutinas();
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmarRenovar = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      await apiFetch(`/routines/${renovando.id}/renovar`, {
        method: 'POST',
        body: JSON.stringify({ semanas: Number(datosRenovar.semanas), fecha_inicio: datosRenovar.inicio }),
      });
      setRenovando(null);
      setOk('Rutina renovada: la anterior quedó en el historial');
      cargarRutinas();
    } catch (err) {
      setError(err.message);
    }
  };

  const clientesActivos = clientes.filter((c) => c.activo);
  const vigentes = rutinas.filter((r) => r.estado !== 'finalizada');
  const historial = rutinas.filter((r) => r.estado === 'finalizada');
  const visibles = vista === 'vigentes' ? vigentes : historial;

  return (
    <>
      <h1>Rutinas</h1>
      {error && <p className="error">{error}</p>}
      {ok && <p className="ok">{ok}</p>}

      <div className="card">
        <h3>Nueva rutina</h3>
        {(clientesActivos.length === 0 || ejercicios.length === 0) && (
          <p className="sub">Para armar una rutina necesitás al menos un cliente activo y un ejercicio cargado.</p>
        )}
        <form onSubmit={crear}>
          <div className="fila-form" style={{ marginBottom: 12 }}>
            <input placeholder="Nombre de la rutina" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            <select value={destino} onChange={(e) => setDestino(e.target.value)}>
              <option value="cliente">Para un cliente</option>
              <option value="grupo">Para un grupo</option>
            </select>
            {destino === 'cliente' ? (
              <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">Elegí un cliente...</option>
                {clientesActivos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            ) : (
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
                <option value="">Elegí un grupo...</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>{g.nombre} ({g.miembros})</option>
                ))}
              </select>
            )}
          </div>

          <div className="fila-form" style={{ marginBottom: 16 }}>
            <label className="campo">
              Empieza el
              <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
            </label>
            <label className="campo">
              Duración
              <select value={semanas} onChange={(e) => setSemanas(e.target.value)}>
                <option value="">Sin vencimiento</option>
                <option value="1">1 semana</option>
                <option value="2">2 semanas</option>
                <option value="4">4 semanas (mensual)</option>
                <option value="8">8 semanas</option>
                <option value="12">12 semanas (trimestral)</option>
              </select>
            </label>
          </div>

          {bloques.map((b, i) => (
            <div className="bloque" key={i}>
              <div className="bloque-cabecera">
                <strong>Bloque {i + 1}</strong>
                <select value={b.tipo} onChange={(e) => cambiarTipo(i, e.target.value)}>
                  {Object.entries(TIPOS).map(([clave, t]) => (
                    <option key={clave} value={clave}>{t.nombre}</option>
                  ))}
                </select>
                <label className="campo-mini">
                  {etiquetaVueltas(b.tipo)}
                  <input type="number" min="1" max="20" value={b.vueltas}
                    onChange={(e) => cambiarBloque(i, 'vueltas', e.target.value)} required />
                </label>
                <label className="campo-mini">
                  Descanso (seg)
                  <input type="number" min="0" max="900" step="15" value={b.descanso_seg}
                    onChange={(e) => cambiarBloque(i, 'descanso_seg', e.target.value)} required />
                </label>
                {bloques.length > 1 && (
                  <button type="button" className="btn-peligro" onClick={() => quitarBloque(i)}>Quitar bloque</button>
                )}
              </div>

              {b.ejercicios.map((e, j) => (
                <div className="fila-ejercicio" key={j}>
                  <select value={e.exercise_id} onChange={(ev) => cambiarEjercicio(i, j, 'exercise_id', ev.target.value)}>
                    <option value="">Ejercicio...</option>
                    {ejercicios.map((ej) => (
                      <option key={ej.id} value={ej.id}>{ej.nombre}</option>
                    ))}
                  </select>
                  <input placeholder="Reps (8-10)" value={e.repeticiones}
                    onChange={(ev) => cambiarEjercicio(i, j, 'repeticiones', ev.target.value)} required />
                  <input type="number" min="0" step="0.5" placeholder="Peso kg" value={e.peso_sugerido}
                    onChange={(ev) => cambiarEjercicio(i, j, 'peso_sugerido', ev.target.value)} />
                  {b.tipo === 'circuito' && b.ejercicios.length > 3 && (
                    <button type="button" className="btn-peligro" onClick={() => quitarEjercicio(i, j)}>Quitar</button>
                  )}
                </div>
              ))}

              {b.tipo === 'circuito' && b.ejercicios.length < 12 && (
                <button type="button" className="btn-chico" onClick={() => agregarEjercicio(i)}>
                  + Ejercicio al circuito
                </button>
              )}
            </div>
          ))}

          <p className="sub">
            En una biserie, triserie o circuito se hacen los ejercicios seguidos y recién al terminar la ronda se descansa.
          </p>
          <div className="acciones" style={{ marginTop: 12 }}>
            <button type="button" className="btn-chico" onClick={agregarBloque}>+ Agregar bloque</button>
            <button className="btn" type="submit">Crear rutina</button>
          </div>
        </form>

        {conflicto && (
          <div className="aviso">
            <strong>Ya tiene una rutina activa: {conflicto.map((a) => a.nombre).join(', ')}.</strong>
            <p className="sub">¿Qué hacemos con la actual?</p>
            <div className="acciones">
              <button className="btn" onClick={() => enviar('reemplazar')}>Reemplazar (pasa al historial)</button>
              <button className="btn-chico" onClick={() => enviar('mantener')}>Mantener las dos</button>
              <button className="btn-chico" onClick={() => setConflicto(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {renovando && (
        <div className="card">
          <h3>Renovar «{renovando.nombre}»</h3>
          <p className="sub">Se crea una copia con las fechas nuevas y la actual pasa al historial.</p>
          <form className="fila-form" onSubmit={confirmarRenovar}>
            <label className="campo">
              Empieza el
              <input type="date" value={datosRenovar.inicio}
                onChange={(e) => setDatosRenovar({ ...datosRenovar, inicio: e.target.value })} required />
            </label>
            <label className="campo">
              Duración
              <select value={datosRenovar.semanas}
                onChange={(e) => setDatosRenovar({ ...datosRenovar, semanas: e.target.value })}>
                <option value="1">1 semana</option>
                <option value="2">2 semanas</option>
                <option value="4">4 semanas (mensual)</option>
                <option value="8">8 semanas</option>
                <option value="12">12 semanas (trimestral)</option>
              </select>
            </label>
            <button className="btn" type="submit">Renovar</button>
            <button type="button" className="btn-chico" onClick={() => setRenovando(null)}>Cancelar</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="pestanas">
          <button className={vista === 'vigentes' ? 'activa' : ''} onClick={() => setVista('vigentes')}>
            Vigentes ({vigentes.length})
          </button>
          <button className={vista === 'historial' ? 'activa' : ''} onClick={() => setVista('historial')}>
            Historial ({historial.length})
          </button>
        </div>

        {visibles.length === 0 ? (
          <p className="sub">
            {vista === 'vigentes' ? 'No hay rutinas vigentes.' : 'Todavía no hay rutinas en el historial.'}
          </p>
        ) : (
          <ul className="lista">
            {visibles.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{r.nombre}</strong>{' '}
                  <span className={`badge ${r.estado}`}>{ETIQUETA_ESTADO[r.estado]}</span>
                  <div className="sub">
                    {r.cliente ? `Cliente: ${r.cliente}` : `Grupo: ${r.grupo}`} · {r.ejercicios} ejercicios
                  </div>
                  <div className="sub">{rangoFechas(r)}</div>
                </div>
                <div className="acciones">
                  <button className="btn-chico" onClick={() => verDetalle(r.id)}>Ver</button>
                  <button className="btn-chico" onClick={() => {
                    setRenovando(r);
                    setDatosRenovar({ semanas: '4', inicio: hoyISO() });
                  }}>Renovar</button>
                  {r.estado !== 'finalizada' && (
                    <button className="btn-chico" onClick={() => archivar(r.id)}>Archivar</button>
                  )}
                  <button className="btn-peligro" onClick={() => borrar(r.id)}>Borrar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {detalle && (
        <div className="card">
          <h3>{detalle.nombre} · {detalle.cliente || `Grupo ${detalle.grupo}`}</h3>
          <p className="sub">{rangoFechas(detalle)}</p>
          {detalle.bloques.map((b) => (
            <div className="bloque-detalle" key={b.id}>
              <div className="bloque-titulo">
                <span className="badge-tipo">{TIPOS[b.tipo].nombre}</span>
                <span className="sub">
                  {b.vueltas} {etiquetaVueltas(b.tipo).toLowerCase()} · descanso {descanso(b.descanso_seg)}
                </span>
              </div>
              <table className="tabla">
                <thead>
                  <tr><th>Ejercicio</th><th>Músculo</th><th>Reps</th><th>Peso sugerido</th></tr>
                </thead>
                <tbody>
                  {b.ejercicios.map((e) => (
                    <tr key={e.id}>
                      <td>{e.nombre}<VideoBoton url={e.video_url} tipo={e.video_tipo} titulo={e.nombre} /></td>
                      <td>{e.musculo || '-'}</td>
                      <td>{e.repeticiones}</td>
                      <td>{e.peso_sugerido ? `${Number(e.peso_sugerido)} kg` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </>
  );
}