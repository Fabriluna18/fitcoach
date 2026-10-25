import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react';
import { formatoTiempo } from '../hooks/useCronometro';

export default function Cronometro({ crono }) {
  const { total, restante, corriendo, terminado, abierto, setAbierto, iniciar, pausar, reanudar, reiniciar } = crono;
  const pausado = !corriendo && !terminado && restante > 0;
  const activo = corriendo || pausado;
  const porcentaje = total > 0 ? (restante / total) * 100 : 0;

  if (!abierto) {
    return (
      <div className={`crono ${terminado ? 'fin' : ''}`}>
        <button className="crono-pill" onClick={() => setAbierto(true)}>
          <Timer size={18} />
          {terminado ? '¡Listo!' : activo ? formatoTiempo(restante) : 'Cronómetro'}
        </button>
      </div>
    );
  }

  return (
    <div className={`crono ${terminado ? 'fin' : ''}`}>
      <div className="crono-panel">
        <div className="crono-cabecera">
          <strong><Timer size={16} /> Cronómetro</strong>
          <button className="crono-x" onClick={() => setAbierto(false)} aria-label="Minimizar">
            <X size={16} />
          </button>
        </div>

        <div className="crono-tiempo">{terminado ? '¡Listo!' : formatoTiempo(restante)}</div>
        <div className="crono-barra"><div style={{ width: `${porcentaje}%` }} /></div>

        <div className="crono-presets">
          <button onClick={() => iniciar(180)}>
            <span>Descanso entre series</span><strong>3:00</strong>
          </button>
          <button onClick={() => iniciar(300)}>
            <span>Pausa entre bloques</span><strong>5:00</strong>
          </button>
        </div>

        {(activo || terminado) && (
          <div className="crono-controles">
            {corriendo && <button onClick={pausar}><Pause size={16} /> Pausar</button>}
            {pausado && <button onClick={reanudar}><Play size={16} /> Seguir</button>}
            <button className="sec" onClick={reiniciar}><RotateCcw size={16} /> Detener</button>
          </div>
        )}
      </div>
    </div>
  );
}