import { useState } from 'react';
import { apiFetch } from '../api/client';
import { subirArchivo } from '../api/subir';
import Avatar from '../components/Avatar';

const MAX_MB = 5;

export default function Ajustes() {
  const inicial = JSON.parse(localStorage.getItem('user') || 'null');
  const esEntrenador = inicial?.rol === 'entrenador';

  const [foto, setFoto] = useState(inicial?.foto_url || null);
  const [progreso, setProgreso] = useState(null);
  const [nombre, setNombre] = useState(inicial?.nombre || '');
  const [claves, setClaves] = useState({ actual: '', nueva: '', repetir: '' });
  const [errorFoto, setErrorFoto] = useState('');
  const [okFoto, setOkFoto] = useState('');
  const [errorPerfil, setErrorPerfil] = useState('');
  const [okPerfil, setOkPerfil] = useState('');
  const [errorClave, setErrorClave] = useState('');
  const [okClave, setOkClave] = useState('');

  const actualizarLocal = (cambios) => {
    const actual = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...actual, ...cambios }));
    window.dispatchEvent(new Event('user-actualizado'));
  };

  const guardarFoto = async (foto_url) => {
    const respuesta = await apiFetch('/auth/me/foto', {
      method: 'PUT',
      body: JSON.stringify({ foto_url }),
    });
    actualizarLocal({ foto_url: respuesta.foto_url });
    setFoto(respuesta.foto_url);
  };

  const elegirFoto = async (e) => {
    const archivo = e.target.files[0];
    e.target.value = '';
    if (!archivo) return;

    setErrorFoto('');
    setOkFoto('');
    if (!archivo.type.startsWith('image/')) {
      setErrorFoto('Elegí una imagen (JPG, PNG o WebP)');
      return;
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      setErrorFoto(`La imagen pesa más de ${MAX_MB} MB`);
      return;
    }

    setProgreso(0);
    try {
      const url = await subirArchivo(archivo, 'imagen', setProgreso);
      await guardarFoto(url);
      setOkFoto('Foto actualizada');
    } catch (err) {
      setErrorFoto(err.message);
    } finally {
      setProgreso(null);
    }
  };

  const quitarFoto = async () => {
    setErrorFoto('');
    setOkFoto('');
    try {
      await guardarFoto(null);
      setOkFoto('Foto quitada');
    } catch (err) {
      setErrorFoto(err.message);
    }
  };

  const guardarPerfil = async (e) => {
    e.preventDefault();
    setErrorPerfil('');
    setOkPerfil('');
    try {
      const usuario = await apiFetch('/auth/me', { method: 'PUT', body: JSON.stringify({ nombre }) });
      actualizarLocal({ nombre: usuario.nombre });
      setNombre(usuario.nombre);
      setOkPerfil('Nombre actualizado');
    } catch (err) {
      setErrorPerfil(err.message);
    }
  };

  const cambiarClave = async (e) => {
    e.preventDefault();
    setErrorClave('');
    setOkClave('');

    if (claves.nueva !== claves.repetir) {
      setErrorClave('Las dos contraseñas nuevas no coinciden');
      return;
    }
    try {
      await apiFetch('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ actual: claves.actual, nueva: claves.nueva }),
      });
      setClaves({ actual: '', nueva: '', repetir: '' });
      setOkClave('Contraseña actualizada. La próxima vez que entres, usá la nueva.');
    } catch (err) {
      setErrorClave(err.message);
    }
  };

  const cambiarCampo = (campo) => (e) => setClaves({ ...claves, [campo]: e.target.value });

  return (
    <>
      <h1>Ajustes</h1>

      {esEntrenador && (
        <div className="card">
          <h3>Mi foto o logo</h3>
          <p className="sub">Es la imagen que ven tus clientes junto a tu nombre. Podés usar una foto tuya o el logo de tu marca.</p>
          {errorFoto && <p className="error">{errorFoto}</p>}
          {okFoto && <p className="ok">{okFoto}</p>}
          <div className="foto-ajustes">
            <Avatar nombre={inicial?.nombre || 'Entrenador'} foto={foto} size={96} />
            <div className="acciones">
              <label className="btn-chico archivo">
                {foto ? 'Cambiar foto' : 'Subir foto'}
                <input type="file" accept="image/*" onChange={elegirFoto} disabled={progreso !== null} />
              </label>
              {foto && <button className="btn-peligro" onClick={quitarFoto}>Quitar</button>}
            </div>
          </div>
          {progreso !== null && (
            <>
              <div className="progreso-subida" style={{ marginTop: 12 }}><div style={{ width: `${progreso}%` }} /></div>
              <span className="sub">Subiendo... {progreso}%</span>
            </>
          )}
        </div>
      )}

      <div className="card">
        <h3>Mi perfil</h3>
        {errorPerfil && <p className="error">{errorPerfil}</p>}
        {okPerfil && <p className="ok">{okPerfil}</p>}
        <form className="form-ajustes" onSubmit={guardarPerfil}>
          <label className="campo">
            Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} minLength={2} maxLength={100} required />
          </label>
          <label className="campo">
            Email
            <input value={inicial?.email || ''} disabled />
          </label>
          <div>
            <button className="btn" type="submit">Guardar nombre</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Cambiar contraseña</h3>
        {errorClave && <p className="error">{errorClave}</p>}
        {okClave && <p className="ok">{okClave}</p>}
        <form className="form-ajustes" onSubmit={cambiarClave}>
          <label className="campo">
            Contraseña actual
            <input type="password" value={claves.actual} onChange={cambiarCampo('actual')} autoComplete="current-password" required />
          </label>
          <label className="campo">
            Contraseña nueva (mínimo 6)
            <input type="password" value={claves.nueva} onChange={cambiarCampo('nueva')} minLength={6} maxLength={72} autoComplete="new-password" required />
          </label>
          <label className="campo">
            Repetí la contraseña nueva
            <input type="password" value={claves.repetir} onChange={cambiarCampo('repetir')} minLength={6} maxLength={72} autoComplete="new-password" required />
          </label>
          <div>
            <button className="btn" type="submit">Cambiar contraseña</button>
          </div>
        </form>
      </div>
    </>
  );
}