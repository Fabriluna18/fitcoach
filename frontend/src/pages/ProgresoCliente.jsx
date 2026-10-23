import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import EvolucionChart from '../components/EvolucionChart';

export default function ProgresoCliente() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch(`/clients/${id}/progress`).then(setData).catch((err) => setError(err.message));
  }, [id]);

  return (
    <>
      <p><Link to="/clientes">← Volver a clientes</Link></p>
      <h1>Progreso{data ? ` de ${data.cliente}` : ''}</h1>
      {error && <p className="error">{error}</p>}

      {data && (
        <div className="card">
          <h3>Evolución de peso</h3>
          <EvolucionChart datos={data.datos} />
        </div>
      )}
    </>
  );
}