import { useEffect, useState } from 'react';

// Hace que un número "cuente" desde 0 hasta su valor
export default function useContador(objetivo, duracion = 400) {
  const [valor, setValor] = useState(0);
  const reducido =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reducido) return;
    let inicio;
    let id;
    const paso = (t) => {
      if (inicio === undefined) inicio = t;
      const progreso = Math.min((t - inicio) / duracion, 1);
      setValor(Math.round(objetivo * (1 - Math.pow(1 - progreso, 3))));
      if (progreso < 1) id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [objetivo, duracion, reducido]);

  return reducido ? objetivo : valor;
}