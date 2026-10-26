const express = require('express');
const pool = require('../db');
const verificarToken = require('../middleware/auth');
const soloEntrenador = require('../middleware/rol');
const { hoy, sumarDias, diasEntre, fechaValida, estadoDe } = require('../fechas');

const router = express.Router();

router.use(verificarToken, soloEntrenador);

// Cuántos ejercicios lleva cada tipo de bloque: [mínimo, máximo]
const TIPOS = { normal: [1, 1], biserie: [2, 2], triserie: [3, 3], circuito: [3, 12] };

const CAMPOS_RUTINA = `
  r.id, r.nombre, r.user_id, u.nombre AS cliente, r.group_id, g.nombre AS grupo,
  to_char(r.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
  to_char(r.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
  (r.archivada_en IS NOT NULL) AS archivada`;

const formatoFecha = (f) => {
  const [a, m, d] = f.split('-');
  return `${d}/${m}/${a}`;
};

function validarBloques(bloques) {
  if (!Array.isArray(bloques) || bloques.length === 0 || bloques.length > 30) {
    return 'Agregá al menos un bloque de ejercicios';
  }
  for (const b of bloques) {
    const rango = TIPOS[b.tipo];
    if (!rango) return 'Tipo de bloque inválido';
    const [min, max] = rango;
    if (!Array.isArray(b.ejercicios) || b.ejercicios.length < min || b.ejercicios.length > max) {
      return b.tipo === 'circuito'
        ? 'Un circuito lleva entre 3 y 12 ejercicios'
        : `Un bloque ${b.tipo} lleva ${min} ejercicio${min > 1 ? 's' : ''}`;
    }
    const vueltas = Number(b.vueltas);
    if (!Number.isInteger(vueltas) || vueltas < 1 || vueltas > 20) {
      return 'Las series o vueltas tienen que estar entre 1 y 20';
    }
    const descanso = Number(b.descanso_seg);
    if (!Number.isInteger(descanso) || descanso < 0 || descanso > 900) {
      return 'El descanso tiene que estar entre 0 y 900 segundos';
    }
    for (const e of b.ejercicios) {
      if (!e.exercise_id || !Number.isInteger(Number(e.exercise_id))) return 'Falta elegir un ejercicio';
      if (!e.repeticiones || String(e.repeticiones).length > 20) return 'Cada ejercicio necesita repeticiones';
      if (e.peso_sugerido != null && e.peso_sugerido !== '') {
        const peso = Number(e.peso_sugerido);
        if (!Number.isFinite(peso) || peso < 0 || peso > 1000) return 'Peso inválido';
      }
    }
  }
  return null;
}

function leerSemanas(valor) {
  if (valor === undefined || valor === null || valor === '') return { valor: null };
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1 || n > 52) {
    return { error: 'La duración tiene que estar entre 1 y 52 semanas' };
  }
  return { valor: n };
}

// Guarda la rutina, sus bloques y sus ejercicios (se llama dentro de una transacción)
async function crearRutina(client, { entrenadorId, nombre, userId, groupId, inicio, semanas, bloques }) {
  const fin = semanas ? sumarDias(inicio, semanas * 7 - 1) : null;
  const rutina = await client.query(
    `INSERT INTO routines (nombre, entrenador_id, user_id, group_id, fecha_inicio, fecha_fin)
     VALUES ($1, $2, $3, $4, $5::date, $6::date)
     RETURNING id, nombre, user_id, group_id`,
    [nombre, entrenadorId, userId || null, groupId || null, inicio, fin]
  );
  const rutinaId = rutina.rows[0].id;

  for (let i = 0; i < bloques.length; i++) {
    const b = bloques[i];
    const bloque = await client.query(
      `INSERT INTO routine_blocks (routine_id, tipo, orden, vueltas, descanso_seg)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [rutinaId, b.tipo, i, Number(b.vueltas), Number(b.descanso_seg)]
    );
    for (let j = 0; j < b.ejercicios.length; j++) {
      const e = b.ejercicios[j];
      const peso = e.peso_sugerido === '' || e.peso_sugerido == null ? null : Number(e.peso_sugerido);
      await client.query(
        `INSERT INTO routine_exercises (routine_id, block_id, exercise_id, series, repeticiones, peso_sugerido, orden)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [rutinaId, bloque.rows[0].id, Number(e.exercise_id), Number(b.vueltas), String(e.repeticiones), peso, j]
      );
    }
  }
  return rutina.rows[0];
}

// Rutinas activas hoy de un cliente o de un grupo
async function activasDe(client, entrenadorId, userId, groupId) {
  const columna = userId ? 'user_id' : 'group_id';
  const result = await client.query(
    `SELECT id, nombre,
            to_char(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
            to_char(fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
            (archivada_en IS NOT NULL) AS archivada
     FROM routines
     WHERE entrenador_id = $1 AND archivada_en IS NULL AND ${columna} = $2`,
    [entrenadorId, userId || groupId]
  );
  const hoyStr = hoy();
  return result.rows.filter((r) => estadoDe(r, hoyStr) === 'activa');
}

// Clientes y grupos que se quedan sin rutina: por vencer o ya vencida
router.get('/alerts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${CAMPOS_RUTINA}
       FROM routines r
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN groups g ON g.id = r.group_id
       WHERE r.entrenador_id = $1 AND (r.user_id IS NULL OR u.activo)`,
      [req.user.id]
    );

    const hoyStr = hoy();
    const limite = sumarDias(hoyStr, 7);
    const destinos = new Map();

    for (const r of result.rows) {
      const clave = r.user_id ? `c${r.user_id}` : `g${r.group_id}`;
      if (!destinos.has(clave)) {
        destinos.set(clave, {
          tipo: r.user_id ? 'cliente' : 'grupo',
          id: r.user_id || r.group_id,
          nombre: r.cliente || r.grupo,
          cubiertoHasta: null,
          ultimaFin: null,
        });
      }
      const d = destinos.get(clave);
      const estado = estadoDe(r, hoyStr);
      if (estado !== 'finalizada') {
        const hasta = r.fecha_fin || '9999-12-31';
        if (!d.cubiertoHasta || hasta > d.cubiertoHasta) d.cubiertoHasta = hasta;
      } else if (!r.archivada && r.fecha_fin) {
        if (!d.ultimaFin || r.fecha_fin > d.ultimaFin) d.ultimaFin = r.fecha_fin;
      }
    }

    const alertas = [];
    for (const d of destinos.values()) {
      if (d.cubiertoHasta) {
        if (d.cubiertoHasta <= limite) {
          alertas.push({ tipo: d.tipo, id: d.id, nombre: d.nombre, estado: 'por_vencer',
            dias: diasEntre(hoyStr, d.cubiertoHasta), vence: formatoFecha(d.cubiertoHasta) });
        }
      } else if (d.ultimaFin && diasEntre(hoyStr, d.ultimaFin) >= -30) {
        alertas.push({ tipo: d.tipo, id: d.id, nombre: d.nombre, estado: 'vencida',
          dias: diasEntre(hoyStr, d.ultimaFin), vence: formatoFecha(d.ultimaFin) });
      }
    }
    alertas.sort((a, b) => a.dias - b.dias);
    res.json(alertas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Listar mis rutinas (con su estado)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${CAMPOS_RUTINA}, COUNT(re.id)::int AS ejercicios
       FROM routines r
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN groups g ON g.id = r.group_id
       LEFT JOIN routine_exercises re ON re.routine_id = r.id
       WHERE r.entrenador_id = $1
       GROUP BY r.id, u.nombre, g.nombre
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

// Ver una rutina con sus bloques y ejercicios
router.get('/:id', async (req, res) => {
  try {
    const rutina = await pool.query(
      `SELECT ${CAMPOS_RUTINA}
       FROM routines r
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN groups g ON g.id = r.group_id
       WHERE r.id = $1 AND r.entrenador_id = $2`,
      [req.params.id, req.user.id]
    );
    if (rutina.rows.length === 0) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    const bloques = await pool.query(
      `SELECT id, tipo, orden, vueltas, descanso_seg
       FROM routine_blocks WHERE routine_id = $1 ORDER BY orden, id`,
      [req.params.id]
    );
    const ejercicios = await pool.query(
      `SELECT re.id, re.block_id, re.exercise_id, e.nombre, e.musculo, e.video_url, e.video_tipo,
              re.series, re.repeticiones, re.peso_sugerido
       FROM routine_exercises re
       JOIN exercises e ON e.id = re.exercise_id
       WHERE re.routine_id = $1
       ORDER BY re.orden, re.id`,
      [req.params.id]
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

// Crear una rutina para un cliente O para un grupo
router.post('/', async (req, res) => {
  const { nombre, user_id, group_id, bloques, fecha_inicio, semanas, conflicto } = req.body;

  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ error: 'Falta el nombre de la rutina' });
  }
  if ((user_id && group_id) || (!user_id && !group_id)) {
    return res.status(400).json({ error: 'La rutina es para un cliente o para un grupo, no ambos ni ninguno' });
  }
  const errorBloques = validarBloques(bloques);
  if (errorBloques) return res.status(400).json({ error: errorBloques });

  const inicio = fecha_inicio || hoy();
  if (!fechaValida(inicio)) return res.status(400).json({ error: 'Fecha de inicio inválida' });

  const duracion = leerSemanas(semanas);
  if (duracion.error) return res.status(400).json({ error: duracion.error });

  if (conflicto && !['reemplazar', 'mantener'].includes(conflicto)) {
    return res.status(400).json({ error: 'Opción inválida' });
  }

  const client = await pool.connect();
  try {
    // El cliente o el grupo tiene que ser mío
    if (user_id) {
      const cliente = await client.query(
        "SELECT id FROM users WHERE id = $1 AND entrenador_id = $2 AND rol = 'cliente'",
        [user_id, req.user.id]
      );
      if (cliente.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    } else {
      const grupo = await client.query(
        'SELECT id FROM groups WHERE id = $1 AND entrenador_id = $2',
        [group_id, req.user.id]
      );
      if (grupo.rows.length === 0) return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    // Los ejercicios tienen que ser míos
    const ids = [...new Set(bloques.flatMap((b) => b.ejercicios.map((e) => Number(e.exercise_id))))];
    const propios = await client.query(
      'SELECT id FROM exercises WHERE id = ANY($1) AND entrenador_id = $2',
      [ids, req.user.id]
    );
    if (propios.rows.length !== ids.length) {
      return res.status(400).json({ error: 'Algún ejercicio no existe' });
    }

    // Si ya tiene una rutina activa, hay que decidir qué hacer con ella
    let activas = [];
    if (inicio <= hoy()) {
      activas = await activasDe(client, req.user.id, user_id, group_id);
      if (activas.length > 0 && !conflicto) {
        return res.status(409).json({
          codigo: 'RUTINA_ACTIVA',
          error: 'Ya tiene una rutina activa',
          activas: activas.map((a) => ({ id: a.id, nombre: a.nombre })),
        });
      }
    }

    await client.query('BEGIN');
    if (conflicto === 'reemplazar' && activas.length > 0) {
      await client.query(
        'UPDATE routines SET archivada_en = NOW() WHERE id = ANY($1)',
        [activas.map((a) => a.id)]
      );
    }
    const rutina = await crearRutina(client, {
      entrenadorId: req.user.id,
      nombre: String(nombre).trim(),
      userId: user_id,
      groupId: group_id,
      inicio,
      semanas: duracion.valor,
      bloques,
    });
    await client.query('COMMIT');

    res.status(201).json(rutina);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    client.release();
  }
});

// Renovar: copia la rutina con fechas nuevas y manda la anterior al historial
router.post('/:id/renovar', async (req, res) => {
  const { fecha_inicio, semanas } = req.body;

  const inicio = fecha_inicio || hoy();
  if (!fechaValida(inicio)) return res.status(400).json({ error: 'Fecha de inicio inválida' });

  const duracion = leerSemanas(semanas);
  if (duracion.error) return res.status(400).json({ error: duracion.error });
  if (duracion.valor === null) return res.status(400).json({ error: 'Elegí la duración de la nueva rutina' });

  const client = await pool.connect();
  try {
    const origen = await client.query(
      'SELECT id, nombre, user_id, group_id FROM routines WHERE id = $1 AND entrenador_id = $2',
      [req.params.id, req.user.id]
    );
    if (origen.rows.length === 0) return res.status(404).json({ error: 'Rutina no encontrada' });
    const o = origen.rows[0];

    const bloquesDb = await client.query(
      'SELECT id, tipo, vueltas, descanso_seg FROM routine_blocks WHERE routine_id = $1 ORDER BY orden, id',
      [o.id]
    );
    const ejerciciosDb = await client.query(
      `SELECT block_id, exercise_id, repeticiones, peso_sugerido
       FROM routine_exercises WHERE routine_id = $1 ORDER BY orden, id`,
      [o.id]
    );
    const bloques = bloquesDb.rows.map((b) => ({
      ...b,
      ejercicios: ejerciciosDb.rows.filter((e) => e.block_id === b.id),
    }));

    await client.query('BEGIN');
    await client.query(
      'UPDATE routines SET archivada_en = NOW() WHERE id = $1 AND archivada_en IS NULL',
      [o.id]
    );
    const nueva = await crearRutina(client, {
      entrenadorId: req.user.id,
      nombre: o.nombre,
      userId: o.user_id,
      groupId: o.group_id,
      inicio,
      semanas: duracion.valor,
      bloques,
    });
    await client.query('COMMIT');

    res.status(201).json(nueva);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    client.release();
  }
});

// Archivar: la rutina pasa al historial y conserva todo el progreso
router.post('/:id/archivar', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE routines SET archivada_en = NOW()
       WHERE id = $1 AND entrenador_id = $2 AND archivada_en IS NULL`,
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Rutina no encontrada o ya archivada' });
    }
    res.json({ mensaje: 'Rutina archivada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Borrar: solo si nunca tuvo registros de progreso
router.delete('/:id', async (req, res) => {
  try {
    const propia = await pool.query(
      'SELECT id FROM routines WHERE id = $1 AND entrenador_id = $2',
      [req.params.id, req.user.id]
    );
    if (propia.rows.length === 0) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    const registros = await pool.query(
      `SELECT 1 FROM progress_logs pl
       JOIN routine_exercises re ON re.id = pl.routine_exercise_id
       WHERE re.routine_id = $1 LIMIT 1`,
      [req.params.id]
    );
    if (registros.rows.length > 0) {
      return res.status(409).json({
        codigo: 'TIENE_REGISTROS',
        error: 'Esta rutina ya tiene registros de progreso, así que no se puede borrar. Archivala para guardarla en el historial.',
      });
    }

    await pool.query('DELETE FROM routines WHERE id = $1 AND entrenador_id = $2', [req.params.id, req.user.id]);
    res.json({ mensaje: 'Rutina borrada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;