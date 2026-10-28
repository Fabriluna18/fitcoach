import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import Avatar from '../components/Avatar';
import ProgresoGeneralChart from '../components/ProgresoGeneralChart';

const claseBarra = (pct) => (pct >= 60 ? '' : pct >= 30 ? 'media' : 'baja');
const porcentaje = (n) => `${n > 0 ? '+' : ''}${n.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`;

export default function Progreso() {
  const [clientes, setClientes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/stats/clientes').then(setClientes).catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <h1>Progreso</h1>
      {error && <p className="error">{error}</p>}

      <ProgresoGeneralChart />

      <div className="card">
        <h3>Tus clientes</h3>
        <p className="sub">Los últimos 30 días de cada cliente activo.</p>

        {clientes === null && !error ? (
          <p className="sub">Cargando...</p>
        ) : clientes && clientes.length === 0 ? (
          <p className="sub">Todavía no tenés clientes activos.</p>
        ) : clientes ? (
          <table className="tabla">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Adherencia</th>
                <th>Progreso promedio</th>
                <th>Última sesión</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="persona">
                      <Avatar nombre={c.nombre} avatar={c.avatar} size={34} />
                      <strong>{c.nombre}</strong>
                    </div>
                  </td>
                  <td>
                    <div className="adh">
                      <div className={`barra ${claseBarra(c.adherencia)}`}>
                        <div style={{ width: `${c.adherencia}%` }} />
                      </div>
                      <span>{c.adherencia}%</span>
                      <span className="sub">({c.sesiones} de {c.meta} días)</span>
                    </div>
                  </td>
                  <td>
                    {c.progreso === null ? (
                      <span className="sub" title="Hacen falta al menos dos registros de un mismo ejercicio">Sin datos</span>
                    ) : (
                      <span className={c.progreso > 0 ? 'tendencia sube' : ''}>{porcentaje(c.progreso)}</span>
                    )}
                  </td>
                  <td>{c.ultima || '-'}</td>
                  <td>
                    <Link to={`/clientes/${c.id}/progreso`} className="btn-chico" style={{ textDecoration: 'none' }}>
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </>
  );
}