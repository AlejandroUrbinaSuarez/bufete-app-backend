const router = require('express').Router();
const contactController = require('../controllers/contactController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

// ===========================================
// RUTAS PÚBLICAS
// ===========================================

// Enviar mensaje de contacto
// POST /api/contact
router.post('/', contactController.create);

// ===========================================
// RUTAS DE ADMINISTRACIÓN
// ===========================================

// Obtener estadísticas
// GET /api/contact/admin/stats
router.get('/admin/stats', authMiddleware, isAdmin, contactController.getStats);

// Obtener todos los mensajes
// GET /api/contact/admin
router.get('/admin', authMiddleware, isAdmin, contactController.getAll);

// Obtener mensaje por ID
// GET /api/contact/admin/:id
router.get('/admin/:id', authMiddleware, isAdmin, contactController.getById);

// Actualizar estado
// PATCH /api/contact/admin/:id/status
router.patch('/admin/:id/status', authMiddleware, isAdmin, contactController.updateStatus);

// Asignar a usuario
// PATCH /api/contact/admin/:id/assign
router.patch('/admin/:id/assign', authMiddleware, isAdmin, contactController.assign);

// Responder mensaje
// POST /api/contact/admin/:id/respond
router.post('/admin/:id/respond', authMiddleware, isAdmin, contactController.respond);

// Eliminar mensaje
// DELETE /api/contact/admin/:id
router.delete('/admin/:id', authMiddleware, isAdmin, contactController.delete);

module.exports = router;
