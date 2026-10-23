const express = require('express');
const pool = require('../db');
const verificarToken = require('../middleware/auth');
const soloCliente = require('../middleware/cliente');

const router = express.Router();

router.use(verificarToken, soloCliente);

// Una rutina es mía si es individual para mí o de un grupo del que soy miembro
const ACCESO = `(r.user_id = $1 OR r.group_id IN (SELECT group_id FROM group_members WHERE user_id = $1))`;

// Mis rutinas (individuales y de mis grupos)
router.get('/routines', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.nombre, r.user_id, r.group_id, g.nombre AS grupo,
              COUNT(re.id)::int AS ejercicios
       FROM routines r
       LEFT JOIN groups g ON g.id = r.group_id
       LEFT JOIN routine_exercises re ON re.routine_id = r.id
       WHERE ${ACCESO}
       GROUP BY r.id, g.nombre
       ORDER BY r.creado_en DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Una rutina con sus ejercicios y mi último peso en cada uno
router.get('/routines/:id', async (req, res) => {
  try {
    const rutina = await pool.query(
      `SELECT r.id, r.nombre, r.group_id, g.nombre AS grupo
       FROM routines r
       LEFT JOIN groups g ON g.id = r.group_id
       WHERE r.id = $2 AND ${ACCESO}`,
      [req.user.id, req.params.id]
    );
    if (rutina.rows.length === 0) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    const ejercicios = await pool.query(
      `SELECT re.id, e.nombre, e.musculo, re.series, re.repeticiones, re.peso_sugerido,
              (SELECT pl.peso_real FROM progress_logs pl
               WHERE pl.routine_exercise_id = re.id AND pl.user_id = $2
               ORDER BY pl.fecha DESC, pl.id DESC LIMIT 1) AS ultimo_peso
       FROM routine_exercises re
       JOIN exercises e ON e.id = re.exercise_id
       WHERE re.routine_id = $1
       ORDER BY re.id`,
      [req.params.id, req.user.id]
    );

    res.json({ ...rutina.rows[0], ejercicios: ejercicios.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Guardar una sesión de entrenamiento
router.post('/routines/:id/sesion', async (req, res) => {
  const { comentario, registros } = req.body;

  if (!Array.isArray(registros) || registros.length === 0) {
    return res.status(400).json({ error: 'No hay registros para guardar' });
  }
  for (const r of registros) {
    if (!r.routine_exercise_id) {
      return res.status(400).json({ error: 'Falta el ejercicio en un registro' });
    }
    if (r.peso_real != null && (isNaN(r.peso_real) || r.peso_real < 0)) {
      return res.status(400).json({ error: 'Peso inválido' });
    }
    if (r.series_completadas != null && (!Number.isInteger(r.series_completadas) || r.series_completadas < 0)) {
      return res.status(400).json({ error: 'Series inválidas' });
    }
  }

  const client = await pool.connect();
  try {
    // La rutina tiene que ser mía
    const rutina = await client.query(
      `SELECT r.id FROM routines r WHERE r.id = $2 AND ${ACCESO}`,
      [req.user.id, req.params.id]
    );
    if (rutina.rows.length === 0) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    // Los ejercicios tienen que ser de esa rutina
    const ids = [...new Set(registros.map((r) => Number(r.routine_exercise_id)))];
    const validos = await client.query(
      'SELECT id FROM routine_exercises WHERE routine_id = $1 AND id = ANY($2)',
      [req.params.id, ids]
    );
    if (validos.rows.length !== ids.length) {
      return res.status(400).json({ error: 'Algún ejercicio no pertenece a la rutina' });
    }

    await client.query('BEGIN');
    for (const r of registros) {
      await client.query(
        `INSERT INTO progress_logs (routine_exercise_id, user_id, peso_real, series_completadas, comentario)
         VALUES ($1, $2, $3, $4, $5)`,
        [r.routine_exercise_id, req.user.id, r.peso_real ?? null, r.series_completadas ?? null, comentario || null]
      );
    }
    await client.query('COMMIT');

    res.status(201).json({ mensaje: 'Sesión guardada' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    client.release();
  }
});

// Mi historial (últimos 100 registros)
router.get('/history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pl.id, to_char(pl.fecha, 'DD/MM/YYYY') AS fecha,
              r.nombre AS rutina, e.nombre AS ejercicio,
              pl.peso_real, pl.series_completadas, pl.comentario
       FROM progress_logs pl
       JOIN routine_exercises re ON re.id = pl.routine_exercise_id
       JOIN routines r ON r.id = re.routine_id
       JOIN exercises e ON e.id = re.exercise_id
       WHERE pl.user_id = $1
       ORDER BY pl.fecha DESC, pl.id DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;