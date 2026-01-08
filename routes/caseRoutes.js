const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const caseController = require('../controllers/caseController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

// Configuración de multer para documentos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/documents'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `doc-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

// ==================== RUTAS CLIENTE AUTENTICADO ====================

// Contar mensajes no leídos (ANTES de /my/:id)
router.get('/my/unread-count', authMiddleware, caseController.getUnreadCount);

// Obtener mis casos
router.get('/my', authMiddleware, caseController.getMyCases);

// Obtener detalle de mi caso
router.get('/my/:id', authMiddleware, caseController.getMyCaseById);

// Obtener mensajes de mi caso
router.get('/my/:id/messages', authMiddleware, caseController.getMyCaseMessages);

// Enviar mensaje en mi caso
router.post('/my/:id/messages', authMiddleware, caseController.sendMessage);

// Subir documento en mi caso
router.post('/my/:id/documents', authMiddleware, upload.single('file'), caseController.uploadDocument);

// Descargar documento de mi caso
router.get('/my/:caseId/documents/:docId/download', authMiddleware, caseController.downloadDocument);

// ==================== RUTAS ADMIN ====================

// Estadísticas (ANTES de /admin/:id)
router.get('/admin/stats', authMiddleware, isAdmin, caseController.getStats);

// CRUD de casos
router.get('/admin', authMiddleware, isAdmin, caseController.getAll);
router.post('/admin', authMiddleware, isAdmin, caseController.create);
router.get('/admin/:id', authMiddleware, isAdmin, caseController.getById);
router.put('/admin/:id', authMiddleware, isAdmin, caseController.update);
router.delete('/admin/:id', authMiddleware, isAdmin, caseController.delete);

// Actualizaciones de caso
router.post('/admin/:id/updates', authMiddleware, isAdmin, caseController.addUpdate);

// Mensajes de caso (admin)
router.post('/admin/:id/messages', authMiddleware, isAdmin, caseController.adminSendMessage);

// Documentos (admin)
router.post('/admin/:id/documents', authMiddleware, isAdmin, upload.single('file'), caseController.uploadDocument);
router.get('/admin/:caseId/documents/:docId/download', authMiddleware, isAdmin, caseController.downloadDocument);
router.delete('/admin/:caseId/documents/:docId', authMiddleware, isAdmin, caseController.deleteDocument);

module.exports = router;
