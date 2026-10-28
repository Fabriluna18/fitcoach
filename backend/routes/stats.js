const express = require('express');
const pool = require('../db');
const verificarToken = require('../middleware/auth');
const soloEntrenador = require('../middleware/rol');

const router = express.Router();

router.use(verificarToken, soloEntrenador);

const META_SESIONES = 12;

// Pesos registrados por mis clientes activos, y el primer peso de cada cliente en cada ejercicio
const PESOS = `
  base AS (
    SELECT pl.id, pl.user_id, re.exercise_id, pl.fecha, pl.peso_real
    FROM progress_logs pl
    JOIN routine_exercises re ON re.id = pl.routine_exercise_id
    JOIN users u ON u.id = pl.user_id
    WHERE u.entrenador_id = $1 AND u.activo AND pl.peso_real IS NOT NULL AND pl.peso_real > 0
  ),
  primero AS (
    SELECT DISTINCT ON (user_id, exercise_id) user_id, exercise_id, peso_real AS peso0, fecha AS fecha0
    FROM base
    ORDER BY user_id, exercise_id, fecha, id
  )`;

// Evolución mensual: adherencia y progreso promedio de todos mis clientes
router.get('/general', async (req, res) => {
  const meses = Number(req.query.meses);
  if (![3, 6, 12].includes(meses)) {
    return res.status(400).json({ error: 'Período inválido' });
  }

  try {
    const result = await pool.query(
      `WITH ${PESOS},
       fechas AS (
         SELECT LEAST(
                  (date_trunc('month', CURRENT_DATE) + make_interval(months => g + 1) - interval '1 day')::date,
                  CURRENT_DATE
                ) AS fin
         FROM generate_series(-($2::int - 1), 0) AS g
       )
       SELECT to_char(f.fin, 'YYYY-MM-DD') AS fin,
              (SELECT COUNT(*)::int FROM users
                WHERE entrenador_id = $1 AND rol = 'cliente' AND activo
                  AND creado_en::date <= f.fin) AS clientes,
              (SELECT COUNT(*)::int FROM (
                 SELECT DISTINCT pl.user_id, pl.fecha
                 FROM progress_logs pl
                 JOIN users u ON u.id = pl.user_id
                 WHERE u.entrenador_id = $1 AND u.activo
                   AND pl.fecha > f.fin - 30 AND pl.fecha <= f.fin
               ) x) AS sesiones,
              (SELECT ROUND(AVG(x.pct)::numeric, 1) FROM (
                 SELECT 100.0 * (MAX(b.peso_real) - p.peso0) / p.peso0 AS pct
                 FROM primero p
                 JOIN base b ON b.user_id = p.user_id AND b.exercise_id = p.exercise_id AND b.fecha <= f.fin
                 WHERE p.fecha0 <= f.fin
                 GROUP BY p.user_id, p.exercise_id, p.peso0
                 HAVING COUNT(DISTINCT b.fecha) >= 2
               ) x) AS progreso
       FROM fechas f
       ORDER BY f.fin`,
      [req.user.id, meses]
    );

    res.json(
      result.rows.map((r) => ({
        fin: r.fin,
        adherencia:
          r.clientes > 0 ? Math.min(100, Math.round((100 * r.sesiones) / (r.clientes * META_SESIONES))) : 0,
        progreso: r.progreso === null ? null : Number(r.progreso),
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Un resumen por cliente: sesiones de los últimos 30 días, avance y última sesión
router.get('/clientes', async (req, res) => {
  try {
    const result = await pool.query(
      `WITH ${PESOS},
       prog AS (
         SELECT p.user_id, 100.0 * (MAX(b.peso_real) - p.peso0) / p.peso0 AS pct
         FROM primero p
         JOIN base b ON b.user_id = p.user_id AND b.exercise_id = p.exercise_id
         GROUP BY p.user_id, p.exercise_id, p.peso0
         HAVING COUNT(DISTINCT b.fecha) >= 2
       )
       SELECT u.id, u.nombre, u.avatar,
              (SELECT COUNT(DISTINCT pl.fecha)::int FROM progress_logs pl
                WHERE pl.user_id = u.id AND pl.fecha > CURRENT_DATE - 30) AS sesiones,
              (SELECT to_char(MAX(pl.fecha), 'DD/MM/YYYY') FROM progress_logs pl
                WHERE pl.user_id = u.id) AS ultima,
              (SELECT ROUND(AVG(pct)::numeric, 1) FROM prog WHERE prog.user_id = u.id) AS progreso
       FROM users u
       WHERE u.entrenador_id = $1 AND u.rol = 'cliente' AND u.activo
       ORDER BY u.nombre`,
      [req.user.id]
    );

    res.json(
      result.rows.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        avatar: r.avatar,
        sesiones: r.sesiones,
        meta: META_SESIONES,
        adherencia: Math.min(100, Math.round((100 * r.sesiones) / META_SESIONES)),
        ultima: r.ultima,
        progreso: r.progreso === null ? null : Number(r.progreso),
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;