import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

const texto = (a) => {
  if (a.estado === 'vencida') return `Venció hace ${-a.dias} ${a.dias === -1 ? 'día' : 'días'}`;
  if (a.dias === 0) return 'Vence hoy';
  return `Vence en ${a.dias} ${a.dias === 1 ? 'día' : 'días'}`;
};

export default function AlertasRutinas() {
  const [alertas, setAlertas] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/routines/alerts').then(setAlertas).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="error">{error}</p>;

  if (alertas.length === 0) {
    return <p className="sub">Todas las rutinas están al día. ✅</p>;
  }

  return (
    <ul className="lista">
      {alertas.map((a) => (
        <li key={`${a.tipo}-${a.id}`}>
          <div>
            <strong>{a.nombre}</strong>
            <div className="sub">{a.tipo === 'grupo' ? 'Grupo' : 'Cliente'} · {a.estado === 'vencida' ? 'terminó' : 'termina'} el {a.vence}</div>
          </div>
          <span className={`badge ${a.estado === 'vencida' ? 'vencido' : 'por-vencer'}`}>{texto(a)}</span>
        </li>
      ))}
    </ul>
  );
}