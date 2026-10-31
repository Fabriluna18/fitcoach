import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '../api/client';
import { mensajeDeError } from '../api/errores';
import AuthLayout from '../components/AuthLayout';

export default function Register() {
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'entrenador' });
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(form) });
      navigate('/login');
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <AuthLayout
      titulo="Creá tu cuenta"
      subtitulo="Empezá a organizar tus entrenamientos en minutos."
      pie={<p className="auth-pie">¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link></p>}
    >
      <form className="auth-form" onSubmit={enviar}>
        <div className="campo-auth">
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" name="nombre" autoComplete="name" value={form.nombre} onChange={cambiar} minLength={2} maxLength={100} required />
        </div>

        <div className="campo-auth">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={cambiar} required />
        </div>

        <div className="campo-auth">
          <label htmlFor="password">Contraseña (mínimo 6)</label>
          <div className="con-ojo">
            <input
              id="password" name="password" type={verClave ? 'text' : 'password'}
              autoComplete="new-password" value={form.password} onChange={cambiar} minLength={6} maxLength={72} required
            />
            <button
              type="button" className="ojo" onClick={() => setVerClave(!verClave)}
              aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {verClave ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="campo-auth">
          <label htmlFor="rol">Soy</label>
          <select id="rol" name="rol" value={form.rol} onChange={cambiar}>
            <option value="entrenador">Entrenador</option>
            <option value="cliente">Cliente</option>
          </select>
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button className="btn-auth" type="submit" disabled={cargando}>
          {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>
    </AuthLayout>
  );
}