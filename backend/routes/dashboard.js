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
      `SELECT u.id, u.nombre, u.email,
              (SELECT COUNT(DISTINCT pl.fecha)::int FROM progress_logs pl
               WHERE pl.user_id = u.id AND pl.fecha >= CURRENT_DATE - 30) AS sesiones
       FROM users u
       WHERE u.entrenador_id = $1 AND u.rol = 'cliente' AND u.activo
       ORDER BY u.creado_en DESC
       LIMIT 5`,
      [req.user.id]
    );

    res.json({ ...resumen.rows[0], recientes: recientes.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;