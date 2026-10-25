const express = require('express');
const pool = require('../db');
const verificarToken = require('../middleware/auth');
const soloEntrenador = require('../middleware/rol');

const router = express.Router();

router.use(verificarToken, soloEntrenador);

// Números del inicio y clientes recientes
router.get('/', async (req, res) => {
  try {
    const resumen = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM users
           WHERE entrenador_id = $1 AND rol = 'cliente' AND activo) AS clientes,
         (SELECT COUNT(*)::int FROM users
           WHERE entrenador_id = $1 AND rol = 'cliente'
             AND creado_en >= date_trunc('month', NOW())) AS clientes_nuevos,
         (SELECT COUNT(*)::int FROM groups WHERE entrenador_id = $1) AS grupos,
         (SELECT COUNT(*)::int FROM routines WHERE entrenador_id = $1) AS rutinas,
         (SELECT COUNT(*)::int FROM (
            SELECT MAX(p.fecha_vencimiento) AS vence
            FROM payments p
            JOIN users u ON u.id = p.user_id
            WHERE p.entrenador_id = $1 AND u.activo AND p.fecha_vencimiento IS NOT NULL
            GROUP BY p.user_id
            UNION ALL
            SELECT MAX(p.fecha_vencimiento) AS vence
            FROM payments p
            WHERE p.entrenador_id = $1 AND p.group_id IS NOT NULL AND p.fecha_vencimiento IS NOT NULL
            GROUP BY p.group_id
          ) t WHERE vence <= CURRENT_DATE + 7) AS pagos_alerta`,
      [req.user.id]
    );

    const recientes = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.avatar,
              (SELECT COUNT(DISTINCT pl.fecha)::int FROM progress_logs pl
               WHERE pl.user_id = u.id AND pl.fecha >= CURRENT_DATE - 30) AS sesiones
       FROM users u
       WHERE u.entrenador_id = $1 AND u.rol = 'cliente' AND u.activo
       ORDER BY u.creado_en DESC
       LIMIT 5`,
      [req.user.id]
    );

        const grupos = await pool.query(
      `SELECT g.id, g.nombre, COUNT(gm.user_id)::int AS miembros
       FROM groups g
       LEFT JOIN group_members gm ON gm.group_id = g.id
       WHERE g.entrenador_id = $1
       GROUP BY g.id
       ORDER BY g.creado_en DESC
       LIMIT 4`,
      [req.user.id]
    );

    const ultima = await pool.query(
      `SELECT r.id, r.nombre, u.nombre AS cliente, g.nombre AS grupo
       FROM routines r
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN groups g ON g.id = r.group_id
       WHERE r.entrenador_id = $1
       ORDER BY r.creado_en DESC, r.id DESC
       LIMIT 1`,
      [req.user.id]
    );

    let ultimaRutina = null;
    if (ultima.rows.length > 0) {
      const ejercicios = await pool.query(
        `SELECT e.nombre, re.series, re.repeticiones, re.peso_sugerido
         FROM routine_exercises re
         JOIN exercises e ON e.id = re.exercise_id
         WHERE re.routine_id = $1
         ORDER BY re.id`,
        [ultima.rows[0].id]
      );
      ultimaRutina = { ...ultima.rows[0], ejercicios: ejercicios.rows };
    }

    // Sesiones de entrenamiento por semana (últimas 8), sumando todos mis clientes
    const semanas = await pool.query(
      `SELECT to_char(w.semana, 'DD/MM') AS semana,
              (SELECT COUNT(*)::int FROM (
                 SELECT DISTINCT pl.user_id, pl.fecha
                 FROM progress_logs pl
                 JOIN users u ON u.id = pl.user_id
                 WHERE u.entrenador_id = $1
                   AND pl.fecha >= w.semana::date
                   AND pl.fecha < w.semana::date + 7
               ) x) AS sesiones
       FROM generate_series(
              date_trunc('week', CURRENT_DATE) - interval '7 weeks',
              date_trunc('week', CURRENT_DATE),
              interval '1 week'
            ) AS w(semana)
       ORDER BY w.semana`,
      [req.user.id]
    );

        // Evolución de los últimos 6 meses, para los mini gráficos de las tarjetas.
    // La adherencia mide los días entrenados en los 30 días previos a cada fecha.
    const meses = await pool.query(
      `SELECT (SELECT COUNT(*)::int FROM users
                WHERE entrenador_id = $1 AND rol = 'cliente' AND activo
                  AND creado_en::date <= f.fin) AS clientes,
              (SELECT COUNT(*)::int FROM groups
                WHERE entrenador_id = $1 AND creado_en::date <= f.fin) AS grupos,
              (SELECT COUNT(*)::int FROM routines
                WHERE entrenador_id = $1 AND creado_en::date <= f.fin) AS rutinas,
              (SELECT COUNT(*)::int FROM (
                 SELECT DISTINCT pl.user_id, pl.fecha
                 FROM progress_logs pl
                 JOIN users u ON u.id = pl.user_id
                 WHERE u.entrenador_id = $1 AND u.activo
                   AND pl.fecha > f.fin - 30 AND pl.fecha <= f.fin
               ) x) AS sesiones
       FROM (
         SELECT LEAST(
                  (date_trunc('month', CURRENT_DATE) + make_interval(months => g + 1) - interval '1 day')::date,
                  CURRENT_DATE
                ) AS fin
         FROM generate_series(-5, 0) AS g
       ) f
       ORDER BY f.fin`,
      [req.user.id]
    );

    const series = { clientes: [], grupos: [], rutinas: [], adherencia: [] };
    for (const m of meses.rows) {
      series.clientes.push(m.clientes);
      series.grupos.push(m.grupos);
      series.rutinas.push(m.rutinas);
      series.adherencia.push(
        m.clientes > 0 ? Math.min(100, Math.round((100 * m.sesiones) / (m.clientes * 12))) : 0
      );
    }

    res.json({
      ...resumen.rows[0],
      adherencia: series.adherencia[series.adherencia.length - 1],
      series,
      recientes: recientes.rows,
      grupos_lista: grupos.rows,
      ultima_rutina: ultimaRutina,
      semanas: semanas.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;