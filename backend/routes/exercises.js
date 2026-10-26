const express = require('express');
const pool = require('../db');
const verificarToken = require('../middleware/auth');
const soloEntrenador = require('../middleware/rol');
const { esDeMiCuenta } = require('../cloudinary');

const router = express.Router();

router.use(verificarToken, soloEntrenador);

// Devuelve { url, tipo } listos para guardar, o { error }
function validarVideo(url, tipo) {
  if (!url) return { url: null, tipo: null };

  if (tipo === 'archivo') {
    if (!esDeMiCuenta(url, 'video')) return { error: 'El video no es válido' };
    return { url, tipo };
  }

  if (tipo === 'link') {
    let direccion;
    try {
      direccion = new URL(url);
    } catch {
      return { error: 'El link no es válido' };
    }
    if (direccion.protocol !== 'https:' || url.length > 500) {
      return { error: 'El link tiene que empezar con https://' };
    }
    return { url: direccion.href, tipo };
  }

  return { error: 'Tipo de video inválido' };
}

// Listar mis ejercicios
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, descripcion, musculo, video_url, video_tipo
       FROM exercises
       WHERE entrenador_id = $1
       ORDER BY nombre`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Crear un ejercicio
router.post('/', async (req, res) => {
  const { nombre, descripcion, musculo } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'Falta el nombre del ejercicio' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO exercises (nombre, descripcion, musculo, entrenador_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, descripcion, musculo`,
      [nombre, descripcion || null, musculo || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Poner, cambiar o quitar el video de un ejercicio
router.put('/:id/video', async (req, res) => {
  const { video_url, video_tipo } = req.body;
  const video = validarVideo(video_url, video_tipo);
  if (video.error) {
    return res.status(400).json({ error: video.error });
  }

  try {
    const result = await pool.query(
      `UPDATE exercises SET video_url = $1, video_tipo = $2
       WHERE id = $3 AND entrenador_id = $4
       RETURNING id, video_url, video_tipo`,
      [video.url, video.tipo, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Borrar un ejercicio (si no está usado en ninguna rutina)
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM exercises WHERE id = $1 AND entrenador_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' });
    }
    res.json({ mensaje: 'Ejercicio borrado' });
  } catch (error) {
    // 23503 = el ejercicio está usado en alguna rutina
    if (error.code === '23503') {
      return res.status(409).json({ error: 'Ese ejercicio está en una rutina y no se puede borrar' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;