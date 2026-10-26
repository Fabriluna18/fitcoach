import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

export default function ProximasCitas() {
  const [citas, setCitas] = useState(null);

  useEffect(() => {
    apiFetch('/appointments/proximas').then(setCitas).catch(() => setCitas([]));
  }, []);

  return (
    <div className="card">
      <div className="encabezado-card">
        <h3>Próximas citas</h3>
        <Link to="/calendario">Ver calendario</Link>
      </div>

      {citas === null ? (
        <p className="sub">Cargando...</p>
      ) : citas.length === 0 ? (
        <p className="sub">No tenés citas próximas.</p>
      ) : (
        <ul className="lista">
          {citas.map((c) => {
            const [, mes, dia] = c.fecha.split('-');
            return (
              <li key={c.id}>
                <div className="persona">
                  <div className="fecha-chip">
                    <span>{MESES[Number(mes) - 1]}</span>
                    <strong>{Number(dia)}</strong>
                  </div>
                  <div>
                    <strong>{c.cliente || c.grupo}</strong>
                    <div className="sub">{c.titulo}</div>
                  </div>
                </div>
                <span className="hora">
                  <i className={`punto-tipo tipo-${c.tipo}`} /> {c.hora_inicio}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}