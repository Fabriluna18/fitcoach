import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import Avatar from '../components/Avatar';
import SelectorAvatar from '../components/SelectorAvatar';

const FORM_VACIO = { nombre: '', email: '', password: '', avatar: '' };

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [eliminando, setEliminando] = useState(null);
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const recargar = () =>
    apiFetch('/clients').then(setClientes).catch((err) => setError(err.message));

  useEffect(() => {
    apiFetch('/clients').then(setClientes).catch((err) => setError(err.message));
  }, []);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const crear = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      await apiFetch('/clients', { method: 'POST', body: JSON.stringify(form) });
      setForm(FORM_VACIO);
      recargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const cambiarEstado = async (cliente) => {
    setError('');
    setOk('');
    try {
      await apiFetch(`/clients/${cliente.id}`, {
        method: 'PUT',
        body: JSON.stringify({ activo: !cliente.activo }),
      });
      if (eliminando === cliente.id) setEliminando(null);
      recargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const abrirEliminar = (id) => {
    setEliminando(eliminando === id ? null : id);
    setConfirmacion('');
    setError('');
    setOk('');
  };

  const eliminar = async (cliente) => {
    setError('');
    setOk('');
    try {
      await apiFetch(`/clients/${cliente.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmar: confirmacion }),
      });
      setEliminando(null);
      setConfirmacion('');
      setOk(`${cliente.nombre} fue eliminado`);
      recargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1>Clientes</h1>
      {error && <p className="error">{error}</p>}
      {ok && <p className="ok">{ok}</p>}

      <div className="card">
        <h3>Nuevo cliente</h3>
        <form className="fila-form" onSubmit={crear}>
          <input name="nombre" placeholder="Nombre" value={form.nombre} onChange={cambiar} required />
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={cambiar} required />
          <input name="password" type="password" placeholder="Contraseña (mín. 6)" value={form.password} onChange={cambiar} required />
          <div className="selector-fila">
            <span className="sub">Avatar (opcional)</span>
            <SelectorAvatar valor={form.avatar} onChange={(a) => setForm({ ...form, avatar: a })} />
          </div>
          <button className="btn" type="submit">Agregar</button>
        </form>
      </div>

      <div className="card">
        <h3>Mis clientes ({clientes.length})</h3>
        <p className="sub">
          <strong>Dar de baja</strong> bloquea el acceso del cliente pero conserva todo su historial, y lo podés reactivar cuando quieras.
          <strong> Eliminar</strong> borra todo y solo está disponible para clientes dados de baja.
        </p>
        {clientes.length === 0 ? (
          <p className="sub">Todavía no cargaste clientes.</p>
        ) : (
          <ul className="lista">
            {clientes.map((c) => (
              <li key={c.id} className={c.activo ? '' : 'inactivo'} style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div className="persona">
                    <Avatar nombre={c.nombre} avatar={c.avatar} />
                    <div>
                      <strong>{c.nombre}</strong>
                      <div className="sub">{c.email}{c.activo ? '' : ' · De baja'}</div>
                    </div>
                  </div>
                  <div className="acciones">
                    <Link to={`/clientes/${c.id}/progreso`} className="btn-chico" style={{ textDecoration: 'none' }}>Ver progreso</Link>
                    <button className="btn-chico" onClick={() => cambiarEstado(c)}>
                      {c.activo ? 'Dar de baja' : 'Reactivar'}
                    </button>
                    {!c.activo && (
                      <button className="btn-peligro" onClick={() => abrirEliminar(c.id)}>Eliminar</button>
                    )}
                  </div>
                </div>

                {eliminando === c.id && (
                  <div className="panel-eliminar">
                    <strong>Esto borra a {c.nombre} para siempre.</strong>
                    <span className="sub">
                      Se eliminan su cuenta, sus rutinas, su progreso, sus mensajes y sus citas. Sus pagos quedan en el historial, sin nombre.
                      Para confirmar, escribí su nombre exacto: <strong>{c.nombre}</strong>
                    </span>
                    <input
                      placeholder="Nombre del cliente" value={confirmacion}
                      onChange={(e) => setConfirmacion(e.target.value)}
                    />
                    <div className="acciones">
                      <button className="btn-peligro" disabled={!confirmacion.trim()} onClick={() => eliminar(c)}>
                        Eliminar definitivamente
                      </button>
                      <button className="btn-chico" onClick={() => setEliminando(null)}>Cancelar</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}