const express = require('express');
const pool = require('../db');
const verificarToken = require('../middleware/auth');
const soloEntrenador = require('../middleware/rol');

const router = express.Router();

router.use(verificarToken, soloEntrenador);

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Clientes y grupos con pago vencido o que vence en los próximos 7 días
router.get('/alerts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tipo, id, nombre, to_char(vence, 'DD/MM/YYYY') AS vence,
              (vence - CURRENT_DATE)::int AS dias
       FROM (
         SELECT 'cliente' AS tipo, u.id, u.nombre, MAX(p.fecha_vencimiento) AS vence
         FROM payments p
         JOIN users u ON u.id = p.user_id
         WHERE p.entrenador_id = $1 AND u.activo AND p.fecha_vencimiento IS NOT NULL
         GROUP BY u.id, u.nombre
         UNION ALL
         SELECT 'grupo' AS tipo, g.id, g.nombre, MAX(p.fecha_vencimiento) AS vence
         FROM payments p
         JOIN groups g ON g.id = p.group_id
         WHERE p.entrenador_id = $1 AND p.fecha_vencimiento IS NOT NULL
         GROUP BY g.id, g.nombre
       ) t
       WHERE vence <= CURRENT_DATE + 7
       ORDER BY vence`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Historial de pagos (últimos 200)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, to_char(p.fecha, 'DD/MM/YYYY') AS fecha, p.monto, p.metodo,
              to_char(p.fecha_vencimiento, 'DD/MM/YYYY') AS vence,
              u.nombre AS cliente, g.nombre AS grupo
       FROM payments p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN groups g ON g.id = p.group_id
       WHERE p.entrenador_id = $1
       ORDER BY p.fecha DESC, p.id DESC
       LIMIT 200`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Registrar un pago de un cliente O de un grupo
router.post('/', async (req, res) => {
  const { user_id, group_id, monto, metodo, fecha, fecha_vencimiento } = req.body;

  if ((user_id && group_id) || (!user_id && !group_id)) {
    return res.status(400).json({ error: 'El pago es de un cliente o de un grupo, no ambos ni ninguno' });
  }
  const importe = Number(monto);
  if (!Number.isFinite(importe) || importe <= 0) {
    return res.status(400).json({ error: 'El monto tiene que ser mayor a 0' });
  }
  if (!['efectivo', 'transferencia'].includes(metodo)) {
    return res.status(400).json({ error: 'Método de pago inválido' });
  }
  if (fecha && !FECHA.test(fecha)) {
    return res.status(400).json({ error: 'Fecha inválida' });
  }
  if (fecha_vencimiento && !FECHA.test(fecha_vencimiento)) {
    return res.status(400).json({ error: 'Fecha de vencimiento inválida' });
  }
  if (fecha && fecha_vencimiento && fecha_vencimiento < fecha) {
    return res.status(400).json({ error: 'El vencimiento no puede ser anterior a la fecha de pago' });
  }

  try {
    if (user_id) {
      const cliente = await pool.query(
        "SELECT id FROM users WHERE id = $1 AND entrenador_id = $2 AND rol = 'cliente'",
        [user_id, req.user.id]
      );
      if (cliente.rows.length === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
    } else {
      const grupo = await pool.query(
        'SELECT id FROM groups WHERE id = $1 AND entrenador_id = $2',
        [group_id, req.user.id]
      );
      if (grupo.rows.length === 0) {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }
    }

    const result = await pool.query(
      `INSERT INTO payments (user_id, group_id, monto, metodo, fecha, fecha_vencimiento, entrenador_id)
       VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6::date, $7)
       RETURNING id`,
      [user_id || null, group_id || null, importe, metodo, fecha || null, fecha_vencimiento || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Borrar un pago cargado por error
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM payments WHERE id = $1 AND entrenador_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    res.json({ mensaje: 'Pago borrado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;