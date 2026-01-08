const { Lawyer, Service, User, AuditLog } = require('../models');
const slugify = require('slugify');
const { Op } = require('sequelize');

class LawyerController {
  /**
   * Obtener todos los abogados (público - solo activos)
   * GET /api/lawyers
   */
  async getAll(req, res, next) {
    try {
      const lawyers = await Lawyer.findAll({
        where: { is_active: true },
        include: [{ model: Service, as: 'services', through: { attributes: [] } }],
        order: [['display_order', 'ASC'], ['full_name', 'ASC']]
      });

      res.json(lawyers);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener abogado por slug (público)
   * GET /api/lawyers/:slug
   */
  async getBySlug(req, res, next) {
    try {
      const lawyer = await Lawyer.findOne({
        where: { slug: req.params.slug, is_active: true },
        include: [{ model: Service, as: 'services', through: { attributes: [] } }]
      });

      if (!lawyer) {
        return res.status(404).json({ error: 'Abogado no encontrado' });
      }

      res.json(lawyer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener todos los abogados (admin - incluye inactivos)
   * GET /api/admin/lawyers
   */
  async getAllAdmin(req, res, next) {
    try {
      const lawyers = await Lawyer.findAll({
        include: [
          { model: Service, as: 'services', through: { attributes: [] } },
          { model: User, as: 'user', attributes: ['id', 'email', 'first_name', 'last_name'] }
        ],
        order: [['display_order', 'ASC'], ['full_name', 'ASC']]
      });

      res.json(lawyers);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener abogado por ID (admin)
   * GET /api/admin/lawyers/:id
   */
  async getById(req, res, next) {
    try {
      const lawyer = await Lawyer.findByPk(req.params.id, {
        include: [
          { model: Service, as: 'services', through: { attributes: [] } },
          { model: User, as: 'user', attributes: ['id', 'email', 'first_name', 'last_name'] }
        ]
      });

      if (!lawyer) {
        return res.status(404).json({ error: 'Abogado no encontrado' });
      }

      res.json(lawyer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crear abogado
   * POST /api/admin/lawyers
   */
  async create(req, res, next) {
    try {
      const {
        user_id,
        full_name,
        specialty,
        bar_number,
        photo_url,
        bio,
        experience_years,
        education,
        languages,
        email,
        phone,
        linkedin_url,
        is_active,
        display_order,
        service_ids
      } = req.body;

      // Generar slug único
      let slug = slugify(full_name, { lower: true, strict: true });
      const existingSlug = await Lawyer.findOne({ where: { slug } });
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
      }

      // Verificar si user_id ya está asignado
      if (user_id) {
        const existingUserLawyer = await Lawyer.findOne({ where: { user_id } });
        if (existingUserLawyer) {
          return res.status(400).json({ error: 'Este usuario ya tiene un perfil de abogado' });
        }
      }

      const lawyer = await Lawyer.create({
        user_id,
        full_name,
        slug,
        specialty,
        bar_number,
        photo_url,
        bio,
        experience_years,
        education,
        languages: Array.isArray(languages) ? languages.join(', ') : languages,
        email,
        phone,
        linkedin_url,
        is_active: is_active !== false,
        display_order: display_order || 0
      });

      // Asociar servicios
      if (service_ids && service_ids.length > 0) {
        const services = await Service.findAll({ where: { id: service_ids } });
        await lawyer.setServices(services);
      }

      // Recargar con relaciones
      await lawyer.reload({
        include: [{ model: Service, as: 'services', through: { attributes: [] } }]
      });

      // Log de auditoría
      await AuditLog.log({
        userId: req.user.id,
        action: 'create',
        entityType: 'Lawyer',
        entityId: lawyer.id,
        newValues: lawyer.toJSON(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'Abogado creado exitosamente',
        lawyer
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar abogado
   * PUT /api/admin/lawyers/:id
   */
  async update(req, res, next) {
    try {
      const lawyer = await Lawyer.findByPk(req.params.id);

      if (!lawyer) {
        return res.status(404).json({ error: 'Abogado no encontrado' });
      }

      const oldValues = lawyer.toJSON();

      const {
        user_id,
        full_name,
        specialty,
        bar_number,
        photo_url,
        bio,
        experience_years,
        education,
        languages,
        email,
        phone,
        linkedin_url,
        is_active,
        display_order,
        service_ids
      } = req.body;

      // Actualizar slug si cambió el nombre
      let slug = lawyer.slug;
      if (full_name && full_name !== lawyer.full_name) {
        slug = slugify(full_name, { lower: true, strict: true });
        const existingSlug = await Lawyer.findOne({
          where: { slug, id: { [Op.ne]: lawyer.id } }
        });
        if (existingSlug) {
          slug = `${slug}-${Date.now()}`;
        }
      }

      // Verificar si user_id ya está asignado a otro abogado
      if (user_id && user_id !== lawyer.user_id) {
        const existingUserLawyer = await Lawyer.findOne({
          where: { user_id, id: { [Op.ne]: lawyer.id } }
        });
        if (existingUserLawyer) {
          return res.status(400).json({ error: 'Este usuario ya tiene un perfil de abogado' });
        }
      }

      await lawyer.update({
        user_id: user_id !== undefined ? user_id : lawyer.user_id,
        full_name: full_name || lawyer.full_name,
        slug,
        specialty: specialty !== undefined ? specialty : lawyer.specialty,
        bar_number: bar_number !== undefined ? bar_number : lawyer.bar_number,
        photo_url: photo_url !== undefined ? photo_url : lawyer.photo_url,
        bio: bio !== undefined ? bio : lawyer.bio,
        experience_years: experience_years !== undefined ? experience_years : lawyer.experience_years,
        education: education !== undefined ? education : lawyer.education,
        languages: languages !== undefined
          ? (Array.isArray(languages) ? languages.join(', ') : languages)
          : lawyer.languages,
        email: email !== undefined ? email : lawyer.email,
        phone: phone !== undefined ? phone : lawyer.phone,
        linkedin_url: linkedin_url !== undefined ? linkedin_url : lawyer.linkedin_url,
        is_active: is_active !== undefined ? is_active : lawyer.is_active,
        display_order: display_order !== undefined ? display_order : lawyer.display_order
      });

      // Actualizar servicios
      if (service_ids !== undefined) {
        const services = await Service.findAll({ where: { id: service_ids } });
        await lawyer.setServices(services);
      }

      // Recargar con relaciones
      await lawyer.reload({
        include: [{ model: Service, as: 'services', through: { attributes: [] } }]
      });

      // Log de auditoría
      await AuditLog.log({
        userId: req.user.id,
        action: 'update',
        entityType: 'Lawyer',
        entityId: lawyer.id,
        oldValues,
        newValues: lawyer.toJSON(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Abogado actualizado exitosamente',
        lawyer
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar abogado
   * DELETE /api/admin/lawyers/:id
   */
  async delete(req, res, next) {
    try {
      const lawyer = await Lawyer.findByPk(req.params.id);

      if (!lawyer) {
        return res.status(404).json({ error: 'Abogado no encontrado' });
      }

      const oldValues = lawyer.toJSON();

      // Eliminar asociaciones con servicios
      await lawyer.setServices([]);

      await lawyer.destroy();

      // Log de auditoría
      await AuditLog.log({
        userId: req.user.id,
        action: 'delete',
        entityType: 'Lawyer',
        entityId: req.params.id,
        oldValues,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: 'Abogado eliminado exitosamente' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reordenar abogados
   * PUT /api/admin/lawyers/reorder
   */
  async reorder(req, res, next) {
    try {
      const { items } = req.body;

      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Se requiere un array de items' });
      }

      for (const item of items) {
        await Lawyer.update(
          { display_order: item.display_order },
          { where: { id: item.id } }
        );
      }

      res.json({ message: 'Orden actualizado exitosamente' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle estado activo
   * PATCH /api/admin/lawyers/:id/toggle-active
   */
  async toggleActive(req, res, next) {
    try {
      const lawyer = await Lawyer.findByPk(req.params.id);

      if (!lawyer) {
        return res.status(404).json({ error: 'Abogado no encontrado' });
      }

      await lawyer.update({ is_active: !lawyer.is_active });

      res.json({
        message: `Abogado ${lawyer.is_active ? 'activado' : 'desactivado'}`,
        is_active: lawyer.is_active
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LawyerController();
