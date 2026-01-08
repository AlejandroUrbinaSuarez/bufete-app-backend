const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

/**
 * Middleware de autenticación
 * Verifica el token JWT y agrega el usuario a req.user
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de acceso no proporcionado'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Buscar usuario
    const user = await User.findByPk(decoded.userId, {
      include: [{
        model: Role,
        as: 'role'
      }],
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Usuario no encontrado'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Cuenta desactivada'
      });
    }

    // Agregar usuario a la request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token inválido'
      });
    }

    next(error);
  }
};

/**
 * Middleware opcional de autenticación
 * No falla si no hay token, pero agrega usuario si existe
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findByPk(decoded.userId, {
      include: [{
        model: Role,
        as: 'role'
      }],
      attributes: { exclude: ['password_hash'] }
    });

    if (user && user.is_active) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Ignorar errores de token y continuar sin usuario
    next();
  }
};

module.exports = { authMiddleware, optionalAuth };
