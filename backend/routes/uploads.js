const express = require('express');
const verificarToken = require('../middleware/auth');
const soloEntrenador = require('../middleware/rol');
const { configurado, firmar } = require('../cloudinary');

const router = express.Router();

router.use(verificarToken, soloEntrenador);

// Devuelve los datos firmados para que el navegador suba el archivo directo a Cloudinary
router.post('/firma', (req, res) => {
  const { tipo } = req.body;
  if (!['imagen', 'video'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de archivo inválido' });
  }
  if (!configurado()) {
    return res.status(503).json({ error: 'La subida de archivos todavía no está configurada' });
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