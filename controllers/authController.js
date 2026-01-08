const { User, Role, RefreshToken, AuditLog } = require('../models');
const tokenService = require('../services/tokenService');
const emailService = require('../services/emailService');
const { Op } = require('sequelize');

class AuthController {
  /**
   * Registro de nuevo usuario
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { email, password, first_name, last_name, phone } = req.body;

      // Verificar si el email ya existe
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          error: 'El email ya está registrado'
        });
      }

      // Obtener rol de cliente
      const clientRole = await Role.findOne({ where: { name: 'client' } });
      if (!clientRole) {
        return res.status(500).json({
          error: 'Error de configuración del sistema'
        });
      }

      // Generar token de verificación
      const verificationToken = tokenService.generateRandomToken();

      // Crear usuario
      const user = await User.create({
        email,
        password_hash: password, // El hook se encarga del hash
        first_name,
        last_name,
        phone,
        role_id: clientRole.id,
        email_verification_token: verificationToken
      });

      // Enviar email de verificación
      try {
        await emailService.sendVerificationEmail(user, verificationToken);
      } catch (emailError) {
        console.error('Error enviando email de verificación:', emailError);
        // No falla el registro si el email falla
      }

      // Log de auditoría
      await AuditLog.log({
        userId: user.id,
        action: 'register',
        entityType: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'Registro exitoso. Por favor verifica tu email.',
        userId: user.id
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Inicio de sesión
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Buscar usuario con su rol
      const user = await User.findOne({
        where: { email },
        include: [{
          model: Role,
          as: 'role'
        }]
      });

      // Verificar usuario existe
      if (!user) {
        return res.status(401).json({
          error: 'Credenciales inválidas'
        });
      }

      // Verificar cuenta activa
      if (!user.is_active) {
        return res.status(401).json({
          error: 'Tu cuenta ha sido desactivada'
        });
      }

      // Verificar contraseña
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Credenciales inválidas'
        });
      }

      // Generar tokens
      const accessToken = tokenService.generateAccessToken(user);
      const refreshToken = tokenService.generateRefreshToken(user);

      // Guardar refresh token en BD
      await RefreshToken.create({
        user_id: user.id,
        token: refreshToken,
        expires_at: tokenService.getRefreshTokenExpiration()
      });

      // Actualizar último login
      await user.update({ last_login: new Date() });

      // Log de auditoría
      await AuditLog.log({
        userId: user.id,
        action: 'login',
        entityType: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Inicio de sesión exitoso',
        accessToken,
        refreshToken,
        user: user.toPublicJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refrescar access token
   * POST /api/auth/refresh-token
   */
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Refresh token requerido'
        });
      }

      // Buscar token en BD
      const storedToken = await RefreshToken.findOne({
        where: {
          token: refreshToken,
          is_revoked: false,
          expires_at: { [Op.gt]: new Date() }
        },
        include: [{
          model: User,
          as: 'user',
          include: [{
            model: Role,
            as: 'role'
          }]
        }]
      });

      if (!storedToken) {
        return res.status(401).json({
          error: 'Token inválido o expirado'
        });
      }

      // Verificar que el usuario sigue activo
      if (!storedToken.user.is_active) {
        await storedToken.update({ is_revoked: true });
        return res.status(401).json({
          error: 'Usuario desactivado'
        });
      }

      // Revocar token actual
      await storedToken.update({ is_revoked: true });

      // Generar nuevos tokens
      const newAccessToken = tokenService.generateAccessToken(storedToken.user);
      const newRefreshToken = tokenService.generateRefreshToken(storedToken.user);

      // Guardar nuevo refresh token
      await RefreshToken.create({
        user_id: storedToken.user.id,
        token: newRefreshToken,
        expires_at: tokenService.getRefreshTokenExpiration()
      });

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cerrar sesión
   * POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Revocar el refresh token
        await RefreshToken.update(
          { is_revoked: true },
          { where: { token: refreshToken } }
        );
      }

      // Log de auditoría
      if (req.user) {
        await AuditLog.log({
          userId: req.user.id,
          action: 'logout',
          entityType: 'User',
          entityId: req.user.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      res.json({
        message: 'Sesión cerrada exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener usuario actual
   * GET /api/auth/me
   */
  async getCurrentUser(req, res, next) {
    try {
      const user = await User.findByPk(req.user.id, {
        include: [{
          model: Role,
          as: 'role'
        }],
        attributes: { exclude: ['password_hash'] }
      });

      if (!user) {
        return res.status(404).json({
          error: 'Usuario no encontrado'
        });
      }

      res.json(user.toPublicJSON());
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verificar email
   * GET /api/auth/verify-email/:token
   */
  async verifyEmail(req, res, next) {
    try {
      const { token } = req.params;

      const user = await User.findOne({
        where: { email_verification_token: token }
      });

      if (!user) {
        return res.status(400).json({
          error: 'Token de verificación inválido'
        });
      }

      if (user.email_verified) {
        return res.status(400).json({
          error: 'El email ya fue verificado'
        });
      }

      // Verificar email
      await user.update({
        email_verified: true,
        email_verification_token: null
      });

      // Enviar email de bienvenida
      try {
        await emailService.sendWelcomeEmail(user);
      } catch (emailError) {
        console.error('Error enviando email de bienvenida:', emailError);
      }

      res.json({
        message: 'Email verificado exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Solicitar recuperación de contraseña
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ where: { email } });

      // Siempre responder igual para no revelar si el email existe
      const successMessage = 'Si el email existe, recibirás un enlace para restablecer tu contraseña.';

      if (!user) {
        return res.json({ message: successMessage });
      }

      // Generar token de reset
      const resetToken = tokenService.generateRandomToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await user.update({
        password_reset_token: resetToken,
        password_reset_expires: resetExpires
      });

      // Enviar email
      try {
        await emailService.sendPasswordResetEmail(user, resetToken);
      } catch (emailError) {
        console.error('Error enviando email de reset:', emailError);
      }

      res.json({ message: successMessage });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restablecer contraseña
   * POST /api/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;

      const user = await User.findOne({
        where: {
          password_reset_token: token,
          password_reset_expires: { [Op.gt]: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({
          error: 'Token inválido o expirado'
        });
      }

      // Actualizar contraseña
      await user.update({
        password_hash: password, // El hook se encarga del hash
        password_reset_token: null,
        password_reset_expires: null
      });

      // Revocar todos los refresh tokens del usuario
      await RefreshToken.update(
        { is_revoked: true },
        { where: { user_id: user.id } }
      );

      // Log de auditoría
      await AuditLog.log({
        userId: user.id,
        action: 'password_reset',
        entityType: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Contraseña restablecida exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar perfil del usuario
   * PUT /api/auth/profile
   */
  async updateProfile(req, res, next) {
    try {
      const { first_name, last_name, phone } = req.body;

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          error: 'Usuario no encontrado'
        });
      }

      // Actualizar datos
      await user.update({
        first_name: first_name || user.first_name,
        last_name: last_name || user.last_name,
        phone: phone !== undefined ? phone : user.phone
      });

      // Log de auditoría
      await AuditLog.log({
        userId: user.id,
        action: 'profile_update',
        entityType: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Obtener usuario actualizado con rol
      const updatedUser = await User.findByPk(user.id, {
        include: [{ model: Role, as: 'role' }],
        attributes: { exclude: ['password_hash'] }
      });

      res.json({
        message: 'Perfil actualizado exitosamente',
        user: updatedUser.toPublicJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cambiar contraseña del usuario
   * PUT /api/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { current_password, new_password } = req.body;

      if (!current_password || !new_password) {
        return res.status(400).json({
          error: 'Se requieren la contraseña actual y la nueva'
        });
      }

      if (new_password.length < 8) {
        return res.status(400).json({
          error: 'La nueva contraseña debe tener al menos 8 caracteres'
        });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          error: 'Usuario no encontrado'
        });
      }

      // Verificar contraseña actual
      const isValid = await user.verifyPassword(current_password);
      if (!isValid) {
        return res.status(400).json({
          error: 'La contraseña actual es incorrecta'
        });
      }

      // Actualizar contraseña
      await user.update({
        password_hash: new_password // El hook se encarga del hash
      });

      // Log de auditoría
      await AuditLog.log({
        userId: user.id,
        action: 'password_change',
        entityType: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Contraseña actualizada exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
