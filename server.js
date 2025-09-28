// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();

// ----- Middleware -----
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_for_dev';

// ----- Funciones -----
function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
}

async function getUserByEmail(email) {
  const res = await db.query('SELECT id, name, email, password FROM users WHERE email = $1', [email]);
  return res.rows[0];
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token provided' });

  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Token mal formado' });

  try {
    const token = parts[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Error en authMiddleware:', err.message);
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// ----- Verificar conexión a DB -----
db.pool.connect()
  .then(() => console.log('Conexión a la base de datos exitosa'))
  .catch(err => console.error('Error conectando a la base de datos:', err.message));

// ----- ROUTES -----

// Register
app.post('/users/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Faltan campos' });

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) return res.status(400).json({ error: 'Email ya registrado' });

    const hashed = await bcrypt.hash(password, 10);
    const insert = await db.query(
      'INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING id, name, email',
      [name, email, hashed]
    );

    const user = insert.rows[0];
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('ERROR REGISTER:', err.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Login
app.post('/users/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Faltan campos' });

    const user = await getUserByEmail(email);
    if (!user) return res.status(400).json({ error: 'Credenciales inválidas' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Credenciales inválidas' });

    const token = generateToken(user);
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (err) {
    console.error('ERROR LOGIN:', err.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Crear tarea
app.post('/tasks', authMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title es requerido' });

    const userId = req.user.id;
    const result = await db.query(
      'INSERT INTO tasks (user_id, title, description) VALUES ($1,$2,$3) RETURNING *',
      [userId, title, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('ERROR CREAR TAREA:', err.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Listar tareas
app.get('/tasks/:userId', authMiddleware, async (req, res) => {
  try {
    const requestedUserId = parseInt(req.params.userId, 10);
    if (requestedUserId !== req.user.id) return res.status(403).json({ error: 'Acceso denegado' });

    const result = await db.query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC', [requestedUserId]);
    res.json(result.rows);
  } catch (err) {
    console.error('ERROR LISTAR TAREAS:', err.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Cambiar estado de tarea
app.put('/tasks/:id/status', authMiddleware, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { status } = req.body || {};

    const q = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (q.rowCount === 0) return res.status(404).json({ error: 'Tarea no encontrada' });

    const task = q.rows[0];
    if (task.user_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado' });

    const allowed = ['pending', 'in_progress', 'done'];
    let newStatus = status;

    if (!newStatus) {
      if (task.status === 'pending') newStatus = 'in_progress';
      else if (task.status === 'in_progress') newStatus = 'done';
      else return res.status(400).json({ error: 'La tarea ya está en done' });
    } else {
      if (!allowed.includes(newStatus)) return res.status(400).json({ error: 'Status inválido' });
    }

    const upd = await db.query('UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *', [newStatus, taskId]);
    res.json(upd.rows[0]);
  } catch (err) {
    console.error('ERROR ACTUALIZAR ESTADO:', err.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ----- Arranque -----
app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
