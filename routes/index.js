const router = require('express').Router();

// Importar rutas
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const serviceRoutes = require('./serviceRoutes');
const lawyerRoutes = require('./lawyerRoutes');
const blogRoutes = require('./blogRoutes');
const contactRoutes = require('./contactRoutes');
const testimonialRoutes = require('./testimonialRoutes');
const successCaseRoutes = require('./successCaseRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const caseRoutes = require('./caseRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const settingsRoutes = require('./settingsRoutes');
const chatRoutes = require('./chatRoutes');
const statsRoutes = require('./statsRoutes');

// ===========================================
// RUTAS PÚBLICAS
// ===========================================

// Autenticación
router.use('/auth', authRoutes);

// Servicios legales
router.use('/services', serviceRoutes);

// Abogados/Equipo
router.use('/lawyers', lawyerRoutes);

// Blog
router.use('/blog', blogRoutes);

// Contacto
router.use('/contact', contactRoutes);

// Testimonios
router.use('/testimonials', testimonialRoutes);

// Casos de éxito
router.use('/success-cases', successCaseRoutes);

// Citas
router.use('/appointments', appointmentRoutes);

// ===========================================
// RUTAS PROTEGIDAS
// ===========================================

// Usuarios
router.use('/users', userRoutes);

// Casos (portal de clientes)
router.use('/cases', caseRoutes);

// Dashboard admin
router.use('/dashboard', dashboardRoutes);

// Configuración del sitio
router.use('/settings', settingsRoutes);

// Chat en vivo
router.use('/chat', chatRoutes);

// Estadísticas (admin/abogado)
router.use('/stats', statsRoutes);

// ===========================================
// INFO DE LA API
// ===========================================

router.get('/', (req, res) => {
  res.json({
    name: `API de ${process.env.SITE_NAME}`,
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      services: '/api/services',
      lawyers: '/api/lawyers',
      blog: '/api/blog',
      contact: '/api/contact',
      testimonials: '/api/testimonials',
      successCases: '/api/success-cases',
      appointments: '/api/appointments',
      users: '/api/users (protegido)',
      cases: '/api/cases (protegido)',
      dashboard: '/api/dashboard (admin)',
      settings: '/api/settings (admin)'
    }
  });
});

module.exports = router;
