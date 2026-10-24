import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import Alertas from '../components/Alertas';

const pesos = (n) => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export default function Pagos() {
  const [pagos, setPagos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [destino, setDestino] = useState('cliente');
  const [userId, setUserId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('efectivo');
  const [vencimiento, setVencimiento] = useState('');
  const [refresco, setRefresco] = useState(0);
  const [error, setError] = useState('');

  const cargarPagos = () =>
    apiFetch('/payments').then(setPagos).catch((err) => setError(err.message));

  useEffect(() => {
    apiFetch('/payments').then(setPagos).catch((err) => setError(err.message));
    apiFetch('/clients').then(setClientes).catch((err) => setError(err.message));
    apiFetch('/groups').then(setGrupos).catch((err) => setError(err.message));
  }, []);

  const crear = async (e) => {
    e.preventDefault();
    setError('');

    const cuerpo = {
      monto: Number(monto),
      metodo,
      fecha_vencimiento: vencimiento || null,
    };
    if (destino === 'cliente') cuerpo.user_id = Number(userId);
    else cuerpo.group_id = Number(groupId);

    try {
      await apiFetch('/payments', { method: 'POST', body: JSON.stringify(cuerpo) });
      setUserId('');
      setGroupId('');
      setMonto('');
      setVencimiento('');
      cargarPagos();
      setRefresco((r) => r + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const borrar = async (id) => {
    setError('');
    try {
      await apiFetch(`/payments/${id}`, { method: 'DELETE' });
      cargarPagos();
      setRefresco((r) => r + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const clientesActivos = clientes.filter((c) => c.activo);

  return (
    <>
      <h1>Pagos</h1>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Vencimientos</h3>
        <Alertas refresco={refresco} />
      </div>

      <div className="card">
        <h3>Registrar pago</h3>
        <form onSubmit={crear}>
          <div className="fila-form" style={{ marginBottom: 12 }}>
            <select value={destino} onChange={(e) => setDestino(e.target.value)}>
              <option value="cliente">De un cliente</option>
              <option value="grupo">De un grupo</option>
            </select>
            {destino === 'cliente' ? (
              <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">Elegí un cliente...</option>
                {clientesActivos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            ) : (
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
                <option value="">Elegí un grupo...</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>{g.nombre}</option>
                ))}
              </select>
            )}
          </div>
          <div className="fila-form">
            <input type="number" min="1" step="any" placeholder="Monto ($)" value={monto} onChange={(e) => setMonto(e.target.value)} required />
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </select>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div className="sub">Vence el (opcional)</div>
              <input type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #ccd', borderRadius: 8, fontSize: '1rem' }} />
            </div>
            <button className="btn" type="submit">Registrar</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Historial ({pagos.length})</h3>
        {pagos.length === 0 ? (
          <p className="sub">Todavía no registraste pagos.</p>
        ) : (
          <table className="tabla">
            <thead>
              <tr><th>Fecha</th><th>De</th><th>Monto</th><th>Método</th><th>Vence</th><th></th></tr>
            </thead>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.id}>
                  <td>{p.fecha}</td>
                  <td>{p.cliente || (p.grupo ? `Grupo ${p.grupo}` : '(eliminado)')}</td>
                  <td>{pesos(p.monto)}</td>
                  <td>{p.metodo === 'efectivo' ? 'Efectivo' : 'Transferencia'}</td>
                  <td>{p.vence || '-'}</td>
                  <td><button className="btn-peligro" onClick={() => borrar(p.id)}>Borrar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}