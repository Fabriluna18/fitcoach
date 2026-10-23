import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

export default function MisRutinas() {
  const [rutinas, setRutinas] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [valores, setValores] = useState({});
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    apiFetch('/me/routines').then(setRutinas).catch((err) => setError(err.message));
  }, []);

  const abrir = async (id) => {
    setError('');
    setOk('');
    try {
      const d = await apiFetch(`/me/routines/${id}`);
      const inicial = {};
      d.ejercicios.forEach((e) => {
        const base = e.ultimo_peso ?? e.peso_sugerido;
        inicial[e.id] = {
          peso_real: base != null ? String(Number(base)) : '',
          series_completadas: String(e.series),
        };
      });
      setDetalle(d);
      setValores(inicial);
      setComentario('');
    } catch (err) {
      setError(err.message);
    }
  };

  const cambiar = (id, campo, valor) =>
    setValores({ ...valores, [id]: { ...valores[id], [campo]: valor } });

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');

    const registros = detalle.ejercicios.map((ej) => ({
      routine_exercise_id: ej.id,
      peso_real: valores[ej.id].peso_real === '' ? null : Number(valores[ej.id].peso_real),
      series_completadas: Number(valores[ej.id].series_completadas),
    }));

    try {
      await apiFetch(`/me/routines/${detalle.id}/sesion`, {
        method: 'POST',
        body: JSON.stringify({ comentario, registros }),
      });
      await abrir(detalle.id);
      setOk('¡Sesión guardada! Buen trabajo 💪');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1>Mis rutinas</h1>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Rutinas asignadas ({rutinas.length})</h3>
        {rutinas.length === 0 ? (
          <p className="sub">Todavía no tenés rutinas asignadas. Pedile a tu entrenador que te arme una.</p>
        ) : (
          <ul className="lista">
            {rutinas.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{r.nombre}</strong>
                  <div className="sub">
                    {r.grupo ? `Grupo: ${r.grupo}` : 'Individual'} · {r.ejercicios} ejercicios
                  </div>
                </div>
                <button className="btn-chico" onClick={() => abrir(r.id)}>Entrenar</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {detalle && (
        <div className="card">
          <h3>{detalle.nombre}{detalle.grupo ? ` · ${detalle.grupo}` : ''}</h3>
          <p className="sub">Cargá lo que hiciste hoy en cada ejercicio.</p>
          {ok && <p className="ok">{ok}</p>}
          <form onSubmit={guardar}>
            {detalle.ejercicios.map((ej) => (
              <div className="fila-ejercicio" key={ej.id}>
                <div className="nombre">
                  <strong>{ej.nombre}</strong>
                  <div className="sub">
                    Plan: {ej.series} x {ej.repeticiones}
                    {ej.peso_sugerido ? ` · ${Number(ej.peso_sugerido)} kg` : ''}
                    {ej.ultimo_peso ? ` · Última vez: ${Number(ej.ultimo_peso)} kg` : ''}
                  </div>
                </div>
                <input
                  type="number" min="0" step="0.5" placeholder="Peso real (kg)"
                  value={valores[ej.id]?.peso_real ?? ''}
                  onChange={(e) => cambiar(ej.id, 'peso_real', e.target.value)}
                />
                <input
                  type="number" min="0" placeholder="Series hechas"
                  value={valores[ej.id]?.series_completadas ?? ''}
                  onChange={(e) => cambiar(ej.id, 'series_completadas', e.target.value)}
                  required
                />
              </div>
            ))}
            <textarea
              className="comentario" rows="3"
              placeholder="¿Cómo te sentiste hoy? (opcional)"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
            <div className="acciones" style={{ marginTop: 12 }}>
              <button className="btn" type="submit">Guardar sesión</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}