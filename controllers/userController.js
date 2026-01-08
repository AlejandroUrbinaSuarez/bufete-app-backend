const { User, Role } = require('../models');

class UserController {
  /**
   * Obtener lista de usuarios (para admin)
   * GET /api/users/admin/list
   */
  async getList(req, res, next) {
    try {
      const users = await User.findAll({
        include: [{
          model: Role,
          as: 'role',
          attributes: ['name']
        }],
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'is_active'],
        where: { is_active: true },
        order: [['first_name', 'ASC'], ['last_name', 'ASC']]
      });

      // Transformar para incluir el rol como string
      const transformedUsers = users.map(user => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        is_active: user.is_active,
        role: user.role?.name || 'client'
      }));

      res.json(transformedUsers);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener todos los usuarios con paginación (para admin)
   * GET /api/users/admin
   */
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20, role, search } = req.query;
      const offset = (page - 1) * limit;

      const where = {};

      // Filtrar por rol si se especifica
      if (role) {
        const roleRecord = await Role.findOne({ where: { name: role } });
        if (roleRecord) {
          where.role_id = roleRecord.id;
        }
      }

      // Búsqueda por nombre o email
      if (search) {
        const { Op } = require('sequelize');
        where[Op.or] = [
          { first_name: { [Op.like]: `%${search}%` } },
          { last_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        include: [{
          model: Role,
          as: 'role',
          attributes: ['name']
        }],
        attributes: { exclude: ['password_hash', 'email_verification_token', 'password_reset_token'] },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      res.json({
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener usuario por ID
   * GET /api/users/admin/:id
   */
  async getById(req, res, next) {
    try {
      const user = await User.findByPk(req.params.id, {
        include: [{
          model: Role,
          as: 'role'
        }],
        attributes: { exclude: ['password_hash', 'email_verification_token', 'password_reset_token'] }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar usuario
   * PUT /api/users/admin/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { first_name, last_name, phone, is_active, role_id } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      await user.update({
        first_name: first_name || user.first_name,
        last_name: last_name || user.last_name,
        phone: phone !== undefined ? phone : user.phone,
        is_active: is_active !== undefined ? is_active : user.is_active,
        role_id: role_id || user.role_id
      });

      const updatedUser = await User.findByPk(id, {
        include: [{ model: Role, as: 'role' }],
        attributes: { exclude: ['password_hash'] }
      });

      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Desactivar usuario
   * DELETE /api/users/admin/:id
   */
  async deactivate(req, res, next) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // No eliminar, solo desactivar
      await user.update({ is_active: false });

      res.json({ message: 'Usuario desactivado' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
