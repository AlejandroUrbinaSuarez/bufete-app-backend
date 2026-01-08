const { ContactMessage, Service, User, AuditLog } = require('../models');
const emailService = require('../services/emailService');

class ContactController {
  /**
   * Crear mensaje de contacto (público)
   * POST /api/contact
   */
  async create(req, res, next) {
    try {
      const { name, email, phone, subject, message, service_id } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({
          error: 'Nombre, email y mensaje son requeridos'
        });
      }

      const contactMessage = await ContactMessage.create({
        name,
        email,
        phone,
        subject,
        message,
        service_id,
        ip_address: req.ip
      });

      // Intentar enviar notificación por email al admin
      try {
        await emailService.sendContactNotification(contactMessage);
      } catch (emailError) {
        console.error('Error enviando notificación de contacto:', emailError);
      }

      res.status(201).json({
        message: 'Mensaje enviado exitosamente. Nos pondremos en contacto pronto.',
        id: contactMessage.id
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener todos los mensajes (admin)
   * GET /api/contact/admin
   */
  async getAll(req, res, next) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const where = {};

      if (status) {
        where.status = status;
      }

      const offset = (page - 1) * limit;

      const { count, rows: messages } = await ContactMessage.findAndCountAll({
        where,
        include: [
          { model: Service, as: 'service', attributes: ['id', 'name'] },
          { model: User, as: 'assignedUser', attributes: ['id', 'first_name', 'last_name'] }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        messages,
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
   * Obtener mensaje por ID (admin)
   * GET /api/contact/admin/:id
   */
  async getById(req, res, next) {
    try {
      const message = await ContactMessage.findByPk(req.params.id, {
        include: [
          { model: Service, as: 'service', attributes: ['id', 'name'] },
          { model: User, as: 'assignedUser', attributes: ['id', 'first_name', 'last_name', 'email'] }
        ]
      });

      if (!message) {
        return res.status(404).json({ error: 'Mensaje no encontrado' });
      }

      // Marcar como leído si es nuevo
      if (message.status === 'new') {
        await message.update({ status: 'read' });
      }

      res.json(message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar estado del mensaje (admin)
   * PATCH /api/contact/admin/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const validStatuses = ['new', 'read', 'responded', 'archived'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      const message = await ContactMessage.findByPk(req.params.id);

      if (!message) {
        return res.status(404).json({ error: 'Mensaje no encontrado' });
      }

      await message.update({ status });

      res.json({ message: 'Estado actualizado', status });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Asignar mensaje a usuario (admin)
   * PATCH /api/contact/admin/:id/assign
   */
  async assign(req, res, next) {
    try {
      const { user_id } = req.body;

      const message = await ContactMessage.findByPk(req.params.id);

      if (!message) {
        return res.status(404).json({ error: 'Mensaje no encontrado' });
      }

      if (user_id) {
        const user = await User.findByPk(user_id);
        if (!user) {
          return res.status(400).json({ error: 'Usuario no encontrado' });
        }
      }

      await message.update({ assigned_to: user_id || null });

      res.json({ message: 'Asignación actualizada' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Responder mensaje (admin)
   * POST /api/contact/admin/:id/respond
   */
  async respond(req, res, next) {
    try {
      const { response } = req.body;

      if (!response) {
        return res.status(400).json({ error: 'La respuesta es requerida' });
      }

      const message = await ContactMessage.findByPk(req.params.id);

      if (!message) {
        return res.status(404).json({ error: 'Mensaje no encontrado' });
      }

      await message.update({
        response,
        status: 'responded',
        responded_at: new Date()
      });

      // Enviar respuesta por email
      try {
        await emailService.sendContactResponse(message, response);
      } catch (emailError) {
        console.error('Error enviando respuesta:', emailError);
      }

      // Log de auditoría
      await AuditLog.log({
        userId: req.user.id,
        action: 'respond',
        entityType: 'ContactMessage',
        entityId: message.id,
        newValues: { response },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: 'Respuesta enviada exitosamente' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar mensaje (admin)
   * DELETE /api/contact/admin/:id
   */
  async delete(req, res, next) {
    try {
      const message = await ContactMessage.findByPk(req.params.id);

      if (!message) {
        return res.status(404).json({ error: 'Mensaje no encontrado' });
      }

      await message.destroy();

      res.json({ message: 'Mensaje eliminado' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener estadísticas (admin)
   * GET /api/contact/admin/stats
   */
  async getStats(req, res, next) {
    try {
      const [total, newCount, readCount, respondedCount] = await Promise.all([
        ContactMessage.count(),
        ContactMessage.count({ where: { status: 'new' } }),
        ContactMessage.count({ where: { status: 'read' } }),
        ContactMessage.count({ where: { status: 'responded' } })
      ]);

      res.json({
        total,
        new: newCount,
        read: readCount,
        responded: respondedCount,
        archived: total - newCount - readCount - respondedCount
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContactController();
