const express = require('express');
const pool = require('../db');
const verificarToken = require('../middleware/auth');
const soloEntrenador = require('../middleware/rol');

const router = express.Router();

router.use(verificarToken, soloEntrenador);

// Listar mis grupos con cantidad de miembros
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.id, g.nombre, g.creado_en, COUNT(gm.user_id)::int AS miembros
       FROM groups g
       LEFT JOIN group_members gm ON gm.group_id = g.id
       WHERE g.entrenador_id = $1
       GROUP BY g.id
       ORDER BY g.nombre`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Crear un grupo
router.post('/', async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: 'Falta el nombre del grupo' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO groups (nombre, entrenador_id) VALUES ($1, $2) RETURNING id, nombre, creado_en',
      [nombre, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Ver los miembros de un grupo
router.get('/:id/members', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.email
       FROM group_members gm
       JOIN groups g ON g.id = gm.group_id
       JOIN users u ON u.id = gm.user_id
       WHERE g.id = $1 AND g.entrenador_id = $2
       ORDER BY u.nombre`,
      [req.params.id, req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Agregar un cliente a un grupo
router.post('/:id/members', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'Falta el user_id' });
  }

  try {
    const grupo = await pool.query(
      'SELECT id FROM groups WHERE id = $1 AND entrenador_id = $2',
      [req.params.id, req.user.id]
    );
    if (grupo.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    const cliente = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND entrenador_id = $2 AND rol = 'cliente'",
      [user_id, req.user.id]
    );
    if (cliente.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    await pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, user_id]
    );
    res.status(201).json({ mensaje: 'Cliente agregado al grupo' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Quitar un cliente de un grupo
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM group_members
       WHERE group_id = $1 AND user_id = $2
         AND group_id IN (SELECT id FROM groups WHERE entrenador_id = $3)`,
      [req.params.id, req.params.userId, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Miembro no encontrado en el grupo' });
    }
    res.json({ mensaje: 'Cliente quitado del grupo' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;