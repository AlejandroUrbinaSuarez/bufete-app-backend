const router = require('express').Router();
const settingsController = require('../controllers/settingsController');

// Ruta pública - obtener configuración de contacto
router.get('/public', settingsController.getPublicSettings);

module.exports = router;
