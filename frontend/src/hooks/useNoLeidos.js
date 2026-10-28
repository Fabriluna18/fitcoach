import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

// Consulta cada 30 segundos cuántos mensajes sin leer hay (solo si la pestaña está a la vista)
export default function useNoLeidos(ruta, activo) {
  const [total, setTotal] = useState(0);

  const cargar = useCallback(() => {
    apiFetch(ruta)
      .then((r) => setTotal(r.no_leidos))
      .catch(() => {});
  }, [ruta]);

  useEffect(() => {
    if (!activo) return;
    cargar();

    const siEstaVisible = () => {
      if (document.visibilityState === 'visible') cargar();
    };
    const id = setInterval(siEstaVisible, 30000);
    window.addEventListener('mensajes-actualizados', cargar);
    document.addEventListener('visibilitychange', siEstaVisible);

    return () => {
      clearInterval(id);
      window.removeEventListener('mensajes-actualizados', cargar);
      document.removeEventListener('visibilitychange', siEstaVisible);
    };
  }, [activo, cargar]);

  return total;
}