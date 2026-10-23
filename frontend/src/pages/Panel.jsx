import { Navigate, useNavigate } from 'react-router-dom';

export default function Panel() {
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
    <div className="auth">
      <h1>¡Hola, {user.nombre}! 👋</h1>
      <p>Rol: {user.rol}</p>
      <button onClick={salir}>Cerrar sesión</button>
    </div>
  );
}