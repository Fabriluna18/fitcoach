import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import SelectorAvatar from '../components/SelectorAvatar';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', avatar: '' });
  const [error, setError] = useState('');

  const recargar = () =>
    apiFetch('/clients').then(setClientes).catch((err) => setError(err.message));

  useEffect(() => {
    apiFetch('/clients').then(setClientes).catch((err) => setError(err.message));
  }, []);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const crear = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/clients', { method: 'POST', body: JSON.stringify(form) });
      setForm({ nombre: '', email: '', password: '' });
      recargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const cambiarEstado = async (cliente) => {
    setError('');
    try {
      await apiFetch(`/clients/${cliente.id}`, {
        method: 'PUT',
        body: JSON.stringify({ activo: !cliente.activo }),
      });
      recargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1>Clientes</h1>
      {error && <p className="error">{error}</p>}

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
        {clientes.length === 0 ? (
          <p className="sub">Todavía no cargaste clientes.</p>
        ) : (
          <ul className="lista">
            {clientes.map((c) => (
              <li key={c.id} className={c.activo ? '' : 'inactivo'}>
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}