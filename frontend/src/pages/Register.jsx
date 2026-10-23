import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';

export default function Register() {
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'entrenador' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(form) });
      navigate('/login');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth">
      <h1>Crear cuenta</h1>
      <form onSubmit={enviar}>
        <input name="nombre" placeholder="Nombre" value={form.nombre} onChange={cambiar} required />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={cambiar} required />
        <input name="password" type="password" placeholder="Contraseña (mín. 6)" value={form.password} onChange={cambiar} required />
        <select name="rol" value={form.rol} onChange={cambiar}>
          <option value="entrenador">Entrenador</option>
          <option value="cliente">Cliente</option>
        </select>
        {error && <p className="error">{error}</p>}
        <button type="submit">Registrarme</button>
      </form>
      <p>¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link></p>
    </div>
  );
}