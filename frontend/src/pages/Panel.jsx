import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CalendarClock, ClipboardList, Users, UsersRound } from 'lucide-react';
import { apiFetch } from '../api/client';
import Alertas from '../components/Alertas';
import Avatar from '../components/Avatar';

const META_SESIONES = 12;

export default function Panel() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const esCliente = user?.rol === 'cliente';
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (esCliente) return;
    apiFetch('/dashboard').then(setDatos).catch((err) => setError(err.message));
  }, [esCliente]);

  if (esCliente) return <Navigate to="/mis-rutinas" />;

  const tarjetas = datos && [
    {
      icono: <Users size={22} />, color: 'azul', numero: datos.clientes, etiqueta: 'Clientes activos',
      extra: datos.clientes_nuevos > 0 ? `+${datos.clientes_nuevos} este mes` : null,
    },
    { icono: <UsersRound size={22} />, color: 'verde', numero: datos.grupos, etiqueta: 'Grupos' },
    { icono: <ClipboardList size={22} />, color: 'violeta', numero: datos.rutinas, etiqueta: 'Rutinas asignadas' },
    {
      icono: <CalendarClock size={22} />, color: 'naranja', numero: datos.pagos_alerta,
      etiqueta: 'Pagos por vencer o vencidos',
    },
  ];

  return (
    <>
      <h1>¡Hola, {user?.nombre}! 👋</h1>
      <p className="sub">Acá tenés un resumen de tu actividad como entrenador.</p>
      {error && <p className="error">{error}</p>}

      {tarjetas && (
        <div className="stats">
          {tarjetas.map((t) => (
            <div className="stat" key={t.etiqueta}>
              <div className={`icono ${t.color}`}>{t.icono}</div>
              <div>
                <div className="numero">{t.numero}</div>
                <div className="etiqueta">{t.etiqueta}</div>
                {t.extra && <div className="extra">{t.extra}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="encabezado-card">
          <h3>Clientes recientes</h3>
          <Link to="/clientes">Ver todos</Link>
        </div>
        {!datos || datos.recientes.length === 0 ? (
          <p className="sub">Todavía no cargaste clientes.</p>
        ) : (
          <ul className="lista">
            {datos.recientes.map((c) => (
              <li key={c.id}>
                <div className="persona">
                  <Avatar nombre={c.nombre} />
                  <div>
                    <strong>{c.nombre}</strong>
                    <div className="sub">{c.email}</div>
                  </div>
                </div>
                <div className="actividad">
                  <div className="barra">
                    <div style={{ width: `${Math.min(100, (c.sesiones / META_SESIONES) * 100)}%` }} />
                  </div>
                  <span className="sub">{c.sesiones} de {META_SESIONES} días en 30 días</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3>Pagos por vencer o vencidos</h3>
        <Alertas />
      </div>
    </>
  );
}