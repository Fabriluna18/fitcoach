import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

const filaVacia = { exercise_id: '', series: '4', repeticiones: '8-10', peso_sugerido: '' };

export default function Rutinas() {
  const [rutinas, setRutinas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [ejercicios, setEjercicios] = useState([]);
  const [nombre, setNombre] = useState('');
  const [destino, setDestino] = useState('cliente');
  const [userId, setUserId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [filas, setFilas] = useState([{ ...filaVacia }]);
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState('');

  const cargarRutinas = () =>
    apiFetch('/routines').then(setRutinas).catch((err) => setError(err.message));

  useEffect(() => {
    apiFetch('/routines').then(setRutinas).catch((err) => setError(err.message));
    apiFetch('/clients').then(setClientes).catch((err) => setError(err.message));
    apiFetch('/groups').then(setGrupos).catch((err) => setError(err.message));
    apiFetch('/exercises').then(setEjercicios).catch((err) => setError(err.message));
  }, []);

  const cambiarFila = (i, campo, valor) =>
    setFilas(filas.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f)));

  const agregarFila = () => setFilas([...filas, { ...filaVacia }]);
  const quitarFila = (i) => setFilas(filas.filter((_, idx) => idx !== i));

  const crear = async (e) => {
    e.preventDefault();
    setError('');

    if (filas.some((f) => !f.exercise_id)) {
      setError('Elegí un ejercicio en cada fila (o quitá las filas vacías)');
      return;
    }

    const cuerpo = {
      nombre,
      ejercicios: filas.map((f) => ({
        exercise_id: Number(f.exercise_id),
        series: Number(f.series),
        repeticiones: f.repeticiones,
        peso_sugerido: f.peso_sugerido ? Number(f.peso_sugerido) : null,
      })),
    };
    if (destino === 'cliente') cuerpo.user_id = Number(userId);
    else cuerpo.group_id = Number(groupId);

    try {
      await apiFetch('/routines', { method: 'POST', body: JSON.stringify(cuerpo) });
      setNombre('');
      setUserId('');
      setGroupId('');
      setFilas([{ ...filaVacia }]);
      cargarRutinas();
    } catch (err) {
      setError(err.message);
    }
  };

  const verDetalle = async (id) => {
    setError('');
    try {
      setDetalle(await apiFetch(`/routines/${id}`));
    } catch (err) {
      setError(err.message);
    }
  };

  const borrar = async (id) => {
    setError('');
    try {
      await apiFetch(`/routines/${id}`, { method: 'DELETE' });
      if (detalle && detalle.id === id) setDetalle(null);
      cargarRutinas();
    } catch (err) {
      setError(err.message);
    }
  };

  const clientesActivos = clientes.filter((c) => c.activo);

  return (
    <>
      <h1>Rutinas</h1>
      {error && <p className="error">{error}</p>}

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

          {filas.map((f, i) => (
            <div className="fila-ejercicio" key={i}>
              <select value={f.exercise_id} onChange={(e) => cambiarFila(i, 'exercise_id', e.target.value)}>
                <option value="">Ejercicio...</option>
                {ejercicios.map((ej) => (
                  <option key={ej.id} value={ej.id}>{ej.nombre}</option>
                ))}
              </select>
              <input type="number" min="1" placeholder="Series" value={f.series} onChange={(e) => cambiarFila(i, 'series', e.target.value)} required />
              <input placeholder="Reps (8-10)" value={f.repeticiones} onChange={(e) => cambiarFila(i, 'repeticiones', e.target.value)} required />
              <input type="number" min="0" step="0.5" placeholder="Peso kg" value={f.peso_sugerido} onChange={(e) => cambiarFila(i, 'peso_sugerido', e.target.value)} />
              {filas.length > 1 && (
                <button type="button" className="btn-peligro" onClick={() => quitarFila(i)}>Quitar</button>
              )}
            </div>
          ))}

          <div className="acciones" style={{ marginTop: 12 }}>
            <button type="button" className="btn-chico" onClick={agregarFila}>+ Agregar ejercicio</button>
            <button className="btn" type="submit">Crear rutina</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Mis rutinas ({rutinas.length})</h3>
        {rutinas.length === 0 ? (
          <p className="sub">Todavía no creaste rutinas.</p>
        ) : (
          <ul className="lista">
            {rutinas.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{r.nombre}</strong>
                  <div className="sub">
                    {r.cliente ? `Cliente: ${r.cliente}` : `Grupo: ${r.grupo}`} · {r.ejercicios} ejercicios
                  </div>
                </div>
                <div className="acciones">
                  <button className="btn-chico" onClick={() => verDetalle(r.id)}>Ver</button>
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
          <table className="tabla">
            <thead>
              <tr><th>Ejercicio</th><th>Músculo</th><th>Series</th><th>Reps</th><th>Peso sugerido</th></tr>
            </thead>
            <tbody>
              {detalle.ejercicios.map((e) => (
                <tr key={e.id}>
                  <td>{e.nombre}</td>
                  <td>{e.musculo || '-'}</td>
                  <td>{e.series}</td>
                  <td>{e.repeticiones}</td>
                  <td>{e.peso_sugerido ? `${Number(e.peso_sugerido)} kg` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}