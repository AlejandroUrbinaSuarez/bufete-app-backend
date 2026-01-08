const router = require('express').Router();
const successCaseController = require('../controllers/successCaseController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

// ===========================================
// RUTAS PÚBLICAS
// ===========================================

// Obtener todos los casos de éxito activos
// GET /api/success-cases
router.get('/', successCaseController.getAll);

// Obtener caso de éxito por slug
// GET /api/success-cases/:slug
router.get('/:slug', successCaseController.getBySlug);

// ===========================================
// RUTAS DE ADMINISTRACIÓN
// ===========================================

// Obtener todos los casos (incluye inactivos)
// GET /api/success-cases/admin/all
router.get('/admin/all', authMiddleware, isAdmin, successCaseController.getAllAdmin);

// Obtener caso por ID
// GET /api/success-cases/admin/:id
router.get('/admin/:id', authMiddleware, isAdmin, successCaseController.getById);

// Crear caso de éxito
// POST /api/success-cases/admin
router.post('/admin', authMiddleware, isAdmin, successCaseController.create);

// Reordenar casos (DEBE IR ANTES de rutas con :id)
// PUT /api/success-cases/admin/reorder
router.put('/admin/reorder', authMiddleware, isAdmin, successCaseController.reorder);

// Actualizar caso de éxito
// PUT /api/success-cases/admin/:id
router.put('/admin/:id', authMiddleware, isAdmin, successCaseController.update);

// Eliminar caso de éxito
// DELETE /api/success-cases/admin/:id
router.delete('/admin/:id', authMiddleware, isAdmin, successCaseController.delete);

// Toggle estado activo
// PATCH /api/success-cases/admin/:id/toggle-active
router.patch('/admin/:id/toggle-active', authMiddleware, isAdmin, successCaseController.toggleActive);

// Toggle destacado
// PATCH /api/success-cases/admin/:id/toggle-featured
router.patch('/admin/:id/toggle-featured', authMiddleware, isAdmin, successCaseController.toggleFeatured);

module.exports = router;
