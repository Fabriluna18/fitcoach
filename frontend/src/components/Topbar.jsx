import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Plus } from 'lucide-react';
import { apiFetch } from '../api/client';
import Avatar from './Avatar';

const ACCIONES = [
  { texto: 'Cliente', to: '/clientes' },
  { texto: 'Grupo', to: '/grupos' },
  { texto: 'Rutina', to: '/rutinas' },
  { texto: 'Pago', to: '/pagos' },
  { texto: 'Cita', to: '/calendario' },
];

const textoRutina = (a) => {
  if (a.estado === 'vencida') return `Rutina vencida hace ${-a.dias} ${a.dias === -1 ? 'día' : 'días'}`;
  if (a.dias === 0) return 'Rutina vence hoy';
  return `Rutina vence en ${a.dias} ${a.dias === 1 ? 'día' : 'días'}`;
};

export default function Topbar({ user, esEntrenador }) {
  const [abierto, setAbierto] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!esEntrenador) return;
    Promise.all([
      apiFetch('/payments/alerts').catch(() => []),
      apiFetch('/routines/alerts').catch(() => []),
    ]).then(([p, r]) => {
      setPagos(p);
      setRutinas(r);
    });
  }, [esEntrenador]);

  useEffect(() => {
    const fuera = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(null);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  const ir = (to) => {
    setAbierto(null);
    navigate(to);
  };
  const alternar = (nombre) => setAbierto(abierto === nombre ? null : nombre);
  const total = pagos.length + rutinas.length;

  return (
    <div className="topbar" ref={ref}>
      {esEntrenador && (
        <>
          <div className="relativo">
            <button className="btn con-icono" onClick={() => alternar('anadir')}>
              <Plus size={16} /> Añadir <ChevronDown size={16} />
            </button>
            {abierto === 'anadir' && (
              <div className="menu-flotante">
                {ACCIONES.map((a) => (
                  <button key={a.to} onClick={() => ir(a.to)}>{a.texto}</button>
                ))}
              </div>
            )}
          </div>

          <div className="relativo">
            <button className="campana" onClick={() => alternar('campana')} aria-label="Notificaciones">
              <Bell size={20} />
              {total > 0 && <span className="punto">{total}</span>}
            </button>
            {abierto === 'campana' && (
              <div className="menu-flotante ancho">
                <strong>Notificaciones</strong>
                {total === 0 ? (
                  <p className="sub">No hay avisos nuevos.</p>
                ) : (
                  <ul className="lista">
                    {pagos.map((a) => (
                      <li key={`p-${a.tipo}-${a.id}`}>
                        <div>
                          <strong>{a.nombre}</strong>
                          <div className="sub">Pago {a.dias < 0 ? 'vencido' : 'por vencer'} · {a.vence}</div>
                        </div>
                      </li>
                    ))}
                    {rutinas.map((a) => (
                      <li key={`r-${a.tipo}-${a.id}`}>
                        <div>
                          <strong>{a.nombre}</strong>
                          <div className="sub">{textoRutina(a)} · {a.vence}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="acciones">
                  <button className="btn-chico" onClick={() => ir('/pagos')}>Ver pagos</button>
                  <button className="btn-chico" onClick={() => ir('/rutinas')}>Ver rutinas</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      <Avatar nombre={user.nombre} foto={user.foto_url} size={40} />
    </div>
  );
}