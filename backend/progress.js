const pool = require('./db');

// Mejor peso de cada ejercicio por fecha, para armar los gráficos
async function progresoDe(userId) {
  const result = await pool.query(
    `SELECT e.id AS exercise_id, e.nombre AS ejercicio,
            to_char(pl.fecha, 'YYYY-MM-DD') AS fecha,
            MAX(pl.peso_real) AS peso
     FROM progress_logs pl
     JOIN routine_exercises re ON re.id = pl.routine_exercise_id
     JOIN exercises e ON e.id = re.exercise_id
     WHERE pl.user_id = $1 AND pl.peso_real IS NOT NULL
     GROUP BY e.id, e.nombre, pl.fecha
     ORDER BY pl.fecha`,
    [userId]
  );
  return result.rows.map((r) => ({ ...r, peso: Number(r.peso) }));
}

module.exports = progresoDe;