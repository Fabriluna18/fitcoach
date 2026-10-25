const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const verificarToken = require('../middleware/auth');
const soloEntrenador = require('../middleware/rol');
const progresoDe = require('../progress');

const AVATARES = ['hombre-1', 'hombre-2', 'hombre-3', 'mujer-1', 'mujer-2', 'mujer-3'];

const router = express.Router();

// Todas las rutas de acá piden token y rol entrenador
router.use(verificarToken, soloEntrenador);

// Listar mis clientes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, email, activo, avatar, creado_en
       FROM users
       WHERE entrenador_id = $1 AND rol = 'cliente'
       ORDER BY nombre`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Dar de alta un cliente
router.post('/', async (req, res) => {
  const { nombre, email, password, avatar } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  if (avatar && !AVATARES.includes(avatar)) {
    return res.status(400).json({ error: 'Avatar inválido' });
  }

  try {
    const existe = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'Ese email ya está registrado' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (nombre, email, password_hash, rol, entrenador_id, avatar)
       VALUES ($1, $2, $3, 'cliente', $4, $5)
       RETURNING id, nombre, email, activo, avatar`,
      [nombre, email, hash, req.user.id, avatar || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Editar nombre o dar de baja / reactivar
router.put('/:id', async (req, res) => {
  const { nombre, activo, avatar } = req.body;

  if (avatar && !AVATARES.includes(avatar)) {
    return res.status(400).json({ error: 'Avatar inválido' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET nombre = COALESCE($1, nombre),
           activo = COALESCE($2, activo),
           avatar = COALESCE($5, avatar)
       WHERE id = $3 AND entrenador_id = $4 AND rol = 'cliente'
       RETURNING id, nombre, email, activo, avatar`,
      [nombre ?? null, activo ?? null, req.params.id, req.user.id, avatar ?? null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Evolución de uno de mis clientes
router.get('/:id/progress', async (req, res) => {
  try {
    const cliente = await pool.query(
      "SELECT id, nombre FROM users WHERE id = $1 AND entrenador_id = $2 AND rol = 'cliente'",
      [req.params.id, req.user.id]
    );
    if (cliente.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({
      cliente: cliente.rows[0].nombre,
      datos: await progresoDe(cliente.rows[0].id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;