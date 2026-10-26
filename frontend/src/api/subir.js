import { apiFetch } from './client';

// Sube un archivo directo a Cloudinary con una firma de nuestro backend
export async function subirArchivo(archivo, tipo, onProgreso) {
  const firma = await apiFetch('/uploads/firma', { method: 'POST', body: JSON.stringify({ tipo }) });

  const datos = new FormData();
  datos.append('file', archivo);
  datos.append('api_key', firma.api_key);
  datos.append('timestamp', firma.timestamp);
  datos.append('signature', firma.signature);
  datos.append('folder', firma.folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${firma.cloud_name}/${firma.resource_type}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgreso) onProgreso(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let respuesta = {};
      try {
        respuesta = JSON.parse(xhr.responseText);
      } catch {
        // sin cuerpo legible
      }
      if (xhr.status >= 200 && xhr.status < 300 && respuesta.secure_url) {
        resolve(respuesta.secure_url);
      } else {
        reject(new Error(respuesta.error?.message || 'No se pudo subir el archivo'));
      }
    };
    xhr.onerror = () => reject(new Error('Falló la conexión al subir el archivo'));
    xhr.send(datos);
  });
}