const router = require('express').Router();
const serviceController = require('../controllers/serviceController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

// ===========================================
// RUTAS PÚBLICAS
// ===========================================

// Obtener todos los servicios activos
// GET /api/services
router.get('/', serviceController.getAll);

// Obtener servicio por slug
// GET /api/services/:slug
router.get('/:slug', serviceController.getBySlug);

// ===========================================
// RUTAS DE ADMINISTRACIÓN
// ===========================================

// Obtener todos los servicios (incluye inactivos)
// GET /api/services/admin/all
router.get('/admin/all', authMiddleware, isAdmin, serviceController.getAllAdmin);

// Obtener servicio por ID
// GET /api/services/admin/:id
router.get('/admin/:id', authMiddleware, isAdmin, serviceController.getById);

// Crear servicio
// POST /api/services/admin
router.post('/admin', authMiddleware, isAdmin, serviceController.create);

// Actualizar servicio
// PUT /api/services/admin/:id
router.put('/admin/:id', authMiddleware, isAdmin, serviceController.update);

// Eliminar servicio
// DELETE /api/services/admin/:id
router.delete('/admin/:id', authMiddleware, isAdmin, serviceController.delete);

// Reordenar servicios
// PUT /api/services/admin/reorder
router.put('/admin/reorder', authMiddleware, isAdmin, serviceController.reorder);

// Toggle estado activo
// PATCH /api/services/admin/:id/toggle-active
router.patch('/admin/:id/toggle-active', authMiddleware, isAdmin, serviceController.toggleActive);

// Toggle destacado
// PATCH /api/services/admin/:id/toggle-featured
router.patch('/admin/:id/toggle-featured', authMiddleware, isAdmin, serviceController.toggleFeatured);

module.exports = router;
