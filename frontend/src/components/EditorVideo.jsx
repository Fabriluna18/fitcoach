import { useState } from 'react';
import { apiFetch } from '../api/client';
import { subirArchivo } from '../api/subir';

const MAX_MB = 50;

export default function EditorVideo({ ejercicio, onCambio }) {
  const [link, setLink] = useState(ejercicio.video_tipo === 'link' ? ejercicio.video_url : '');
  const [progreso, setProgreso] = useState(null);
  const [error, setError] = useState('');

  const guardar = async (video_url, video_tipo) => {
    await apiFetch(`/exercises/${ejercicio.id}/video`, {
      method: 'PUT',
      body: JSON.stringify({ video_url, video_tipo }),
    });
    onCambio();
  };

  const guardarLink = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await guardar(link.trim(), 'link');
    } catch (err) {
      setError(err.message);
    }
  };

  const quitar = async () => {
    setError('');
    try {
      setLink('');
      await guardar(null, null);
    } catch (err) {
      setError(err.message);
    }
  };

  const elegirArchivo = async (e) => {
    const archivo = e.target.files[0];
    e.target.value = '';
    if (!archivo) return;

    setError('');
    if (!archivo.type.startsWith('video/')) {
      setError('Elegí un archivo de video');
      return;
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      setError(`El video pesa más de ${MAX_MB} MB. Probá recortarlo o comprimirlo.`);
      return;
    }

    setProgreso(0);
    try {
      const url = await subirArchivo(archivo, 'video', setProgreso);
      await guardar(url, 'archivo');
    } catch (err) {
      setError(err.message);
    } finally {
      setProgreso(null);
    }
  };

  return (
    <div className="editor-video">
      {error && <p className="error">{error}</p>}

      <form className="fila-form" onSubmit={guardarLink}>
        <input type="url" placeholder="Pegá un link (YouTube u otro)" value={link}
          onChange={(e) => setLink(e.target.value)} required />
        <button className="btn-chico" type="submit">Guardar link</button>
      </form>

      <div className="acciones">
        <label className="btn-chico archivo">
          Subir mi video
          <input type="file" accept="video/*" onChange={elegirArchivo} disabled={progreso !== null} />
        </label>
        {ejercicio.video_url && (
          <button type="button" className="btn-peligro" onClick={quitar}>Quitar video</button>
        )}
      </div>

      {progreso !== null && (
        <>
          <div className="progreso-subida"><div style={{ width: `${progreso}%` }} /></div>
          <span className="sub">Subiendo... {progreso}%</span>
        </>
      )}
      <span className="sub">Máximo {MAX_MB} MB. Si el video es largo, conviene subirlo a YouTube como "no listado" y pegar el link.</span>
    </div>
  );
}