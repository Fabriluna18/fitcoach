const express = require('express');
const verificarToken = require('../middleware/auth');
const soloEntrenador = require('../middleware/rol');
const { configurado, firmar } = require('../cloudinary');

const router = express.Router();

router.use(verificarToken, soloEntrenador);

// Freno simple: máximo 20 subidas por hora por entrenador (se reinicia si el servidor se reinicia)
const MAX_POR_HORA = 20;
const solicitudes = new Map();

function permitido(id) {
  const ahora = Date.now();
  const recientes = (solicitudes.get(id) || []).filter((t) => ahora - t < 3600000);
  if (recientes.length >= MAX_POR_HORA) {
    solicitudes.set(id, recientes);
    return false;
  }
  recientes.push(ahora);
  solicitudes.set(id, recientes);
  return true;
}

// Devuelve los datos firmados para que el navegador suba el archivo directo a Cloudinary
router.post('/firma', (req, res) => {
  const { tipo } = req.body;
  if (!['imagen', 'video'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de archivo inválido' });
  }
  if (!configurado()) {
    return res.status(503).json({ error: 'La subida de archivos todavía no está configurada' });
  }
  if (!permitido(req.user.id)) {
    return res.status(429).json({ error: 'Subiste muchos archivos en poco tiempo. Probá de nuevo en un rato.' });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `fitcoach/entrenador-${req.user.id}/${tipo === 'video' ? 'videos' : 'fotos'}`;

  res.json({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    resource_type: tipo === 'video' ? 'video' : 'image',
    timestamp,
    folder,
    signature: firmar({ folder, timestamp }),
  });
});

module.exports = router;