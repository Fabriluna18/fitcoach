import { useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiFetch } from '../api/client';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function ProgresoGeneralChart() {
  const [meses, setMeses] = useState('6');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    apiFetch(`/stats/general?meses=${meses}`)
      .then((r) => {
        if (!vigente) return;
        setError('');
        setDatos(r.map((p) => ({ ...p, etiqueta: MESES[Number(p.fin.slice(5, 7)) - 1] })));
      })
      .catch((err) => {
        if (vigente) setError(err.message);
      });
    return () => {
      vigente = false;
    };
  }, [meses]);

  const hayDatos = datos && datos.some((p) => p.adherencia > 0 || p.progreso !== null);

  return (
    <div className="card">
      <div className="encabezado-card">
        <h3>Progreso general</h3>
        <select className="select-periodo" value={meses} onChange={(e) => setMeses(e.target.value)}>
          <option value="3">Últimos 3 meses</option>
          <option value="6">Últimos 6 meses</option>
          <option value="12">Últimos 12 meses</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      {!datos && !error ? (
        <p className="sub">Cargando...</p>
      ) : datos && !hayDatos ? (
        <p className="sub">Todavía no hay sesiones registradas para armar el gráfico.</p>
      ) : datos ? (
        <>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={datos} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" />
                <XAxis dataKey="etiqueta" />
                <YAxis unit="%" domain={[0, (max) => Math.max(20, Math.ceil(max / 20) * 20)]} />
                <Tooltip formatter={(valor, nombre) => [`${valor}%`, nombre]} />
                <Legend />
                <Line
                  type="monotone" dataKey="adherencia" name="Adherencia"
                  stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }}
                />
                <Line
                  type="monotone" dataKey="progreso" name="Progreso promedio"
                  stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="ayuda-grafico">
            Adherencia: días entrenados en los 30 días previos, sobre una meta de 12. Progreso promedio: cuánto subió
            el mejor peso de cada ejercicio respecto del primer registro.
          </p>
        </>
      ) : null}
    </div>
  );
}