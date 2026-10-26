const express = require('express');
const pool = require('../db');
const verificarToken = require('../middleware/auth');
const soloEntrenador = require('../middleware/rol');
const { fechaValida, diasEntre } = require('../fechas');

const router = express.Router();

router.use(verificarToken, soloEntrenador);

const ZONA = 'America/Argentina/Buenos_Aires';
const TIPOS = ['evaluacion', 'seguimiento', 'clase', 'otra'];

// Fecha y horas siempre en hora argentina, listas para mostrar
const CAMPOS = `
  a.id, a.titulo, a.tipo, a.notas, a.user_id, a.group_id,
  u.nombre AS cliente, g.nombre AS grupo,
  to_char(a.inicio AT TIME ZONE '${ZONA}', 'YYYY-MM-DD') AS fecha,
  to_char(a.inicio AT TIME ZONE '${ZONA}', 'HH24:MI') AS hora_inicio,
  to_char(a.fin AT TIME ZONE '${ZONA}', 'HH24:MI') AS hora_fin`;

const UNIONES = `
  LEFT JOIN users u ON u.id = a.user_id
  LEFT JOIN groups g ON g.id = a.group_id`;

// Las citas de un rango de fechas (el calendario pide el mes entero)
router.get('/', async (req, res) => {
  const { desde, hasta } = req.query;
  if (!fechaValida(desde) || !fechaValida(hasta) || hasta < desde || diasEntre(desde, hasta) > 70) {
    return res.status(400).json({ error: 'Rango de fechas inválido' });
  }

  try {
    const result = await pool.query(
      `SELECT ${CAMPOS}
       FROM appointments a ${UNIONES}
       WHERE a.entrenador_id = $1
         AND a.inicio >= ($2::date)::timestamp AT TIME ZONE '${ZONA}'
         AND a.inicio < ($3::date + 1)::timestamp AT TIME ZONE '${ZONA}'
       ORDER BY a.inicio`,
      [req.user.id, desde, hasta]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Las próximas citas, para el Inicio
router.get('/proximas', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${CAMPOS}
       FROM appointments a ${UNIONES}
       WHERE a.entrenador_id = $1 AND a.fin >= NOW()
       ORDER BY a.inicio
       LIMIT 4`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Agendar una cita con un cliente O con un grupo
router.post('/', async (req, res) => {
  const { titulo, tipo, user_id, group_id, fecha, hora, duracion, notas, forzar } = req.body;

  if (!titulo || !String(titulo).trim() || String(titulo).length > 100) {
    return res.status(400).json({ error: 'Falta el título (hasta 100 letras)' });
  }
  if (!TIPOS.includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de cita inválido' });
  }
  if ((user_id && group_id) || (!user_id && !group_id)) {
    return res.status(400).json({ error: 'La cita es con un cliente o con un grupo, no ambos ni ninguno' });
  }
  if (!fechaValida(fecha)) {
    return res.status(400).json({ error: 'Fecha inválida' });
  }
  const partes = /^(\d{2}):(\d{2})$/.exec(hora || '');
  if (!partes || Number(partes[1]) > 23 || Number(partes[2]) > 59) {
    return res.status(400).json({ error: 'Hora inválida' });
  }
  const minutos = Number(duracion);
  if (!Number.isInteger(minutos) || minutos < 15 || minutos > 480) {
    return res.status(400).json({ error: 'La duración tiene que estar entre 15 minutos y 8 horas' });
  }
  if (notas && String(notas).length > 500) {
    return res.status(400).json({ error: 'Las notas son demasiado largas (máximo 500 letras)' });
  }

  try {
    // El cliente o el grupo tiene que ser mío
    if (user_id) {
      const cliente = await pool.query(
        "SELECT id FROM users WHERE id = $1 AND entrenador_id = $2 AND rol = 'cliente'",
        [user_id, req.user.id]
      );
      if (cliente.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    } else {
      const grupo = await pool.query(
        'SELECT id FROM groups WHERE id = $1 AND entrenador_id = $2',
        [group_id, req.user.id]
      );
      if (grupo.rows.length === 0) return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    // La fecha y la hora que manda la pantalla son de Argentina; acá se vuelven un instante exacto
    const INICIO = `(($2::date + $3::time)::timestamp AT TIME ZONE '${ZONA}')`;

    // ¿Se pisa con otra cita mía?
    const choques = await pool.query(
      `SELECT ${CAMPOS}
       FROM appointments a ${UNIONES}
       WHERE a.entrenador_id = $1
         AND a.inicio < ${INICIO} + make_interval(mins => $4::int)
         AND a.fin > ${INICIO}
       ORDER BY a.inicio`,
      [req.user.id, fecha, hora, minutos]
    );
    if (choques.rows.length > 0 && !forzar) {
      return res.status(409).json({
        codigo: 'CHOQUE',
        error: 'Se pisa con otra cita',
        choques: choques.rows.map((c) => ({
          titulo: c.titulo,
          hora_inicio: c.hora_inicio,
          hora_fin: c.hora_fin,
          quien: c.cliente || c.grupo,
        })),
      });
    }

    const result = await pool.query(
      `INSERT INTO appointments (entrenador_id, user_id, group_id, titulo, tipo, inicio, fin, notas)
       VALUES ($1, $5, $6, $7, $8, ${INICIO}, ${INICIO} + make_interval(mins => $4::int), $9)
       RETURNING id`,
      [req.user.id, fecha, hora, minutos, user_id || null, group_id || null,
       String(titulo).trim(), tipo, notas ? String(notas).trim() : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Cancelar una cita
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM appointments WHERE id = $1 AND entrenador_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json({ mensaje: 'Cita cancelada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;