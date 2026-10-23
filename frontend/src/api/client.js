const API_URL = 'http://localhost:3001/api';

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
    throw new Error(datos.error || 'Error en la solicitud');
  }
  return datos;
}