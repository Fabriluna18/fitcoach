const express = require('express');
const pool = require('../db');
const verificarToken = require('../middleware/auth');
const soloEntrenador = require('../middleware/rol');

const router = express.Router();

router.use(verificarToken, soloEntrenador);

// Listar mis ejercicios
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, descripcion, musculo
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