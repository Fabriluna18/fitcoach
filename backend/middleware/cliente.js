function soloCliente(req, res, next) {
  if (req.user.rol !== 'cliente') {
    return res.status(403).json({ error: 'Esto es solo para clientes' });
  }
  next();
}

module.exports = soloCliente;