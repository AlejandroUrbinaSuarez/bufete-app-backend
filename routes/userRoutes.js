const router = require('express').Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

// ==================== RUTAS ADMIN ====================

// Lista simplificada de usuarios (para selects)
router.get('/admin/list', authMiddleware, isAdmin, userController.getList);

// Obtener todos los usuarios con paginación
router.get('/admin', authMiddleware, isAdmin, userController.getAll);

// Obtener usuario por ID
router.get('/admin/:id', authMiddleware, isAdmin, userController.getById);

// Actualizar usuario
router.put('/admin/:id', authMiddleware, isAdmin, userController.update);

// Desactivar usuario
router.delete('/admin/:id', authMiddleware, isAdmin, userController.deactivate);

module.exports = router;
