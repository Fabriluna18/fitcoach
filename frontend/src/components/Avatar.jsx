const COLORES = ['#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#db2777'];

export default function Avatar({ nombre }) {
  const iniciales = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  let suma = 0;
  for (const letra of nombre) suma += letra.charCodeAt(0);

  return (
    <div className="avatar" style={{ background: COLORES[suma % COLORES.length] }}>
      {iniciales}
    </div>
  );
}