import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const formatearFecha = (iso) => {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
};

export default function EvolucionChart({ datos }) {
  const ejercicios = [];
  datos.forEach((d) => {
    if (!ejercicios.some((e) => e.id === d.exercise_id)) {
      ejercicios.push({ id: d.exercise_id, nombre: d.ejercicio });
    }
  });

  const [elegido, setElegido] = useState('');
  const idActual = elegido || (ejercicios[0] ? String(ejercicios[0].id) : '');

  if (ejercicios.length === 0) {
    return <p className="sub">Todavía no hay pesos registrados para graficar.</p>;
  }

  const puntos = datos
    .filter((d) => String(d.exercise_id) === idActual)
    .map((d) => ({ fecha: formatearFecha(d.fecha), peso: d.peso }));

  const primero = puntos[0].peso;
  const ultimo = puntos[puntos.length - 1].peso;
  const diferencia = ultimo - primero;

  return (
    <>
      <div className="fila-form" style={{ marginBottom: 12 }}>
        <select value={idActual} onChange={(e) => setElegido(e.target.value)}>
          {ejercicios.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
      </div>

      <p className="sub">
        {puntos.length > 1
          ? `De ${primero} kg a ${ultimo} kg (${diferencia >= 0 ? '+' : ''}${diferencia} kg)`
          : `Un solo registro: ${ultimo} kg. Con más sesiones se arma la línea.`}
      </p>

      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={puntos} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" />
            <XAxis dataKey="fecha" />
            <YAxis unit=" kg" domain={['dataMin - 5', 'dataMax + 5']} />
            <Tooltip formatter={(valor) => [`${valor} kg`, 'Peso']} />
            <Line type="monotone" dataKey="peso" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}