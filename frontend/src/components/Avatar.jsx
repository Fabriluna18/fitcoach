import { useState } from 'react';

const COLORES = ['#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#db2777'];

export default function Avatar({ nombre, avatar, size = 42 }) {
  const [fallo, setFallo] = useState(false);

  if (avatar && !fallo) {
    return (
      <img
        className="avatar"
        src={`/avatars/${avatar}.png`}
        alt={nombre}
        style={{ width: size, height: size, objectFit: 'cover' }}
        onError={() => setFallo(true)}
      />
    );
  }

  const iniciales = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  let suma = 0;
  for (const letra of nombre) suma += letra.charCodeAt(0);

  return (
    <div
      className="avatar"
      style={{ background: COLORES[suma % COLORES.length], width: size, height: size, fontSize: size * 0.38 }}
    >
      {iniciales}
    </div>
  );
}