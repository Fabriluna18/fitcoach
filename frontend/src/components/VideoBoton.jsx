import { useEffect, useState } from 'react';
import { Play, X } from 'lucide-react';

// Saca el id de un link de YouTube (watch, youtu.be, shorts o embed)
function idYoutube(url) {
  try {
    const u = new URL(url);
    let id = null;
    if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1).split('/')[0];
    } else if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com' || u.hostname === 'm.youtube.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      const m = u.pathname.match(/^\/(shorts|embed)\/([\w-]+)/);
      if (m) id = m[2];
    }
    return id && /^[\w-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export default function VideoBoton({ url, tipo, titulo }) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [abierto]);

  if (!url) return null;
  const youtube = tipo === 'link' ? idYoutube(url) : null;

  return (
    <>
      <button type="button" className="btn-video" onClick={() => setAbierto(true)} aria-label={`Ver video de ${titulo}`}>
        <Play size={14} />
      </button>

      {abierto && (
        <div className="modal-fondo" onClick={() => setAbierto(false)}>
          <div className="modal-video" onClick={(e) => e.stopPropagation()}>
            <div className="modal-cab">
              <strong>{titulo}</strong>
              <button type="button" className="crono-x" onClick={() => setAbierto(false)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            {tipo === 'archivo' && <video src={url} controls autoPlay playsInline />}
            {youtube && (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtube}`}
                title={titulo}
                allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            )}
            {tipo === 'link' && !youtube && (
              <p>
                <a href={url} target="_blank" rel="noopener noreferrer">Abrir el video en una pestaña nueva</a>
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}