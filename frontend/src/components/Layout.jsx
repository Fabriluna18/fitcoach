import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';

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
        <h2>FitCoach</h2>
        {esEntrenador ? (
          <>
            <NavLink to="/panel">Inicio</NavLink>
            <NavLink to="/clientes">Clientes</NavLink>
            <NavLink to="/grupos">Grupos</NavLink>
            <NavLink to="/ejercicios">Ejercicios</NavLink>
            <NavLink to="/rutinas">Rutinas</NavLink>
            <NavLink to="/pagos">Pagos</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/mis-rutinas">Mis rutinas</NavLink>
            <NavLink to="/mi-progreso">Mi progreso</NavLink>
          </>
        )}
        <button className="salir" onClick={salir}>Cerrar sesión</button>
      </aside>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}