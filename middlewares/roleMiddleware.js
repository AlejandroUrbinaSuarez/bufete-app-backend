/**
 * Middleware de verificación de roles
 * Verifica que el usuario tenga uno de los roles permitidos
 * @param {...string} allowedRoles - Roles permitidos
 */
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    // Verificar que exista usuario autenticado
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado'
      });
    }

    // Verificar que el usuario tenga rol asignado
    if (!req.user.role) {
      return res.status(403).json({
        error: 'Usuario sin rol asignado'
      });
    }

    // Verificar si el rol del usuario está permitido
    const userRole = req.user.role.name;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'No tienes permisos para realizar esta acción',
        requiredRoles: allowedRoles,
        yourRole: userRole
      });
    }

    next();
  };
};

/**
 * Middleware para verificar que sea admin
 */
const isAdmin = roleMiddleware('admin');

/**
 * Middleware para verificar que sea abogado o admin
 */
const isLawyerOrAdmin = roleMiddleware('admin', 'lawyer');

/**
 * Middleware para verificar que sea cliente
 */
const isClient = roleMiddleware('client');

/**
 * Middleware para verificar que sea cualquier usuario autenticado
 */
const isAuthenticated = roleMiddleware('admin', 'lawyer', 'client');

module.exports = {
  roleMiddleware,
  isAdmin,
  isLawyerOrAdmin,
  isClient,
  isAuthenticated
};
