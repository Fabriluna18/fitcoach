import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '../api/client';
import { mensajeDeError } from '../api/errores';
import AuthLayout from '../components/AuthLayout';

const DEMO = import.meta.env.VITE_DEMO === 'true';
const CLAVE_DEMO = 'demo1234';
const CUENTAS_DEMO = [
  { texto: 'Entrar como entrenador', email: 'entrenador@demo.com' },
  { texto: 'Entrar como cliente', email: 'laura@demo.com' },
];

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [lento, setLento] = useState(false);
  const temporizador = useRef(null);
  const navigate = useNavigate();

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const iniciar = async (datos) => {
    setError('');
    setCargando(true);
    // El servidor gratis puede tardar cerca de un minuto en despertarse
    temporizador.current = setTimeout(() => setLento(true), 4000);
    try {
      const r = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(datos) });
      localStorage.setItem('token', r.token);
      localStorage.setItem('user', JSON.stringify(r.user));
      navigate(r.user.rol === 'entrenador' ? '/panel' : '/mis-rutinas');
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      clearTimeout(temporizador.current);
      setLento(false);
      setCargando(false);
    }
  };

  const enviar = (e) => {
    e.preventDefault();
    iniciar(form);
  };

  return (
    <AuthLayout
      titulo="Bienvenido de nuevo"
      subtitulo="Iniciá sesión para ver tus rutinas y tu progreso."
      pie={<p className="auth-pie">¿No tenés cuenta? <Link to="/register">Registrate</Link></p>}
    >
      <form className="auth-form" onSubmit={enviar}>
        <div className="campo-auth">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={cambiar} required />
        </div>

        <div className="campo-auth">
          <label htmlFor="password">Contraseña</label>
          <div className="con-ojo">
            <input
              id="password" name="password" type={verClave ? 'text' : 'password'}
              autoComplete="current-password" value={form.password} onChange={cambiar} required
            />
            <button
              type="button" className="ojo" onClick={() => setVerClave(!verClave)}
              aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {verClave ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button className="btn-auth" type="submit" disabled={cargando}>
          {cargando ? 'Entrando...' : 'Iniciar sesión'}
        </button>
        {lento && (
          <p className="auth-aviso">Estamos despertando el servidor. La primera vez puede tardar hasta un minuto.</p>
        )}
      </form>

      {DEMO && (
        <div className="auth-demo">
          <span>o probá la demo</span>
          <div>
            {CUENTAS_DEMO.map((c) => (
              <button
                key={c.email} type="button" disabled={cargando}
                onClick={() => iniciar({ email: c.email, password: CLAVE_DEMO })}
              >
                {c.texto}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}