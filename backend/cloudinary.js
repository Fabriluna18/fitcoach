require('dotenv').config();
const crypto = require('crypto');

function configurado() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );
}

// Cloudinary pide firmar la subida: SHA-1 de los parámetros ordenados por nombre
// ("a=1&b=2") con la clave secreta pegada al final
function firmar(params) {
  const texto = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto
    .createHash('sha1')
    .update(texto + process.env.CLOUDINARY_API_SECRET)
    .digest('hex');
}

// ¿La URL es de un archivo subido a MI cuenta? (tipo: 'image' o 'video')
function esDeMiCuenta(url, tipo) {
  if (typeof url !== 'string' || url.length > 500) return false;
  return url.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/${tipo}/upload/`);
}

module.exports = { configurado, firmar, esDeMiCuenta };