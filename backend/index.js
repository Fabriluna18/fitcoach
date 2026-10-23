const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const clientRoutes = require('./routes/clients');
app.use('/api/clients', clientRoutes);

const groupRoutes = require('./routes/groups');
app.use('/api/groups', groupRoutes);

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