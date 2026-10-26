import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

const TIPOS = {
  evaluacion: 'Evaluación física',
  seguimiento: 'Sesión de seguimiento',
  clase: 'Clase grupal',
  otra: 'Otra',
};

const fechaLarga = (f) => {
  const [a, m, d] = f.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
};

export default function MisCitas() {
  const [citas, setCitas] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/me/appointments')
      .then(setCitas)
      .catch((err) => setError(err.message))
      .finally(() => setCargado(true));
  }, []);

  const dias = [];
  citas.forEach((c) => {
    const ultimo = dias[dias.length - 1];
    if (ultimo && ultimo.fecha === c.fecha) ultimo.citas.push(c);
    else dias.push({ fecha: c.fecha, citas: [c] });
  });

  return (
    <>
      <h1>Mis citas</h1>
      {error && <p className="error">{error}</p>}

      {cargado && dias.length === 0 && (
        <div className="card">
          <p className="sub">No tenés citas próximas. Tu entrenador las agenda desde su calendario.</p>
        </div>
      )}

      {dias.map((d) => (
        <div className="card" key={d.fecha}>
          <h3 style={{ textTransform: 'capitalize' }}>{fechaLarga(d.fecha)}</h3>
          {d.citas.map((c) => (
            <div className="cita-item" key={c.id}>
              <div>
                <span className="cita-hora">{c.hora_inicio} – {c.hora_fin}</span>
                <span className={`etiqueta-tipo tipo-${c.tipo}`}>{TIPOS[c.tipo]}</span>
                <div><strong>{c.titulo}</strong></div>
                <div className="sub">
                  Con {c.entrenador}{c.grupo ? ` · Grupo: ${c.grupo}` : ''}
                </div>
                {c.notas && <div className="sub">{c.notas}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}