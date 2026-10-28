import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays, ClipboardList, Dumbbell, LayoutDashboard, LayoutGrid, LogOut,
  MessageCircle, Settings, TrendingUp, Users, UsersRound, Wallet,
} from 'lucide-react';
import Avatar from './Avatar';
import Topbar from './Topbar';
import useNoLeidos from '../hooks/useNoLeidos';

const MENU_ENTRENADOR = [
  { to: '/panel', texto: 'Inicio', icono: LayoutDashboard },
  { to: '/clientes', texto: 'Clientes', icono: Users },
  { to: '/grupos', texto: 'Grupos', icono: UsersRound },
  { to: '/rutinas', texto: 'Rutinas', icono: ClipboardList },
  { to: '/ejercicios', texto: 'Ejercicios', icono: Dumbbell },
  { to: '/progreso', texto: 'Progreso', icono: TrendingUp },
  { to: '/mensajes', texto: 'Mensajes', icono: MessageCircle },
  { to: '/calendario', texto: 'Calendario', icono: CalendarDays },
  { to: '/pagos', texto: 'Pagos', icono: Wallet },
  { to: '/ajustes', texto: 'Ajustes', icono: Settings },
];

const MENU_CLIENTE = [
  { to: '/mis-rutinas', texto: 'Mis rutinas', icono: ClipboardList },
  { to: '/mis-citas', texto: 'Mis citas', icono: CalendarDays },
  { to: '/mensajes', texto: 'Mensajes', icono: MessageCircle },
  { to: '/mi-progreso', texto: 'Mi progreso', icono: TrendingUp },
];

const PRINCIPALES_MOVIL = ['/panel', '/clientes', '/rutinas', '/pagos'];
const SOLO_ENTRENADOR = [
  '/clientes', '/grupos', '/ejercicios', '/rutinas', '/pagos',
  '/progreso', '/calendario', '/ajustes',
];
const SOLO_CLIENTE = ['/mis-rutinas', '/mi-progreso', '/mis-citas'];

export default function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [masAbierto, setMasAbierto] = useState(false);
  const [, refrescar] = useState(0);
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const esEntrenador = user?.rol === 'entrenador';
  const noLeidos = useNoLeidos(
    esEntrenador ? '/messages/resumen' : '/me/messages/resumen',
    Boolean(token && user)
  );

  useEffect(() => {
    const alActualizar = () => refrescar((n) => n + 1);
    window.addEventListener('user-actualizado', alActualizar);
    return () => window.removeEventListener('user-actualizado', alActualizar);
  }, []);

  if (!token || !user) return <Navigate to="/login" />;

  if (!esEntrenador && SOLO_ENTRENADOR.some((p) => pathname.startsWith(p))) {
    return <Navigate to="/mis-rutinas" />;
  }
  if (esEntrenador && SOLO_CLIENTE.includes(pathname)) {
    return <Navigate to="/panel" />;
  }

  const menu = esEntrenador ? MENU_ENTRENADOR : MENU_CLIENTE;
  const principales = esEntrenador ? menu.filter((i) => PRINCIPALES_MOVIL.includes(i.to)) : menu;
  const secundarios = esEntrenador ? menu.filter((i) => !PRINCIPALES_MOVIL.includes(i.to)) : [];

  const salir = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2 className="marca"><Dumbbell size={24} /> FitCoach</h2>
        {menu.map(({ to, texto, icono: Icono }) => (
          <NavLink key={to} to={to}>
            <Icono size={18} /> {texto}
            {to === '/mensajes' && noLeidos > 0 && <span className="badge-menu">{noLeidos}</span>}
          </NavLink>
        ))}
        <div className="usuario">
          <Avatar nombre={user.nombre} foto={user.foto_url} size={36} />
          <div>
            <strong>{user.nombre}</strong>
            <span>{esEntrenador ? 'Entrenador' : 'Cliente'}</span>
          </div>
        </div>
        <button className="salir" onClick={salir}><LogOut size={16} /> Cerrar sesión</button>
      </aside>

      <main className="contenido">
        <Topbar user={user} esEntrenador={esEntrenador} noLeidos={noLeidos} />
        <div className="pagina" key={pathname}>
          <Outlet />
        </div>
      </main>

      <nav className="nav-movil">
        {principales.map(({ to, texto, icono: Icono }) => (
          <NavLink key={to} to={to} onClick={() => setMasAbierto(false)}>
            <Icono size={20} /><span>{texto}</span>
            {to === '/mensajes' && noLeidos > 0 && <span className="badge-menu flotante">{noLeidos}</span>}
          </NavLink>
        ))}
        {secundarios.length > 0 ? (
          <button onClick={() => setMasAbierto(!masAbierto)}>
            <LayoutGrid size={20} /><span>Más</span>
            {noLeidos > 0 && <span className="badge-menu flotante">{noLeidos}</span>}
          </button>
        ) : (
          <button onClick={salir}><LogOut size={20} /><span>Salir</span></button>
        )}
      </nav>

      {masAbierto && (
        <div className="hoja-movil">
          {secundarios.map(({ to, texto, icono: Icono }) => (
            <NavLink key={to} to={to} onClick={() => setMasAbierto(false)}>
              <Icono size={18} /> {texto}
              {to === '/mensajes' && noLeidos > 0 && <span className="badge-menu">{noLeidos}</span>}
            </NavLink>
          ))}
          <button onClick={salir}><LogOut size={18} /> Cerrar sesión</button>
        </div>
      )}
    </div>
  );
}