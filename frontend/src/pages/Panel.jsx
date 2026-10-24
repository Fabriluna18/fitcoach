import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarClock, ClipboardList, Plus, Users, UsersRound } from 'lucide-react';
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

  const hayActividad = datos && datos.semanas.some((s) => s.sesiones > 0);
  const ultima = datos?.ultima_rutina;

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

      <div className="paneles">
        <div className="card">
          <h3>Actividad de tus clientes</h3>
          <p className="sub">Sesiones de entrenamiento registradas por semana.</p>
          {!datos || !hayActividad ? (
            <p className="sub">Todavía no hay sesiones registradas por tus clientes.</p>
          ) : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={datos.semanas} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" />
                  <XAxis dataKey="semana" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(valor) => [valor, 'Sesiones']} labelFormatter={(l) => `Semana del ${l}`} />
                  <Line type="monotone" dataKey="sesiones" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <div className="encabezado-card">
            <h3>Grupos de entrenamiento</h3>
            <Link to="/grupos">Ver todos</Link>
          </div>
          {!datos || datos.grupos_lista.length === 0 ? (
            <p className="sub">Todavía no creaste grupos.</p>
          ) : (
            <ul className="lista">
              {datos.grupos_lista.map((g) => (
                <li key={g.id}>
                  <div className="persona">
                    <div className="icono verde mini"><UsersRound size={18} /></div>
                    <div>
                      <strong>{g.nombre}</strong>
                      <div className="sub">{g.miembros} {g.miembros === 1 ? 'miembro' : 'miembros'}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/grupos" className="btn-borde"><Plus size={16} /> Crear nuevo grupo</Link>
        </div>

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
      </div>

      <div className="card">
        <div className="encabezado-card">
          <h3>Última rutina creada</h3>
          <Link to="/rutinas">Ver todas</Link>
        </div>
        {!ultima ? (
          <p className="sub">Todavía no creaste rutinas.</p>
        ) : (
          <>
            <p className="sub">
              <strong>{ultima.nombre}</strong> · {ultima.cliente ? `Cliente: ${ultima.cliente}` : `Grupo: ${ultima.grupo}`}
            </p>
            <table className="tabla">
              <thead>
                <tr><th>Ejercicio</th><th>Series</th><th>Repeticiones</th><th>Peso sugerido</th></tr>
              </thead>
              <tbody>
                {ultima.ejercicios.map((e, i) => (
                  <tr key={i}>
                    <td>{e.nombre}</td>
                    <td>{e.series}</td>
                    <td>{e.repeticiones}</td>
                    <td>{e.peso_sugerido ? `${Number(e.peso_sugerido)} kg` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
}