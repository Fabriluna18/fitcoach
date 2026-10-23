const express = require('express');
const pool = require('../db');
const verificarToken = require('../middleware/auth');
const soloEntrenador = require('../middleware/rol');

const router = express.Router();

router.use(verificarToken, soloEntrenador);

// Listar mis rutinas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.nombre, r.creado_en,
              r.user_id, u.nombre AS cliente,
              r.group_id, g.nombre AS grupo,
              COUNT(re.id)::int AS ejercicios
       FROM routines r
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN groups g ON g.id = r.group_id
       LEFT JOIN routine_exercises re ON re.routine_id = r.id
       WHERE r.entrenador_id = $1
       GROUP BY r.id, u.nombre, g.nombre
       ORDER BY r.creado_en DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Ver una rutina con sus ejercicios
router.get('/:id', async (req, res) => {
  try {
    const rutina = await pool.query(
      `SELECT r.id, r.nombre, r.user_id, u.nombre AS cliente
       FROM routines r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.id = $1 AND r.entrenador_id = $2`,
      [req.params.id, req.user.id]
    );
    if (rutina.rows.length === 0) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    const ejercicios = await pool.query(
      `SELECT re.id, re.exercise_id, e.nombre, e.musculo,
              re.series, re.repeticiones, re.peso_sugerido
       FROM routine_exercises re
       JOIN exercises e ON e.id = re.exercise_id
       WHERE re.routine_id = $1
       ORDER BY re.id`,
      [req.params.id]
    );

    res.json({ ...rutina.rows[0], ejercicios: ejercicios.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Crear una rutina individual con sus ejercicios
router.post('/', async (req, res) => {
  const { nombre, user_id, ejercicios } = req.body;

  if (!nombre || !user_id || !Array.isArray(ejercicios) || ejercicios.length === 0) {
    return res.status(400).json({ error: 'Faltan nombre, cliente o ejercicios' });
  }
  for (const e of ejercicios) {
    if (!e.exercise_id || !e.series || !e.repeticiones) {
      return res.status(400).json({ error: 'Cada ejercicio necesita series y repeticiones' });
    }
  }

  const client = await pool.connect();
  try {
    // El cliente tiene que ser mío
    const cliente = await client.query(
      "SELECT id FROM users WHERE id = $1 AND entrenador_id = $2 AND rol = 'cliente'",
      [user_id, req.user.id]
    );
    if (cliente.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Los ejercicios tienen que ser míos
    const ids = [...new Set(ejercicios.map((e) => Number(e.exercise_id)))];
    const propios = await client.query(
      'SELECT id FROM exercises WHERE id = ANY($1) AND entrenador_id = $2',
      [ids, req.user.id]
    );
    if (propios.rows.length !== ids.length) {
      return res.status(400).json({ error: 'Algún ejercicio no existe' });
    }

    // Transacción: se guarda todo junto o no se guarda nada
    await client.query('BEGIN');
    const rutina = await client.query(
      `INSERT INTO routines (nombre, entrenador_id, user_id)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, user_id`,
      [nombre, req.user.id, user_id]
    );

    for (const e of ejercicios) {
      await client.query(
        `INSERT INTO routine_exercises (routine_id, exercise_id, series, repeticiones, peso_sugerido)
         VALUES ($1, $2, $3, $4, $5)`,
        [rutina.rows[0].id, e.exercise_id, e.series, e.repeticiones, e.peso_sugerido || null]
      );
    }
    await client.query('COMMIT');

    res.status(201).json(rutina.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    client.release();
  }
});

// Borrar una rutina
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM routines WHERE id = $1 AND entrenador_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }
    res.json({ mensaje: 'Rutina borrada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;