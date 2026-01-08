const { Testimonial, Service, AuditLog } = require('../models');
const { Op } = require('sequelize');

class TestimonialController {
  /**
   * Obtener todos los testimonios activos (público)
   * GET /api/testimonials
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
        order: [['display_order', 'ASC'], ['created_at', 'DESC']]
      };

      if (limit) {
        options.limit = parseInt(limit);
      }

      const testimonials = await Testimonial.findAll(options);

      res.json(testimonials);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener testimonio por ID (público - para modal/detalle)
   * GET /api/testimonials/:id
   */
  async getById(req, res, next) {
    try {
      const testimonial = await Testimonial.findOne({
        where: { id: req.params.id, is_active: true },
        include: [{
          model: Service,
          as: 'service',
          attributes: ['id', 'name', 'slug']
        }]
      });

      if (!testimonial) {
        return res.status(404).json({ error: 'Testimonio no encontrado' });
      }

      res.json(testimonial);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener todos los testimonios (admin - incluye inactivos)
   * GET /api/testimonials/admin/all
   */
  async getAllAdmin(req, res, next) {
    try {
      const testimonials = await Testimonial.findAll({
        include: [{
          model: Service,
          as: 'service',
          attributes: ['id', 'name', 'slug']
        }],
        order: [['display_order', 'ASC'], ['created_at', 'DESC']]
      });

      res.json(testimonials);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener testimonio por ID (admin)
   * GET /api/testimonials/admin/:id
   */
  async getByIdAdmin(req, res, next) {
    try {
      const testimonial = await Testimonial.findByPk(req.params.id, {
        include: [{
          model: Service,
          as: 'service',
          attributes: ['id', 'name', 'slug']
        }]
      });

      if (!testimonial) {
        return res.status(404).json({ error: 'Testimonio no encontrado' });
      }

      res.json(testimonial);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crear testimonio (admin)
   * POST /api/testimonials/admin
   */
  async create(req, res, next) {
    try {
      const {
        client_name,
        client_title,
        content,
        rating,
        photo_url,
        service_id,
        is_featured,
        is_active,
        display_order
      } = req.body;

      const testimonial = await Testimonial.create({
        client_name,
        client_title,
        content,
        rating: rating || 5,
        photo_url,
        service_id,
        is_featured: is_featured || false,
        is_active: is_active !== false,
        display_order: display_order || 0
      });

      // Recargar con servicio
      await testimonial.reload({
        include: [{ model: Service, as: 'service', attributes: ['id', 'name', 'slug'] }]
      });

      await AuditLog.log({
        userId: req.user.id,
        action: 'create',
        entityType: 'Testimonial',
        entityId: testimonial.id,
        newValues: testimonial.toJSON(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'Testimonio creado exitosamente',
        testimonial
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar testimonio (admin)
   * PUT /api/testimonials/admin/:id
   */
  async update(req, res, next) {
    try {
      const testimonial = await Testimonial.findByPk(req.params.id);

      if (!testimonial) {
        return res.status(404).json({ error: 'Testimonio no encontrado' });
      }

      const oldValues = testimonial.toJSON();
      const {
        client_name,
        client_title,
        content,
        rating,
        photo_url,
        service_id,
        is_featured,
        is_active,
        display_order
      } = req.body;

      await testimonial.update({
        client_name: client_name || testimonial.client_name,
        client_title: client_title !== undefined ? client_title : testimonial.client_title,
        content: content || testimonial.content,
        rating: rating !== undefined ? rating : testimonial.rating,
        photo_url: photo_url !== undefined ? photo_url : testimonial.photo_url,
        service_id: service_id !== undefined ? service_id : testimonial.service_id,
        is_featured: is_featured !== undefined ? is_featured : testimonial.is_featured,
        is_active: is_active !== undefined ? is_active : testimonial.is_active,
        display_order: display_order !== undefined ? display_order : testimonial.display_order
      });

      // Recargar con servicio
      await testimonial.reload({
        include: [{ model: Service, as: 'service', attributes: ['id', 'name', 'slug'] }]
      });

      await AuditLog.log({
        userId: req.user.id,
        action: 'update',
        entityType: 'Testimonial',
        entityId: testimonial.id,
        oldValues,
        newValues: testimonial.toJSON(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Testimonio actualizado exitosamente',
        testimonial
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar testimonio (admin)
   * DELETE /api/testimonials/admin/:id
   */
  async delete(req, res, next) {
    try {
      const testimonial = await Testimonial.findByPk(req.params.id);

      if (!testimonial) {
        return res.status(404).json({ error: 'Testimonio no encontrado' });
      }

      const oldValues = testimonial.toJSON();
      await testimonial.destroy();

      await AuditLog.log({
        userId: req.user.id,
        action: 'delete',
        entityType: 'Testimonial',
        entityId: req.params.id,
        oldValues,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: 'Testimonio eliminado exitosamente' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reordenar testimonios (admin)
   * PUT /api/testimonials/admin/reorder
   */
  async reorder(req, res, next) {
    try {
      const { items } = req.body;

      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Se requiere un array de items' });
      }

      for (const item of items) {
        await Testimonial.update(
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
   * PATCH /api/testimonials/admin/:id/toggle-active
   */
  async toggleActive(req, res, next) {
    try {
      const testimonial = await Testimonial.findByPk(req.params.id);

      if (!testimonial) {
        return res.status(404).json({ error: 'Testimonio no encontrado' });
      }

      await testimonial.update({ is_active: !testimonial.is_active });

      res.json({
        message: `Testimonio ${testimonial.is_active ? 'activado' : 'desactivado'}`,
        is_active: testimonial.is_active
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle destacado (admin)
   * PATCH /api/testimonials/admin/:id/toggle-featured
   */
  async toggleFeatured(req, res, next) {
    try {
      const testimonial = await Testimonial.findByPk(req.params.id);

      if (!testimonial) {
        return res.status(404).json({ error: 'Testimonio no encontrado' });
      }

      await testimonial.update({ is_featured: !testimonial.is_featured });

      res.json({
        message: `Testimonio ${testimonial.is_featured ? 'destacado' : 'no destacado'}`,
        is_featured: testimonial.is_featured
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TestimonialController();
