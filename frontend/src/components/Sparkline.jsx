import { useId } from 'react';

export default function Sparkline({ datos, color }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ancho = 200;
  const alto = 50;
  const margen = 4;

  const min = Math.min(...datos);
  const max = Math.max(...datos);
  const rango = max - min;

  const puntos = datos.map((v, i) => {
    const x = datos.length === 1 ? ancho / 2 : (i / (datos.length - 1)) * ancho;
    const y = rango === 0 ? alto / 2 : alto - margen - ((v - min) / rango) * (alto - margen * 2);
    return [x, y];
  });

  const linea = puntos
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const area = `${linea} L${ancho},${alto} L0,${alto} Z`;

  return (
    <svg className="sparkline" viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Evolución de los últimos 6 meses">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} className="sparkline-area" />
      <path
        d={linea} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" pathLength="1" className="sparkline-linea"
      />
    </svg>
  );
}