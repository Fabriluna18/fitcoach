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

export default function Topbar({ user, esEntrenador }) {
  const [abierto, setAbierto] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!esEntrenador) return;
    apiFetch('/payments/alerts').then(setAlertas).catch(() => {});
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
              {alertas.length > 0 && <span className="punto">{alertas.length}</span>}
            </button>
            {abierto === 'campana' && (
              <div className="menu-flotante ancho">
                <strong>Notificaciones</strong>
                {alertas.length === 0 ? (
                  <p className="sub">No hay avisos nuevos.</p>
                ) : (
                  <ul className="lista">
                    {alertas.map((a) => (
                      <li key={`${a.tipo}-${a.id}`}>
                        <div>
                          <strong>{a.nombre}</strong>
                          <div className="sub">
                            Pago {a.dias < 0 ? 'vencido' : 'por vencer'} · {a.vence}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button className="btn-chico" onClick={() => ir('/pagos')}>Ver pagos</button>
              </div>
            )}
          </div>
        </>
      )}
      <Avatar nombre={user.nombre} size={40} />
    </div>
  );
}