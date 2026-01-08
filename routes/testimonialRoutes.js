const router = require('express').Router();
const testimonialController = require('../controllers/testimonialController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

// ===========================================
// RUTAS PÚBLICAS
// ===========================================

// Obtener todos los testimonios activos
// GET /api/testimonials
router.get('/', testimonialController.getAll);

// Obtener testimonio por ID
// GET /api/testimonials/:id
router.get('/:id', testimonialController.getById);

// ===========================================
// RUTAS DE ADMINISTRACIÓN
// ===========================================

// Obtener todos los testimonios (incluye inactivos)
// GET /api/testimonials/admin/all
router.get('/admin/all', authMiddleware, isAdmin, testimonialController.getAllAdmin);

// Obtener testimonio por ID
// GET /api/testimonials/admin/:id
router.get('/admin/:id', authMiddleware, isAdmin, testimonialController.getByIdAdmin);

// Crear testimonio
// POST /api/testimonials/admin
router.post('/admin', authMiddleware, isAdmin, testimonialController.create);

// Reordenar testimonios (DEBE IR ANTES de rutas con :id)
// PUT /api/testimonials/admin/reorder
router.put('/admin/reorder', authMiddleware, isAdmin, testimonialController.reorder);

// Actualizar testimonio
// PUT /api/testimonials/admin/:id
router.put('/admin/:id', authMiddleware, isAdmin, testimonialController.update);

// Eliminar testimonio
// DELETE /api/testimonials/admin/:id
router.delete('/admin/:id', authMiddleware, isAdmin, testimonialController.delete);

// Toggle estado activo
// PATCH /api/testimonials/admin/:id/toggle-active
router.patch('/admin/:id/toggle-active', authMiddleware, isAdmin, testimonialController.toggleActive);

// Toggle destacado
// PATCH /api/testimonials/admin/:id/toggle-featured
router.patch('/admin/:id/toggle-featured', authMiddleware, isAdmin, testimonialController.toggleFeatured);

module.exports = router;
