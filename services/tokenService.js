const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const jwtConfig = require('../config/jwt');

class TokenService {
  /**
   * Genera un access token JWT
   * @param {Object} user - Usuario con role
   * @returns {string} Access token
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role ? user.role.name : null
      },
      jwtConfig.accessToken.secret,
      { expiresIn: jwtConfig.accessToken.expiresIn }
    );
  }

  /**
   * Genera un refresh token JWT
   * @param {Object} user - Usuario
   * @returns {string} Refresh token
   */
  generateRefreshToken(user) {
    return jwt.sign(
      { userId: user.id },
      jwtConfig.refreshToken.secret,
      { expiresIn: jwtConfig.refreshToken.expiresIn }
    );
  }

  /**
   * Verifica un access token
   * @param {string} token - Token a verificar
   * @returns {Object} Payload decodificado
   */
  verifyAccessToken(token) {
    return jwt.verify(token, jwtConfig.accessToken.secret);
  }

  /**
   * Verifica un refresh token
   * @param {string} token - Token a verificar
   * @returns {Object} Payload decodificado
   */
  verifyRefreshToken(token) {
    return jwt.verify(token, jwtConfig.refreshToken.secret);
  }

  /**
   * Genera un token aleatorio para verificación de email, reset de password, etc.
   * @param {number} length - Longitud en bytes (default 32)
   * @returns {string} Token hexadecimal
   */
  generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Calcula la fecha de expiración del refresh token
   * @returns {Date} Fecha de expiración
   */
  getRefreshTokenExpiration() {
    const expiresIn = jwtConfig.refreshToken.expiresIn;
    const ms = this.parseExpiration(expiresIn);
    return new Date(Date.now() + ms);
  }

  /**
   * Convierte string de expiración a milisegundos
   * @param {string} expiration - Ej: '7d', '15m', '1h'
   * @returns {number} Milisegundos
   */
  parseExpiration(expiration) {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };

    return value * multipliers[unit];
  }
}

module.exports = new TokenService();
