const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { isAdmin, isLawyerOrAdmin } = require('../middlewares/roleMiddleware');

// Todas las rutas requieren autenticación y rol admin o abogado
router.use(authMiddleware);
router.use(isLawyerOrAdmin);

// GET /api/stats/dashboard - KPIs principales
router.get('/dashboard', statsController.getDashboardStats);

// GET /api/stats/cases - Estadísticas de casos
router.get('/cases', statsController.getCaseStats);

// GET /api/stats/appointments - Estadísticas de citas
router.get('/appointments', statsController.getAppointmentStats);

// GET /api/stats/recent - Actividad reciente
router.get('/recent', statsController.getRecentActivity);

// GET /api/stats/content - Estadísticas de contenido (solo admin)
router.get('/content', isAdmin, statsController.getContentStats);

module.exports = router;
