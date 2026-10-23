import { Navigate } from 'react-router-dom';

export default function Panel() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (user?.rol === 'cliente') return <Navigate to="/mis-rutinas" />;

  return (
    <>
      <h1>¡Hola, {user?.nombre}! 👋</h1>
      <p>Desde acá gestionás tus clientes y tus grupos de entrenamiento.</p>
    </>
  );
}