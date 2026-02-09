const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

// Load .env from local file or Hostinger's .builds/config/.env
const envFile = ['.env', '.builds/config/.env']
  .map(f => path.join(__dirname, f))
  .find(f => fs.existsSync(f));
require('dotenv').config(envFile ? { path: envFile } : {});

// Importar configuraciones
const corsOptions = require('./config/cors');
const sequelize = require('./config/database');

// Importar rutas
const routes = require('./routes');

// Importar middlewares
const errorHandler = require('./middlewares/errorHandler');

// Crear app de Express
const app = express();
const httpServer = createServer(app);

// Configurar Socket.io para chat en vivo
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Hacer io accesible en las rutas
app.set('io', io);

// ===========================================
// MIDDLEWARES DE SEGURIDAD
// ===========================================

// Helmet para headers de seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS
app.use(cors(corsOptions));

// Rate limiting general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana
  message: {
    error: 'Demasiadas solicitudes, por favor intenta más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Rate limiting más estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 intentos de login por ventana
  message: {
    error: 'Demasiados intentos de autenticación, por favor intenta más tarde.'
  }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ===========================================
// COMPRESIÓN GZIP
// ===========================================

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance entre velocidad y compresión
  threshold: 1024 // Solo comprimir respuestas > 1KB
}));

// ===========================================
// MIDDLEWARES DE PARSING
// ===========================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===========================================
// LOGGING
// ===========================================

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ===========================================
// ARCHIVOS ESTÁTICOS CON CACHÉ
// ===========================================

// Uploads con caché de 1 día
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true
}));

// ===========================================
// RUTAS
// ===========================================

// Rutas de la API
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    siteName: process.env.SITE_NAME
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: `API de ${process.env.SITE_NAME}`,
    version: '1.0.0',
    docs: '/api'
  });
});

// ===========================================
// MANEJO DE ERRORES
// ===========================================

// Ruta no encontrada
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Manejador de errores global
app.use(errorHandler);

// ===========================================
// SOCKET.IO - CHAT EN VIVO
// ===========================================

require('./sockets/chatHandler')(io);

// ===========================================
// INICIAR SERVIDOR
// ===========================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Verificar conexión a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida correctamente');

    // Sincronizar modelos (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Modelos sincronizados con la base de datos');
    }

    // Iniciar servidor HTTP
    httpServer.listen(PORT, () => {
      console.log(`
🚀 Servidor iniciado correctamente
📍 URL: http://localhost:${PORT}
🌍 Entorno: ${process.env.NODE_ENV}
🏢 Sitio: ${process.env.SITE_NAME}
      `);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();

module.exports = { app, io };
