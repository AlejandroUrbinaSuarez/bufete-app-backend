const { Service, AuditLog } = require('../models');
const slugify = require('slugify');
const { cacheService, CACHE_TTL, CACHE_KEYS } = require('../services/cacheService');

class ServiceController {
  /**
   * Obtener todos los servicios (público - solo activos)
   * GET /api/services
   */
  async getAll(req, res, next) {
    try {
      const { featured } = req.query;
      const cacheKey = featured === 'true' ? `${CACHE_KEYS.SERVICES_ACTIVE}:featured` : CACHE_KEYS.SERVICES_ACTIVE;

      const services = await cacheService.getOrSet(cacheKey, async () => {
        const where = { is_active: true };
        if (featured === 'true') {
          where.is_featured = true;
        }
        return await Service.findAll({
          where,
          order: [['display_order', 'ASC'], ['name', 'ASC']]
        });
      }, CACHE_TTL.MEDIUM);

      res.json(services);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener servicio por slug (público)
   * GET /api/services/:slug
   */
  async getBySlug(req, res, next) {
    try {
      const service = await Service.findOne({
        where: { slug: req.params.slug, is_active: true }
      });

      if (!service) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
      }

      res.json(service);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener todos los servicios (admin - incluye inactivos)
   * GET /api/admin/services
   */
  async getAllAdmin(req, res, next) {
    try {
      const services = await Service.findAll({
        order: [['display_order', 'ASC'], ['name', 'ASC']]
      });

      res.json(services);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener servicio por ID (admin)
   * GET /api/admin/services/:id
   */
  async getById(req, res, next) {
    try {
      const service = await Service.findByPk(req.params.id);

      if (!service) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
      }

      res.json(service);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crear servicio
   * POST /api/admin/services
   */
  async create(req, res, next) {
    try {
      const {
        name,
        short_description,
        description,
        icon,
        image_url,
        is_featured,
        is_active,
        display_order,
        meta_title,
        meta_description
      } = req.body;

      // Generar slug único
      let slug = slugify(name, { lower: true, strict: true });
      const existingSlug = await Service.findOne({ where: { slug } });
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
      }

      const service = await Service.create({
        name,
        slug,
        short_description,
        description,
        icon,
        image_url,
        is_featured: is_featured || false,
        is_active: is_active !== false,
        display_order: display_order || 0,
        meta_title,
        meta_description
      });

      // Log de auditoría
      await AuditLog.log({
        userId: req.user.id,
        action: 'create',
        entityType: 'Service',
        entityId: service.id,
        newValues: service.toJSON(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Invalidar caché de servicios
      cacheService.deletePattern('services:');

      res.status(201).json({
        message: 'Servicio creado exitosamente',
        service
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar servicio
   * PUT /api/admin/services/:id
   */
  async update(req, res, next) {
    try {
      const service = await Service.findByPk(req.params.id);

      if (!service) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
      }

      const oldValues = service.toJSON();

      const {
        name,
        short_description,
        description,
        icon,
        image_url,
        is_featured,
        is_active,
        display_order,
        meta_title,
        meta_description
      } = req.body;

      // Actualizar slug si cambió el nombre
      let slug = service.slug;
      if (name && name !== service.name) {
        slug = slugify(name, { lower: true, strict: true });
        const existingSlug = await Service.findOne({
          where: { slug, id: { [require('sequelize').Op.ne]: service.id } }
        });
        if (existingSlug) {
          slug = `${slug}-${Date.now()}`;
        }
      }

      await service.update({
        name: name || service.name,
        slug,
        short_description: short_description !== undefined ? short_description : service.short_description,
        description: description !== undefined ? description : service.description,
        icon: icon !== undefined ? icon : service.icon,
        image_url: image_url !== undefined ? image_url : service.image_url,
        is_featured: is_featured !== undefined ? is_featured : service.is_featured,
        is_active: is_active !== undefined ? is_active : service.is_active,
        display_order: display_order !== undefined ? display_order : service.display_order,
        meta_title: meta_title !== undefined ? meta_title : service.meta_title,
        meta_description: meta_description !== undefined ? meta_description : service.meta_description
      });

      // Log de auditoría
      await AuditLog.log({
        userId: req.user.id,
        action: 'update',
        entityType: 'Service',
        entityId: service.id,
        oldValues,
        newValues: service.toJSON(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Invalidar caché de servicios
      cacheService.deletePattern('services:');

      res.json({
        message: 'Servicio actualizado exitosamente',
        service
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar servicio
   * DELETE /api/admin/services/:id
   */
  async delete(req, res, next) {
    try {
      const service = await Service.findByPk(req.params.id);

      if (!service) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
      }

      const oldValues = service.toJSON();

      await service.destroy();

      // Log de auditoría
      await AuditLog.log({
        userId: req.user.id,
        action: 'delete',
        entityType: 'Service',
        entityId: req.params.id,
        oldValues,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Invalidar caché de servicios
      cacheService.deletePattern('services:');

      res.json({ message: 'Servicio eliminado exitosamente' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reordenar servicios
   * PUT /api/admin/services/reorder
   */
  async reorder(req, res, next) {
    try {
      const { items } = req.body; // Array de { id, display_order }

      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Se requiere un array de items' });
      }

      for (const item of items) {
        await Service.update(
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
   * PATCH /api/admin/services/:id/toggle-active
   */
  async toggleActive(req, res, next) {
    try {
      const service = await Service.findByPk(req.params.id);

      if (!service) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
      }

      await service.update({ is_active: !service.is_active });

      res.json({
        message: `Servicio ${service.is_active ? 'activado' : 'desactivado'}`,
        is_active: service.is_active
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle destacado
   * PATCH /api/admin/services/:id/toggle-featured
   */
  async toggleFeatured(req, res, next) {
    try {
      const service = await Service.findByPk(req.params.id);

      if (!service) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
      }

      await service.update({ is_featured: !service.is_featured });

      res.json({
        message: `Servicio ${service.is_featured ? 'destacado' : 'no destacado'}`,
        is_featured: service.is_featured
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ServiceController();
