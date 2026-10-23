import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

export default function Ejercicios() {
  const [ejercicios, setEjercicios] = useState([]);
  const [form, setForm] = useState({ nombre: '', musculo: '', descripcion: '' });
  const [error, setError] = useState('');

  const recargar = () =>
    apiFetch('/exercises').then(setEjercicios).catch((err) => setError(err.message));

  useEffect(() => {
    apiFetch('/exercises').then(setEjercicios).catch((err) => setError(err.message));
  }, []);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const crear = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/exercises', { method: 'POST', body: JSON.stringify(form) });
      setForm({ nombre: '', musculo: '', descripcion: '' });
      recargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const borrar = async (id) => {
    setError('');
    try {
      await apiFetch(`/exercises/${id}`, { method: 'DELETE' });
      recargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1>Ejercicios</h1>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Nuevo ejercicio</h3>
        <form className="fila-form" onSubmit={crear}>
          <input name="nombre" placeholder="Nombre" value={form.nombre} onChange={cambiar} required />
          <input name="musculo" placeholder="Músculo (ej: Piernas)" value={form.musculo} onChange={cambiar} />
          <input name="descripcion" placeholder="Descripción (opcional)" value={form.descripcion} onChange={cambiar} />
          <button className="btn" type="submit">Agregar</button>
        </form>
      </div>

      <div className="card">
        <h3>Mi biblioteca ({ejercicios.length})</h3>
        {ejercicios.length === 0 ? (
          <p className="sub">Todavía no cargaste ejercicios.</p>
        ) : (
          <ul className="lista">
            {ejercicios.map((ej) => (
              <li key={ej.id}>
                <div>
                  <strong>{ej.nombre}</strong>
                  <div className="sub">{ej.musculo || 'Sin músculo'}{ej.descripcion ? ` · ${ej.descripcion}` : ''}</div>
                </div>
                <button className="btn-peligro" onClick={() => borrar(ej.id)}>Borrar</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}