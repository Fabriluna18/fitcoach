import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '../api/client';
import Avatar from '../components/Avatar';
import Chat from '../components/Chat';

const ZONA = 'America/Argentina/Buenos_Aires';

const cuando = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const esHoy =
    d.toLocaleDateString('en-CA', { timeZone: ZONA }) === new Date().toLocaleDateString('en-CA', { timeZone: ZONA });
  return esHoy
    ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA })
    : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', timeZone: ZONA });
};

function MensajesEntrenador() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [lista, setLista] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [elegido, setElegido] = useState(null);
  const [error, setError] = useState('');

  const cargarLista = useCallback(
    () =>
      apiFetch('/messages/conversaciones')
        .then(setLista)
        .catch((err) => setError(err.message))
        .finally(() => setCargado(true)),
    []
  );

  useEffect(() => {
    cargarLista();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') cargarLista();
    }, 15000);
    window.addEventListener('mensajes-actualizados', cargarLista);
    return () => {
      clearInterval(id);
      window.removeEventListener('mensajes-actualizados', cargarLista);
    };
  }, [cargarLista]);

  const traer = useCallback(
    (despues) => apiFetch(`/messages/con/${elegido}?despues=${despues}`),
    [elegido]
  );
  const enviar = useCallback(
    (texto) => apiFetch(`/messages/con/${elegido}`, { method: 'POST', body: JSON.stringify({ texto }) }),
    [elegido]
  );

  const actual = lista.find((c) => c.id === elegido);

  return (
    <>
      <h1>Mensajes</h1>
      {error && <p className="error">{error}</p>}

      <div className={`mensajes ${elegido ? 'con-chat' : ''}`}>
        <div className="mensajes-lista card">
          {cargado && lista.length === 0 && (
            <p className="sub" style={{ padding: 8 }}>Todavía no tenés clientes. Cargalos desde Clientes.</p>
          )}
          {lista.map((c) => (
            <button
              key={c.id} type="button"
              className={`conv ${c.id === elegido ? 'activa' : ''}`}
              onClick={() => setElegido(c.id)}
            >
              <Avatar nombre={c.nombre} avatar={c.avatar} size={42} />
              <div className="conv-texto">
                <strong>{c.nombre}</strong>
                <span className="sub">
                  {c.ultimo_texto
                    ? `${c.ultimo_remitente === user.id ? 'Vos: ' : ''}${c.ultimo_texto}`
                    : 'Sin mensajes todavía'}
                </span>
              </div>
              <div className="conv-meta">
                <span className="sub">{cuando(c.ultimo_en)}</span>
                {c.no_leidos > 0 && <span className="contador">{c.no_leidos}</span>}
              </div>
            </button>
          ))}
        </div>

        <div className="mensajes-chat card">
          {actual ? (
            <>
              <div className="chat-cab">
                <button type="button" className="chat-volver" onClick={() => setElegido(null)} aria-label="Volver a la lista">
                  <ArrowLeft size={18} />
                </button>
                <Avatar nombre={actual.nombre} avatar={actual.avatar} size={40} />
                <strong>{actual.nombre}</strong>
                {!actual.activo && <span className="badge vencido">De baja</span>}
              </div>
              <Chat
                key={actual.id}
                traer={traer}
                enviar={enviar}
                miId={user.id}
                puedeEscribir={actual.activo}
                motivo="Este cliente está dado de baja, así que no se pueden enviar mensajes."
              />
            </>
          ) : (
            <p className="sub chat-vacio">Elegí una conversación de la lista.</p>
          )}
        </div>
      </div>
    </>
  );
}

function MensajesCliente() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [entrenador, setEntrenador] = useState(undefined);

  const traer = useCallback(async (despues) => {
    const respuesta = await apiFetch(`/me/messages?despues=${despues}`);
    setEntrenador(respuesta.entrenador);
    return respuesta.mensajes;
  }, []);

  const enviar = useCallback(
    (texto) => apiFetch('/me/messages', { method: 'POST', body: JSON.stringify({ texto }) }),
    []
  );

  return (
    <>
      <h1>Mensajes</h1>
      <div className="mensajes-chat solo card">
        <div className="chat-cab">
          {entrenador ? (
            <>
              <Avatar nombre={entrenador.nombre} foto={entrenador.foto_url} size={40} />
              <strong>{entrenador.nombre}</strong>
              <span className="sub">Tu entrenador</span>
            </>
          ) : (
            <strong>Tu entrenador</strong>
          )}
        </div>
        {entrenador === null ? (
          <p className="sub chat-vacio">Todavía no tenés un entrenador asignado.</p>
        ) : (
          <Chat traer={traer} enviar={enviar} miId={user.id} />
        )}
      </div>
    </>
  );
}

export default function Mensajes() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return user?.rol === 'entrenador' ? <MensajesEntrenador /> : <MensajesCliente />;
}