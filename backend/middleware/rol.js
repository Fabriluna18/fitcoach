function soloEntrenador(req, res, next) {
  if (req.user.rol !== 'entrenador') {
    return res.status(403).json({ error: 'Solo los entrenadores pueden hacer esto' });
  }
  next();
}

module.exports = soloEntrenador;