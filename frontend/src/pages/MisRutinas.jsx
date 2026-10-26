import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { apiFetch } from '../api/client';
import Cronometro from '../components/Cronometro';
import VideoBoton from '../components/VideoBoton';
import useCronometro, { formatoTiempo } from '../hooks/useCronometro';

const NOMBRE_TIPO = { normal: 'Ejercicio suelto', biserie: 'Biserie', triserie: 'Triserie', circuito: 'Circuito' };
const ETIQUETA_ESTADO = { activa: 'Activa', programada: 'Programada', finalizada: 'Finalizada' };

const fechaCorta = (iso) => {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
};
const rangoFechas = (r) =>
  r.fecha_fin
    ? `Del ${fechaCorta(r.fecha_inicio)} al ${fechaCorta(r.fecha_fin)}`
    : `Desde el ${fechaCorta(r.fecha_inicio)}`;
const etiquetaVueltas = (tipo) => (tipo === 'circuito' ? 'vueltas' : tipo === 'normal' ? 'series' : 'rondas');

export default function MisRutinas() {
  const [rutinas, setRutinas] = useState([]);
  const [vista, setVista] = useState('vigentes');
  const [detalle, setDetalle] = useState(null);
  const [valores, setValores] = useState({});
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const crono = useCronometro();

  useEffect(() => {
    apiFetch('/me/routines').then(setRutinas).catch((err) => setError(err.message));
  }, []);

  const abrir = async (id) => {
    setError('');
    setOk('');
    try {
      const d = await apiFetch(`/me/routines/${id}`);
      const inicial = {};
      d.bloques.forEach((b) =>
        b.ejercicios.forEach((e) => {
          const base = e.ultimo_peso ?? e.peso_sugerido;
          inicial[e.id] = {
            peso_real: base != null ? String(Number(base)) : '',
            series_completadas: String(b.vueltas),
          };
        })
      );
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

    const registros = detalle.bloques.flatMap((b) =>
      b.ejercicios.map((ej) => ({
        routine_exercise_id: ej.id,
        peso_real: valores[ej.id].peso_real === '' ? null : Number(valores[ej.id].peso_real),
        series_completadas: Number(valores[ej.id].series_completadas),
      }))
    );

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

  const vigentes = rutinas.filter((r) => r.estado !== 'finalizada');
  const historial = rutinas.filter((r) => r.estado === 'finalizada');
  const visibles = vista === 'vigentes' ? vigentes : historial;
  const puedeEntrenar = detalle && detalle.estado === 'activa';

  return (
    <>
      <h1>Mis rutinas</h1>
      {error && <p className="error">{error}</p>}

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
            {vista === 'vigentes'
              ? 'Todavía no tenés rutinas vigentes. Pedile a tu entrenador que te arme una.'
              : 'Todavía no tenés rutinas en el historial.'}
          </p>
        ) : (
          <ul className="lista">
            {visibles.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{r.nombre}</strong>{' '}
                  <span className={`badge ${r.estado}`}>{ETIQUETA_ESTADO[r.estado]}</span>
                  <div className="sub">
                    {r.grupo ? `Grupo: ${r.grupo}` : 'Individual'} · {r.ejercicios} ejercicios
                  </div>
                  <div className="sub">{rangoFechas(r)}</div>
                </div>
                <button className="btn-chico" onClick={() => abrir(r.id)}>
                  {r.estado === 'activa' ? 'Entrenar' : 'Ver'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {detalle && (
        <div className="card">
          <h3>
            {detalle.nombre}{detalle.grupo ? ` · ${detalle.grupo}` : ''}{' '}
            <span className={`badge ${detalle.estado}`}>{ETIQUETA_ESTADO[detalle.estado]}</span>
          </h3>
          <p className="sub">{rangoFechas(detalle)}</p>

          {detalle.estado === 'programada' && (
            <p className="sub">Esta rutina todavía no empezó. Vas a poder registrar sesiones desde el {fechaCorta(detalle.fecha_inicio)}.</p>
          )}
          {detalle.estado === 'finalizada' && (
            <p className="sub">Esta rutina ya terminó. Tus registros quedan guardados en Mi progreso.</p>
          )}
          {ok && <p className="ok">{ok}</p>}

          <form onSubmit={guardar}>
            {detalle.bloques.map((b, i) => (
              <div className="bloque-detalle" key={b.id}>
                <div className="bloque-titulo">
                  <strong>Bloque {i + 1}</strong>
                  <span className="badge-tipo">{NOMBRE_TIPO[b.tipo]}</span>
                  <span className="sub">
                    {b.vueltas} {etiquetaVueltas(b.tipo)} · descanso {formatoTiempo(b.descanso_seg)}
                  </span>
                  {puedeEntrenar && b.descanso_seg > 0 && (
                    <button type="button" className="btn-chico con-icono" onClick={() => crono.iniciar(b.descanso_seg)}>
                      <Timer size={14} /> Descanso {formatoTiempo(b.descanso_seg)}
                    </button>
                  )}
                </div>

                {puedeEntrenar ? (
                  b.ejercicios.map((ej) => (
                    <div className="fila-ejercicio" key={ej.id}>
                      <div className="nombre">
                        <strong>{ej.nombre}</strong>
                        <VideoBoton url={ej.video_url} tipo={ej.video_tipo} titulo={ej.nombre} />
                        <div className="sub">
                          Plan: {ej.repeticiones} reps
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
                        type="number" min="0" placeholder={`${etiquetaVueltas(b.tipo)} hechas`}
                        value={valores[ej.id]?.series_completadas ?? ''}
                        onChange={(e) => cambiar(ej.id, 'series_completadas', e.target.value)}
                        required
                      />
                    </div>
                  ))
                ) : (
                  <table className="tabla">
                    <thead>
                      <tr><th>Ejercicio</th><th>Músculo</th><th>Reps</th><th>Peso sugerido</th></tr>
                    </thead>
                    <tbody>
                      {b.ejercicios.map((ej) => (
                        <tr key={ej.id}>
                          <td>{ej.nombre}<VideoBoton url={ej.video_url} tipo={ej.video_tipo} titulo={ej.nombre} /></td>
                          <td>{ej.musculo || '-'}</td>
                          <td>{ej.repeticiones}</td>
                          <td>{ej.peso_sugerido ? `${Number(ej.peso_sugerido)} kg` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}

            {puedeEntrenar && (
              <>
                <textarea
                  className="comentario" rows="3"
                  placeholder="¿Cómo te sentiste hoy? (opcional)"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                />
                <div className="acciones" style={{ marginTop: 12 }}>
                  <button className="btn" type="submit">Guardar sesión</button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {puedeEntrenar && <Cronometro crono={crono} />}
    </>
  );
}