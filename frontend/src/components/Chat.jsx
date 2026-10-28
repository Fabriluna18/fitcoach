import { useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';

const ZONA = 'America/Argentina/Buenos_Aires';
const diaDe = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: ZONA });
const horaDe = (iso) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA });

function etiquetaDia(dia) {
  const hoy = diaDe(new Date().toISOString());
  const ayer = diaDe(new Date(Date.now() - 86400000).toISOString());
  if (dia === hoy) return 'Hoy';
  if (dia === ayer) return 'Ayer';
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function Chat({ traer, enviar, miId, puedeEscribir = true, motivo = '' }) {
  const [mensajes, setMensajes] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const ultimo = useRef(0);
  const caja = useRef(null);
  const abajo = useRef(true);

  const traerNuevos = useCallback(async () => {
    const primera = ultimo.current === 0;
    try {
      const nuevos = await traer(ultimo.current);
      if (nuevos.length > 0) {
        ultimo.current = nuevos[nuevos.length - 1].id;
        setMensajes((anteriores) => {
          const vistos = new Set(anteriores.map((m) => m.id));
          return [...anteriores, ...nuevos.filter((m) => !vistos.has(m.id))];
        });
      }
      setError('');
      // Avisa al menú para que actualice el globito de no leídos
      if (primera || nuevos.length > 0) window.dispatchEvent(new Event('mensajes-actualizados'));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargado(true);
    }
  }, [traer]);

  useEffect(() => {
    traerNuevos();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') traerNuevos();
    }, 4000);
    return () => clearInterval(id);
  }, [traerNuevos]);

  // Baja solo hasta el último mensaje, salvo que estés leyendo mensajes viejos
  useEffect(() => {
    if (abajo.current && caja.current) caja.current.scrollTop = caja.current.scrollHeight;
  }, [mensajes]);

  const alScroll = () => {
    const c = caja.current;
    abajo.current = c.scrollHeight - c.scrollTop - c.clientHeight < 80;
  };

  const mandar = async () => {
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    setError('');
    try {
      await enviar(limpio);
      setTexto('');
      abajo.current = true;
      await traerNuevos();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const teclas = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      mandar();
    }
  };

  let diaAnterior = null;

  return (
    <div className="chat">
      <div className="chat-caja" ref={caja} onScroll={alScroll}>
        {cargado && mensajes.length === 0 && (
          <p className="sub chat-vacio">Todavía no hay mensajes. ¡Escribí el primero!</p>
        )}
        {mensajes.map((m) => {
          const dia = diaDe(m.creado_en);
          const nuevoDia = dia !== diaAnterior;
          diaAnterior = dia;
          return (
            <div key={m.id}>
              {nuevoDia && (
                <div className="chat-dia"><span>{etiquetaDia(dia)}</span></div>
              )}
              <div className={`burbuja ${m.remitente_id === miId ? 'mia' : 'suya'}`}>
                <p>{m.texto}</p>
                <span>{horaDe(m.creado_en)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="error" style={{ margin: '8px 0 0' }}>{error}</p>}

      {puedeEscribir ? (
        <div className="chat-entrada">
          <textarea
            rows="1" maxLength={1000} placeholder="Escribí un mensaje..."
            value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={teclas}
          />
          <button className="btn con-icono" onClick={mandar} disabled={enviando || !texto.trim()}>
            <Send size={16} /> Enviar
          </button>
        </div>
      ) : (
        <p className="sub" style={{ marginTop: 10 }}>{motivo}</p>
      )}
    </div>
  );
}