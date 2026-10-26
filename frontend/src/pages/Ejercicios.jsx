import { useEffect, useState } from 'react';
import { Video } from 'lucide-react';
import { apiFetch } from '../api/client';
import EditorVideo from '../components/EditorVideo';
import VideoBoton from '../components/VideoBoton';

export default function Ejercicios() {
  const [ejercicios, setEjercicios] = useState([]);
  const [form, setForm] = useState({ nombre: '', musculo: '', descripcion: '' });
  const [editando, setEditando] = useState(null);
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
        <p className="sub">Después de crearlo, tocá <strong>Video</strong> para sumarle un link o subir tu propio video.</p>
      </div>

      <div className="card">
        <h3>Mi biblioteca ({ejercicios.length})</h3>
        {ejercicios.length === 0 ? (
          <p className="sub">Todavía no cargaste ejercicios.</p>
        ) : (
          <ul className="lista">
            {ejercicios.map((ej) => (
              <li key={ej.id} style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <strong>{ej.nombre}</strong>
                    <VideoBoton url={ej.video_url} tipo={ej.video_tipo} titulo={ej.nombre} />
                    <div className="sub">{ej.musculo || 'Sin músculo'}{ej.descripcion ? ` · ${ej.descripcion}` : ''}</div>
                  </div>
                  <div className="acciones">
                    <button className="btn-chico con-icono" onClick={() => setEditando(editando === ej.id ? null : ej.id)}>
                      <Video size={14} /> {ej.video_url ? 'Cambiar video' : 'Video'}
                    </button>
                    <button className="btn-peligro" onClick={() => borrar(ej.id)}>Borrar</button>
                  </div>
                </div>
                {editando === ej.id && (
                  <EditorVideo ejercicio={ej} onCambio={recargar} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}