require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Servir archivos estáticos
app.use(express.static('.'));

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_for_dev';

// Ruta raíz de API
app.get('/api', (req, res) => {
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

// ... el resto de tus rutas (users/register, users/login, tasks) permanecen igual

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
});
