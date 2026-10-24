import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardList, Dumbbell, LayoutDashboard, LogOut, TrendingUp, Users, UsersRound, Wallet,
} from 'lucide-react';

const SOLO_ENTRENADOR = ['/clientes', '/grupos', '/ejercicios', '/rutinas', '/pagos'];
const SOLO_CLIENTE = ['/mis-rutinas', '/mi-progreso'];

export default function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token || !user) return <Navigate to="/login" />;

  const esEntrenador = user.rol === 'entrenador';

  if (!esEntrenador && SOLO_ENTRENADOR.some((p) => pathname.startsWith(p))) {
    return <Navigate to="/mis-rutinas" />;
  }
  if (esEntrenador && SOLO_CLIENTE.includes(pathname)) {
    return <Navigate to="/panel" />;
  }

  const salir = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2 className="marca"><Dumbbell size={24} /> FitCoach</h2>
        {esEntrenador ? (
          <>
            <NavLink to="/panel"><LayoutDashboard size={18} /> Inicio</NavLink>
            <NavLink to="/clientes"><Users size={18} /> Clientes</NavLink>
            <NavLink to="/grupos"><UsersRound size={18} /> Grupos</NavLink>
            <NavLink to="/ejercicios"><Dumbbell size={18} /> Ejercicios</NavLink>
            <NavLink to="/rutinas"><ClipboardList size={18} /> Rutinas</NavLink>
            <NavLink to="/pagos"><Wallet size={18} /> Pagos</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/mis-rutinas"><ClipboardList size={18} /> Mis rutinas</NavLink>
            <NavLink to="/mi-progreso"><TrendingUp size={18} /> Mi progreso</NavLink>
          </>
        )}
        <div className="usuario">
          <strong>{user.nombre}</strong>
          <span>{esEntrenador ? 'Entrenador' : 'Cliente'}</span>
        </div>
        <button className="salir" onClick={salir}><LogOut size={16} /> Cerrar sesión</button>
      </aside>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}