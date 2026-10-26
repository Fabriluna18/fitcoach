import { useState } from 'react';
import { apiFetch } from '../api/client';
import { subirArchivo } from '../api/subir';
import Avatar from '../components/Avatar';

const MAX_MB = 5;

export default function Ajustes() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [foto, setFoto] = useState(user?.foto_url || null);
  const [progreso, setProgreso] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const guardar = async (foto_url) => {
    const respuesta = await apiFetch('/auth/me/foto', {
      method: 'PUT',
      body: JSON.stringify({ foto_url }),
    });
    const actual = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...actual, foto_url: respuesta.foto_url }));
    window.dispatchEvent(new Event('user-actualizado'));
    setFoto(respuesta.foto_url);
  };

  const elegir = async (e) => {
    const archivo = e.target.files[0];
    e.target.value = '';
    if (!archivo) return;

    setError('');
    setOk('');
    if (!archivo.type.startsWith('image/')) {
      setError('Elegí una imagen (JPG, PNG o WebP)');
      return;
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      setError(`La imagen pesa más de ${MAX_MB} MB`);
      return;
    }

    setProgreso(0);
    try {
      const url = await subirArchivo(archivo, 'imagen', setProgreso);
      await guardar(url);
      setOk('Foto actualizada');
    } catch (err) {
      setError(err.message);
    } finally {
      setProgreso(null);
    }
  };

  const quitar = async () => {
    setError('');
    setOk('');
    try {
      await guardar(null);
      setOk('Foto quitada');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1>Ajustes</h1>
      {error && <p className="error">{error}</p>}
      {ok && <p className="ok">{ok}</p>}

      <div className="card">
        <h3>Mi foto o logo</h3>
        <p className="sub">Es la imagen que ven tus clientes junto a tu nombre. Podés usar una foto tuya o el logo de tu marca.</p>
        <div className="foto-ajustes">
          <Avatar nombre={user?.nombre || 'Entrenador'} foto={foto} size={96} />
          <div className="acciones">
            <label className="btn-chico archivo">
              {foto ? 'Cambiar foto' : 'Subir foto'}
              <input type="file" accept="image/*" onChange={elegir} disabled={progreso !== null} />
            </label>
            {foto && <button className="btn-peligro" onClick={quitar}>Quitar</button>}
          </div>
        </div>
        {progreso !== null && (
          <>
            <div className="progreso-subida" style={{ marginTop: 12 }}><div style={{ width: `${progreso}%` }} /></div>
            <span className="sub">Subiendo... {progreso}%</span>
          </>
        )}
      </div>
    </>
  );
}