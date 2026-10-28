const express = require('express');
const pool = require('../db');
const verificarToken = require('../middleware/auth');
const soloEntrenador = require('../middleware/rol');

const router = express.Router();

router.use(verificarToken, soloEntrenador);

// Devuelve el cliente si es mío, o null
async function clienteMio(clienteId, entrenadorId) {
  const id = Number.parseInt(clienteId, 10);
  if (!Number.isInteger(id)) return null;
  const result = await pool.query(
    "SELECT id, nombre, activo FROM users WHERE id = $1 AND entrenador_id = $2 AND rol = 'cliente'",
    [id, entrenadorId]
  );
  return result.rows[0] || null;
}

// Cantidad de mensajes sin leer de todos mis clientes (para el globito del menú)
router.get('/resumen', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS no_leidos
       FROM messages
       WHERE entrenador_id = $1 AND remitente_id = cliente_id AND leido_en IS NULL`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Lista de conversaciones: mis clientes con su último mensaje y los no leídos
router.get('/conversaciones', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.avatar, u.activo,
              l.texto AS ultimo_texto, l.remitente_id AS ultimo_remitente, l.creado_en AS ultimo_en,
              COALESCE(nl.cant, 0)::int AS no_leidos
       FROM users u
       LEFT JOIN LATERAL (
         SELECT texto, remitente_id, creado_en FROM messages m
         WHERE m.entrenador_id = $1 AND m.cliente_id = u.id
         ORDER BY m.id DESC LIMIT 1
       ) l ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS cant FROM messages m
         WHERE m.entrenador_id = $1 AND m.cliente_id = u.id
           AND m.remitente_id = u.id AND m.leido_en IS NULL
       ) nl ON TRUE
       WHERE u.entrenador_id = $1 AND u.rol = 'cliente' AND (u.activo OR l.texto IS NOT NULL)
       ORDER BY l.creado_en DESC NULLS LAST, u.nombre`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Leer la conversación con un cliente (con ?despues=ID trae solo los nuevos)
router.get('/con/:clienteId', async (req, res) => {
  const despues = Number.parseInt(req.query.despues, 10) || 0;

  try {
    const cliente = await clienteMio(req.params.clienteId, req.user.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    // Al abrir la conversación, lo que mandó el cliente queda como leído
    await pool.query(
      `UPDATE messages SET leido_en = NOW()
       WHERE entrenador_id = $1 AND cliente_id = $2 AND remitente_id = $2 AND leido_en IS NULL`,
      [req.user.id, cliente.id]
    );

    const result = await pool.query(
      `SELECT id, remitente_id, texto, creado_en FROM (
         SELECT id, remitente_id, texto, creado_en FROM messages
         WHERE entrenador_id = $1 AND cliente_id = $2 AND id > $3
         ORDER BY id DESC LIMIT 200
       ) t
       ORDER BY id`,
      [req.user.id, cliente.id, despues]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Mandarle un mensaje a un cliente
router.post('/con/:clienteId', async (req, res) => {
  const texto = typeof req.body.texto === 'string' ? req.body.texto.trim() : '';
  if (!texto || texto.length > 1000) {
    return res.status(400).json({ error: 'El mensaje tiene que tener entre 1 y 1000 letras' });
  }

  try {
    const cliente = await clienteMio(req.params.clienteId, req.user.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    if (!cliente.activo) {
      return res.status(403).json({ error: 'Este cliente está dado de baja' });
    }

    const reciente = await pool.query(
      "SELECT COUNT(*)::int AS n FROM messages WHERE remitente_id = $1 AND creado_en > NOW() - interval '1 minute'",
      [req.user.id]
    );
    if (reciente.rows[0].n >= 20) {
      return res.status(429).json({ error: 'Estás enviando muchos mensajes seguidos. Esperá un momento.' });
    }

    const result = await pool.query(
      `INSERT INTO messages (entrenador_id, cliente_id, remitente_id, texto)
       VALUES ($1, $2, $1, $3)
       RETURNING id`,
      [req.user.id, cliente.id, texto]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;