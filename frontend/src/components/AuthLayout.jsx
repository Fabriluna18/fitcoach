import { CheckCircle2 } from 'lucide-react';
import Logo from './Logo';
import { MARCA } from '../marca';

const VENTAJAS = [
  'Rutinas individuales y grupales, con biseries y circuitos',
  'Progreso, calendario y mensajes en un solo lugar',
  'Pagos con alertas de vencimiento',
];

export default function AuthLayout({ titulo, subtitulo, pie, children }) {
  return (
    <div className="auth-pagina">
      <aside className="auth-hero">
        <div className="auth-hero-texto">
          <div className="auth-marca">
            <Logo size={48} />
            <span>{MARCA.nombre}</span>
          </div>
          <h2>{MARCA.frase}</h2>
          <ul>
            {VENTAJAS.map((v) => (
              <li key={v}><CheckCircle2 size={18} /> {v}</li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-caja">
          <div className="auth-marca-movil">
            <Logo size={36} />
            <span>{MARCA.nombre}</span>
          </div>
          <h1>{titulo}</h1>
          <p className="sub">{subtitulo}</p>
          {children}
          {pie}
        </div>
      </main>
    </div>
  );
}