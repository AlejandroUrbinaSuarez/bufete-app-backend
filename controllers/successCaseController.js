const { SuccessCase, Service, AuditLog } = require('../models');
const slugify = require('slugify');
const { Op } = require('sequelize');

class SuccessCaseController {
  /**
   * Obtener todos los casos de éxito activos (público)
   * GET /api/success-cases
   */
  async getAll(req, res, next) {
    try {
      const { featured, service, limit } = req.query;
      const where = { is_active: true };

      if (featured === 'true') {
        where.is_featured = true;
      }

      const include = [{
        model: Service,
        as: 'service',
        attributes: ['id', 'name', 'slug']
      }];

      if (service) {
        include[0].where = { slug: service };
        include[0].required = true;
      }

      const options = {
        where,
        include,
        order: [['display_order', 'ASC'], ['year', 'DESC']]
      };

      if (limit) {
        options.limit = parseInt(limit);
      }

      const cases = await SuccessCase.findAll(options);

      res.json(cases);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener caso de éxito por slug (público)
   * GET /api/success-cases/:slug
   */
  async getBySlug(req, res, next) {
    try {
      const successCase = await SuccessCase.findOne({
        where: { slug: req.params.slug, is_active: true },
        include: [{
          model: Service,
          as: 'service',
          attributes: ['id', 'name', 'slug']
        }]
      });

      if (!successCase) {
        return res.status(404).json({ error: 'Caso de éxito no encontrado' });
      }

      // Obtener casos relacionados (mismo servicio)
      const relatedCases = await SuccessCase.findAll({
        where: {
          is_active: true,
          id: { [Op.ne]: successCase.id },
          service_id: successCase.service_id
        },
        limit: 3,
        order: [['display_order', 'ASC']]
      });

      res.json({
        case: successCase,
        relatedCases
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener todos los casos (admin - incluye inactivos)
   * GET /api/success-cases/admin/all
   */
  async getAllAdmin(req, res, next) {
    try {
      const cases = await SuccessCase.findAll({
        include: [{
          model: Service,
          as: 'service',
          attributes: ['id', 'name', 'slug']
        }],
        order: [['display_order', 'ASC'], ['created_at', 'DESC']]
      });

      res.json(cases);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener caso por ID (admin)
   * GET /api/success-cases/admin/:id
   */
  async getById(req, res, next) {
    try {
      const successCase = await SuccessCase.findByPk(req.params.id, {
        include: [{
          model: Service,
          as: 'service',
          attributes: ['id', 'name', 'slug']
        }]
      });

      if (!successCase) {
        return res.status(404).json({ error: 'Caso de éxito no encontrado' });
      }

      res.json(successCase);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crear caso de éxito (admin)
   * POST /api/success-cases/admin
   */
  async create(req, res, next) {
    try {
      const {
        title,
        description,
        result,
        service_id,
        image_url,
        year,
        is_featured,
        is_active,
        display_order
      } = req.body;

      // Generar slug único
      let slug = slugify(title, { lower: true, strict: true });
      const existingSlug = await SuccessCase.findOne({ where: { slug } });
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
      }

      const successCase = await SuccessCase.create({
        title,
        slug,
        description,
        result,
        service_id,
        image_url,
        year: year || new Date().getFullYear(),
        is_featured: is_featured || false,
        is_active: is_active !== false,
        display_order: display_order || 0
      });

      // Recargar con servicio
      await successCase.reload({
        include: [{ model: Service, as: 'service', attributes: ['id', 'name', 'slug'] }]
      });

      await AuditLog.log({
        userId: req.user.id,
        action: 'create',
        entityType: 'SuccessCase',
        entityId: successCase.id,
        newValues: successCase.toJSON(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'Caso de éxito creado exitosamente',
        case: successCase
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar caso de éxito (admin)
   * PUT /api/success-cases/admin/:id
   */
  async update(req, res, next) {
    try {
      const successCase = await SuccessCase.findByPk(req.params.id);

      if (!successCase) {
        return res.status(404).json({ error: 'Caso de éxito no encontrado' });
      }

      const oldValues = successCase.toJSON();
      const {
        title,
        description,
        result,
        service_id,
        image_url,
        year,
        is_featured,
        is_active,
        display_order
      } = req.body;

      // Actualizar slug si cambió el título
      let slug = successCase.slug;
      if (title && title !== successCase.title) {
        slug = slugify(title, { lower: true, strict: true });
        const existingSlug = await SuccessCase.findOne({
          where: { slug, id: { [Op.ne]: successCase.id } }
        });
        if (existingSlug) {
          slug = `${slug}-${Date.now()}`;
        }
      }

      await successCase.update({
        title: title || successCase.title,
        slug,
        description: description !== undefined ? description : successCase.description,
        result: result !== undefined ? result : successCase.result,
        service_id: service_id !== undefined ? service_id : successCase.service_id,
        image_url: image_url !== undefined ? image_url : successCase.image_url,
        year: year !== undefined ? year : successCase.year,
        is_featured: is_featured !== undefined ? is_featured : successCase.is_featured,
        is_active: is_active !== undefined ? is_active : successCase.is_active,
        display_order: display_order !== undefined ? display_order : successCase.display_order
      });

      // Recargar con servicio
      await successCase.reload({
        include: [{ model: Service, as: 'service', attributes: ['id', 'name', 'slug'] }]
      });

      await AuditLog.log({
        userId: req.user.id,
        action: 'update',
        entityType: 'SuccessCase',
        entityId: successCase.id,
        oldValues,
        newValues: successCase.toJSON(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Caso de éxito actualizado exitosamente',
        case: successCase
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar caso de éxito (admin)
   * DELETE /api/success-cases/admin/:id
   */
  async delete(req, res, next) {
    try {
      const successCase = await SuccessCase.findByPk(req.params.id);

      if (!successCase) {
        return res.status(404).json({ error: 'Caso de éxito no encontrado' });
      }

      const oldValues = successCase.toJSON();
      await successCase.destroy();

      await AuditLog.log({
        userId: req.user.id,
        action: 'delete',
        entityType: 'SuccessCase',
        entityId: req.params.id,
        oldValues,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: 'Caso de éxito eliminado exitosamente' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reordenar casos (admin)
   * PUT /api/success-cases/admin/reorder
   */
  async reorder(req, res, next) {
    try {
      const { items } = req.body;

      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Se requiere un array de items' });
      }

      for (const item of items) {
        await SuccessCase.update(
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
   * Toggle estado activo (admin)
   * PATCH /api/success-cases/admin/:id/toggle-active
   */
  async toggleActive(req, res, next) {
    try {
      const successCase = await SuccessCase.findByPk(req.params.id);

      if (!successCase) {
        return res.status(404).json({ error: 'Caso de éxito no encontrado' });
      }

      await successCase.update({ is_active: !successCase.is_active });

      res.json({
        message: `Caso de éxito ${successCase.is_active ? 'activado' : 'desactivado'}`,
        is_active: successCase.is_active
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle destacado (admin)
   * PATCH /api/success-cases/admin/:id/toggle-featured
   */
  async toggleFeatured(req, res, next) {
    try {
      const successCase = await SuccessCase.findByPk(req.params.id);

      if (!successCase) {
        return res.status(404).json({ error: 'Caso de éxito no encontrado' });
      }

      await successCase.update({ is_featured: !successCase.is_featured });

      res.json({
        message: `Caso de éxito ${successCase.is_featured ? 'destacado' : 'no destacado'}`,
        is_featured: successCase.is_featured
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SuccessCaseController();
