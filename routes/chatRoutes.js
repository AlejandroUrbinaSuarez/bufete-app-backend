const router = require('express').Router();
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { isAdmin, isLawyerOrAdmin } = require('../middlewares/roleMiddleware');

// ==================== RUTAS DE AGENTE ====================

// Obtener sesiones activas (para panel de agente)
router.get('/sessions/active', authMiddleware, isLawyerOrAdmin, chatController.getActiveSessions);

// Obtener estadísticas
router.get('/stats', authMiddleware, isAdmin, chatController.getStats);

// Obtener todas las sesiones (con paginación)
router.get('/sessions', authMiddleware, isLawyerOrAdmin, chatController.getSessions);

// Obtener una sesión por ID
router.get('/sessions/:id', authMiddleware, isLawyerOrAdmin, chatController.getSessionById);

// Asignar agente a sesión
router.put('/sessions/:id/assign', authMiddleware, isLawyerOrAdmin, chatController.assignAgent);

// Cerrar sesión
router.put('/sessions/:id/close', authMiddleware, isLawyerOrAdmin, chatController.closeSession);

// Eliminar sesión
router.delete('/sessions/:id', authMiddleware, isAdmin, chatController.deleteSession);

module.exports = router;
