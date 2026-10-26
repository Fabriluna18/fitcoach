const express = require('express');
const pool = require('../db');
const verificarToken = require('../middleware/auth');
const soloCliente = require('../middleware/cliente');
const progresoDe = require('../progress');
const { hoy, estadoDe } = require('../fechas');

const router = express.Router();

router.use(verificarToken, soloCliente);

// Una rutina es mía si es individual para mí o de un grupo del que soy miembro
const ACCESO = `(r.user_id = $1 OR r.group_id IN (SELECT group_id FROM group_members WHERE user_id = $1))`;

const CAMPOS = `
  r.id, r.nombre, r.group_id, g.nombre AS grupo,
  to_char(r.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
  to_char(r.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
  (r.archivada_en IS NOT NULL) AS archivada`;

// Mis rutinas (individuales y de mis grupos), con su estado
router.get('/routines', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${CAMPOS}, COUNT(re.id)::int AS ejercicios
       FROM routines r
       LEFT JOIN groups g ON g.id = r.group_id
       LEFT JOIN routine_exercises re ON re.routine_id = r.id
       WHERE ${ACCESO}
       GROUP BY r.id, g.nombre
       ORDER BY r.fecha_inicio DESC, r.id DESC`,
      [req.user.id]
    );
    const hoyStr = hoy();
    res.json(result.rows.map((r) => ({ ...r, estado: estadoDe(r, hoyStr) })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Una rutina con sus bloques, ejercicios y mi último peso en cada uno
router.get('/routines/:id', async (req, res) => {
  try {
    const rutina = await pool.query(
      `SELECT ${CAMPOS}
       FROM routines r
       LEFT JOIN groups g ON g.id = r.group_id
       WHERE r.id = $2 AND ${ACCESO}`,
      [req.user.id, req.params.id]
    );
    if (rutina.rows.length === 0) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    const bloques = await pool.query(
      `SELECT id, tipo, orden, vueltas, descanso_seg
       FROM routine_blocks WHERE routine_id = $1 ORDER BY orden, id`,
      [req.params.id]
    );

    // El último peso se busca por ejercicio (no por rutina), así sigue
    // apareciendo aunque la rutina se haya renovado
    const ejercicios = await pool.query(
      `SELECT re.id, re.block_id, e.nombre, e.musculo, e.video_url, e.video_tipo, re.series, re.repeticiones, re.peso_sugerido,
              (SELECT pl.peso_real
               FROM progress_logs pl
               JOIN routine_exercises re2 ON re2.id = pl.routine_exercise_id
               WHERE pl.user_id = $2 AND re2.exercise_id = re.exercise_id AND pl.peso_real IS NOT NULL
               ORDER BY pl.fecha DESC, pl.id DESC LIMIT 1) AS ultimo_peso
       FROM routine_exercises re
       JOIN exercises e ON e.id = re.exercise_id
       WHERE re.routine_id = $1
       ORDER BY re.orden, re.id`,
      [req.params.id, req.user.id]
    );

    const r = rutina.rows[0];
    res.json({
      ...r,
      estado: estadoDe(r),
      bloques: bloques.rows.map((b) => ({
        ...b,
        ejercicios: ejercicios.rows.filter((e) => e.block_id === b.id),
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Guardar una sesión de entrenamiento (solo en rutinas activas)
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
      `SELECT ${CAMPOS}
       FROM routines r
       LEFT JOIN groups g ON g.id = r.group_id
       WHERE r.id = $2 AND ${ACCESO}`,
      [req.user.id, req.params.id]
    );
    if (rutina.rows.length === 0) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }
    if (estadoDe(rutina.rows[0]) !== 'activa') {
      return res.status(400).json({ error: 'Solo podés registrar sesiones en rutinas activas' });
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

// Mi evolución de peso por ejercicio
router.get('/progress', async (req, res) => {
  try {
    res.json(await progresoDe(req.user.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Mis próximas citas (individuales y de mis grupos)
router.get('/appointments', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.titulo, a.tipo, a.notas,
              g.nombre AS grupo, e.nombre AS entrenador,
              to_char(a.inicio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD') AS fecha,
              to_char(a.inicio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI') AS hora_inicio,
              to_char(a.fin AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI') AS hora_fin
       FROM appointments a
       JOIN users e ON e.id = a.entrenador_id
       LEFT JOIN groups g ON g.id = a.group_id
       WHERE (a.user_id = $1 OR a.group_id IN (SELECT group_id FROM group_members WHERE user_id = $1))
         AND a.fin >= NOW()
       ORDER BY a.inicio
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;