import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

export default function Grupos() {
  const [grupos, setGrupos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [nombre, setNombre] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [error, setError] = useState('');

  const cargarGrupos = () =>
    apiFetch('/groups').then(setGrupos).catch((err) => setError(err.message));

  const cargarMiembros = (id) =>
    apiFetch(`/groups/${id}/members`).then(setMiembros).catch((err) => setError(err.message));

  useEffect(() => {
    apiFetch('/groups').then(setGrupos).catch((err) => setError(err.message));
    apiFetch('/clients').then(setClientes).catch((err) => setError(err.message));
  }, []);

  const crear = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/groups', { method: 'POST', body: JSON.stringify({ nombre }) });
      setNombre('');
      cargarGrupos();
    } catch (err) {
      setError(err.message);
    }
  };

  const abrir = (grupo) => {
    setError('');
    setSeleccionado(grupo);
    setClienteId('');
    cargarMiembros(grupo.id);
  };

  const agregar = async () => {
    if (!clienteId) return;
    setError('');
    try {
      await apiFetch(`/groups/${seleccionado.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ user_id: Number(clienteId) }),
      });
      setClienteId('');
      cargarMiembros(seleccionado.id);
      cargarGrupos();
    } catch (err) {
      setError(err.message);
    }
  };

  const quitar = async (userId) => {
    setError('');
    try {
      await apiFetch(`/groups/${seleccionado.id}/members/${userId}`, { method: 'DELETE' });
      cargarMiembros(seleccionado.id);
      cargarGrupos();
    } catch (err) {
      setError(err.message);
    }
  };

  const disponibles = clientes.filter(
    (c) => c.activo && !miembros.some((m) => m.id === c.id)
  );

  return (
    <>
      <h1>Grupos</h1>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Nuevo grupo</h3>
        <form className="fila-form" onSubmit={crear}>
          <input placeholder="Nombre del grupo" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          <button className="btn" type="submit">Crear</button>
        </form>
      </div>

      <div className="card">
        <h3>Mis grupos ({grupos.length})</h3>
        {grupos.length === 0 ? (
          <p className="sub">Todavía no creaste grupos.</p>
        ) : (
          <ul className="lista">
            {grupos.map((g) => (
              <li key={g.id}>
                <div>
                  <strong>{g.nombre}</strong>
                  <div className="sub">{g.miembros} miembros</div>
                </div>
                <button className="btn-chico" onClick={() => abrir(g)}>Ver miembros</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {seleccionado && (
        <div className="card">
          <h3>Miembros de {seleccionado.nombre}</h3>
          <div className="fila-form">
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Elegí un cliente...</option>
              {disponibles.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <button className="btn" onClick={agregar}>Agregar al grupo</button>
          </div>
          {miembros.length === 0 ? (
            <p className="sub">Este grupo todavía no tiene miembros.</p>
          ) : (
            <ul className="lista">
              {miembros.map((m) => (
                <li key={m.id}>
                  <div>
                    <strong>{m.nombre}</strong>
                    <div className="sub">{m.email}</div>
                  </div>
                  <button className="btn-chico" onClick={() => quitar(m.id)}>Quitar</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}