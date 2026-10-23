import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const datos = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(form) });
      localStorage.setItem('token', datos.token);
      localStorage.setItem('user', JSON.stringify(datos.user));
      navigate('/panel');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth">
      <h1>Iniciar sesión</h1>
      <form onSubmit={enviar}>
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={cambiar} required />
        <input name="password" type="password" placeholder="Contraseña" value={form.password} onChange={cambiar} required />
        {error && <p className="error">{error}</p>}
        <button type="submit">Entrar</button>
      </form>
      <p>¿No tenés cuenta? <Link to="/register">Registrate</Link></p>
    </div>
  );
}