const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function apiFetch(ruta, opciones = {}) {
  const token = localStorage.getItem('token');
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opciones.headers,
    },
  });
  const datos = await respuesta.json();

  if (!respuesta.ok) {
    // Sesión vencida o cuenta dada de baja: se vuelve al login
    if (respuesta.status === 401 && token && !ruta.startsWith('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    const error = new Error(datos.error || 'Error en la solicitud');
    error.codigo = datos.codigo;
    error.datos = datos;
    throw error;
  }
  return datos;
}