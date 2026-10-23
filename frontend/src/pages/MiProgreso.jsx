import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import EvolucionChart from '../components/EvolucionChart';

export default function MiProgreso() {
  const [historial, setHistorial] = useState([]);
  const [evolucion, setEvolucion] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/me/history').then(setHistorial).catch((err) => setError(err.message));
    apiFetch('/me/progress').then(setEvolucion).catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <h1>Mi progreso</h1>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Evolución de peso</h3>
        <EvolucionChart datos={evolucion} />
      </div>

      <div className="card">
        <h3>Últimos registros ({historial.length})</h3>
        {historial.length === 0 ? (
          <p className="sub">Todavía no registraste sesiones. Andá a Mis rutinas y guardá tu primer entrenamiento.</p>
        ) : (
          <table className="tabla">
            <thead>
              <tr><th>Fecha</th><th>Rutina</th><th>Ejercicio</th><th>Peso</th><th>Series</th><th>Comentario</th></tr>
            </thead>
            <tbody>
              {historial.map((h) => (
                <tr key={h.id}>
                  <td>{h.fecha}</td>
                  <td>{h.rutina}</td>
                  <td>{h.ejercicio}</td>
                  <td>{h.peso_real != null ? `${Number(h.peso_real)} kg` : '-'}</td>
                  <td>{h.series_completadas ?? '-'}</td>
                  <td>{h.comentario || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}