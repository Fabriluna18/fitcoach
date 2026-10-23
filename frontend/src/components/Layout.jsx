import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';

export default function Layout() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token || !user) return <Navigate to="/login" />;

  const salir = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>FitCoach</h2>
        <NavLink to="/panel">Inicio</NavLink>
        <NavLink to="/clientes">Clientes</NavLink>
        <NavLink to="/grupos">Grupos</NavLink>
        <NavLink to="/ejercicios">Ejercicios</NavLink>
        <NavLink to="/rutinas">Rutinas</NavLink>
        <button className="salir" onClick={salir}>Cerrar sesión</button>
      </aside>
      <main className="contenido">
        {user.rol === 'entrenador' ? (
          <Outlet />
        ) : (
          <p>Por ahora este panel es solo para entrenadores. La vista de clientes viene más adelante.</p>
        )}
      </main>
    </div>
  );
}