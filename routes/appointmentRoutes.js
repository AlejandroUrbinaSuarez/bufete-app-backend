const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authMiddleware, optionalAuth } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

// ==================== RUTAS PÚBLICAS ====================

// Obtener abogados disponibles para citas
router.get('/lawyers', appointmentController.getAvailableLawyers);

// Obtener disponibilidad de un abogado para una fecha
router.get('/availability/:lawyerId', appointmentController.getAvailability);

// Crear cita (visitante o cliente autenticado)
router.post('/', optionalAuth, appointmentController.create);

// Cancelar cita (con token o autenticado)
router.post('/:id/cancel', optionalAuth, appointmentController.cancel);

// ==================== RUTAS CLIENTE AUTENTICADO ====================

// Obtener mis citas
router.get('/my', authMiddleware, appointmentController.getMyAppointments);

// ==================== RUTAS ADMIN ====================

// Estadísticas (ANTES de :id)
router.get('/admin/stats', authMiddleware, isAdmin, appointmentController.getStats);

// Gestión de slots (ANTES de :id)
router.post('/admin/slots/copy', authMiddleware, isAdmin, appointmentController.copySlots);
router.get('/admin/slots/:lawyerId', authMiddleware, isAdmin, appointmentController.getSlots);
router.post('/admin/slots', authMiddleware, isAdmin, appointmentController.createSlot);
router.put('/admin/slots/:id', authMiddleware, isAdmin, appointmentController.updateSlot);
router.delete('/admin/slots/:id', authMiddleware, isAdmin, appointmentController.deleteSlot);

// CRUD de citas
router.get('/admin', authMiddleware, isAdmin, appointmentController.getAll);
router.get('/admin/:id', authMiddleware, isAdmin, appointmentController.getById);
router.patch('/admin/:id/status', authMiddleware, isAdmin, appointmentController.updateStatus);
router.put('/admin/:id', authMiddleware, isAdmin, appointmentController.update);
router.delete('/admin/:id', authMiddleware, isAdmin, appointmentController.delete);

module.exports = router;
