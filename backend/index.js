const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const origenes = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
app.use(cors({ origin: origenes }));
app.use(express.json());

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const clientRoutes = require('./routes/clients');
app.use('/api/clients', clientRoutes);

const groupRoutes = require('./routes/groups');
app.use('/api/groups', groupRoutes);

const exerciseRoutes = require('./routes/exercises');
app.use('/api/exercises', exerciseRoutes);

const routineRoutes = require('./routes/routines');
app.use('/api/routines', routineRoutes);

const meRoutes = require('./routes/me');
app.use('/api/me', meRoutes);

const paymentRoutes = require('./routes/payments');
app.use('/api/payments', paymentRoutes);

const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

const uploadRoutes = require('./routes/uploads');
app.use('/api/uploads', uploadRoutes);

app.get('/', (req, res) => {
  res.json({ mensaje: 'API de FitCoach funcionando' });
});

const pool = require('./db');

app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ conectado: true, hora: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ conectado: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});