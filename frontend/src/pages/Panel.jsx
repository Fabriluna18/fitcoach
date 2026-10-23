export default function Panel() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <>
      <h1>¡Hola, {user?.nombre}! 👋</h1>
      <p>Desde acá gestionás tus clientes y tus grupos de entrenamiento.</p>
    </>
  );
}