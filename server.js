require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_for_dev';

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de Tareas funcionando', 
    timestamp: new Date().toISOString() 
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    database: 'connected',
    timestamp: new Date().toISOString() 
  });
});

// Funciones de autenticación
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
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Verificar conexión a DB
db.pool.connect()
  .then(() => console.log('✅ Conexión a la base de datos exitosa'))
  .catch(err => console.error('❌ Error conectando a la base de datos:', err));

// Routes
app.post('/users/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email ya registrado' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashed]
    );

    const user = result.rows[0];
    const token = generateToken(user);
    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken(user);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
});
