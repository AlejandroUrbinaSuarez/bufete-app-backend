const router = require('express').Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword
} = require('../middlewares/validator');

// Registro
router.post('/register', validateRegister, authController.register);

// Login
router.post('/login', validateLogin, authController.login);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Logout
router.post('/logout', authMiddleware, authController.logout);

// Obtener usuario actual
router.get('/me', authMiddleware, authController.getCurrentUser);

// Actualizar perfil
router.put('/profile', authMiddleware, authController.updateProfile);

// Cambiar contraseña
router.put('/change-password', authMiddleware, authController.changePassword);

// Verificar email
router.get('/verify-email/:token', authController.verifyEmail);

// Recuperar contraseña
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);

// Restablecer contraseña
router.post('/reset-password', validateResetPassword, authController.resetPassword);

module.exports = router;
