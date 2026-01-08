const router = require('express').Router();
const lawyerController = require('../controllers/lawyerController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

// ===========================================
// RUTAS PÚBLICAS
// ===========================================

// Obtener todos los abogados activos
// GET /api/lawyers
router.get('/', lawyerController.getAll);

// Obtener abogado por slug
// GET /api/lawyers/:slug
router.get('/:slug', lawyerController.getBySlug);

// ===========================================
// RUTAS DE ADMINISTRACIÓN
// ===========================================

// Obtener todos los abogados (incluye inactivos)
// GET /api/lawyers/admin/all
router.get('/admin/all', authMiddleware, isAdmin, lawyerController.getAllAdmin);

// Obtener abogado por ID
// GET /api/lawyers/admin/:id
router.get('/admin/:id', authMiddleware, isAdmin, lawyerController.getById);

// Crear abogado
// POST /api/lawyers/admin
router.post('/admin', authMiddleware, isAdmin, lawyerController.create);

// Actualizar abogado
// PUT /api/lawyers/admin/:id
router.put('/admin/:id', authMiddleware, isAdmin, lawyerController.update);

// Eliminar abogado
// DELETE /api/lawyers/admin/:id
router.delete('/admin/:id', authMiddleware, isAdmin, lawyerController.delete);

// Reordenar abogados
// PUT /api/lawyers/admin/reorder
router.put('/admin/reorder', authMiddleware, isAdmin, lawyerController.reorder);

// Toggle estado activo
// PATCH /api/lawyers/admin/:id/toggle-active
router.patch('/admin/:id/toggle-active', authMiddleware, isAdmin, lawyerController.toggleActive);

module.exports = router;
