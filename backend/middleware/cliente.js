const pool = require('../db');

// Deja pasar solo a clientes con la cuenta activa. Si el entrenador lo dio de baja
// (o lo eliminó), la sesión se corta en el próximo pedido.
async function soloCliente(req, res, next) {
  if (req.user.rol !== 'cliente') {
    return res.status(403).json({ error: 'Esto es solo para clientes' });
  }

  try {
    const result = await pool.query(
      "SELECT activo FROM users WHERE id = $1 AND rol = 'cliente'",
      [req.user.id]
    );
    if (result.rows.length === 0 || !result.rows[0].activo) {
      return res.status(401).json({
        codigo: 'SESION_INVALIDA',
        error: 'Tu cuenta está dada de baja. Hablá con tu entrenador.',
      });
    }
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

module.exports = soloCliente;