import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

const textoDias = (dias) => {
  if (dias < 0) return `Vencido hace ${-dias} ${dias === -1 ? 'día' : 'días'}`;
  if (dias === 0) return 'Vence hoy';
  return `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`;
};

export default function Alertas({ refresco = 0 }) {
  const [alertas, setAlertas] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/payments/alerts').then(setAlertas).catch((err) => setError(err.message));
  }, [refresco]);

  if (error) return <p className="error">{error}</p>;

  if (alertas.length === 0) {
    return <p className="sub">Todos los pagos están al día. ✅</p>;
  }

  return (
    <ul className="lista">
      {alertas.map((a) => (
        <li key={`${a.tipo}-${a.id}`}>
          <div>
            <strong>{a.nombre}</strong>
            <div className="sub">{a.tipo === 'grupo' ? 'Grupo' : 'Cliente'} · vence el {a.vence}</div>
          </div>
          <span className={`badge ${a.dias < 0 ? 'vencido' : 'por-vencer'}`}>{textoDias(a.dias)}</span>
        </li>
      ))}
    </ul>
  );
}