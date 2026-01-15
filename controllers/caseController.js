const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const {
  Case, CaseDocument, CaseMessage, CaseUpdate,
  User, Lawyer, Service, AuditLog
} = require('../models');

// Configuración de cifrado
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
const IV_LENGTH = 16;

// Funciones de cifrado
const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    return null;
  }
};

class CaseController {
  // ==================== CLIENTE ====================

  /**
   * Obtener mis casos
   * GET /api/cases/my
   */
  async getMyCases(req, res, next) {
    try {
      const cases = await Case.findAll({
        where: { client_id: req.user.id },
        include: [
          { model: Lawyer, as: 'lawyer', attributes: ['id', 'full_name', 'photo_url', 'specialty'] },
          { model: Service, as: 'service', attributes: ['id', 'name', 'icon'] }
        ],
        order: [['created_at', 'DESC']]
      });

      res.json(cases);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener detalle de mi caso
   * GET /api/cases/my/:id
   */
  async getMyCaseById(req, res, next) {
    try {
      const caseItem = await Case.findOne({
        where: {
          id: req.params.id,
          client_id: req.user.id
        },
        include: [
          { model: Lawyer, as: 'lawyer', attributes: ['id', 'full_name', 'photo_url', 'specialty', 'email', 'phone'] },
          { model: Service, as: 'service', attributes: ['id', 'name', 'icon'] },
          {
            model: CaseUpdate,
            as: 'updates',
            include: [{ model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }],
            order: [['created_at', 'DESC']]
          },
          {
            model: CaseDocument,
            as: 'documents',
            include: [{ model: User, as: 'uploader', attributes: ['id', 'first_name', 'last_name'] }],
            order: [['created_at', 'DESC']]
          }
        ]
      });

      if (!caseItem) {
        return res.status(404).json({ error: 'Caso no encontrado' });
      }

      res.json(caseItem);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener mensajes de mi caso
   * GET /api/cases/my/:id/messages
   */
  async getMyCaseMessages(req, res, next) {
    try {
      const caseItem = await Case.findOne({
        where: { id: req.params.id, client_id: req.user.id }
      });

      if (!caseItem) {
        return res.status(404).json({ error: 'Caso no encontrado' });
      }

      const messages = await CaseMessage.findAll({
        where: { case_id: req.params.id },
        include: [{
          model: User,
          as: 'sender',
          attributes: ['id', 'first_name', 'last_name', 'role_id']
        }],
        order: [['created_at', 'ASC']]
      });

      // Marcar como leídos los mensajes que no son del usuario
      await CaseMessage.update(
        { is_read: true, read_at: new Date() },
        {
          where: {
            case_id: req.params.id,
            sender_id: { [Op.ne]: req.user.id },
            is_read: false
          }
        }
      );

      res.json(messages);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enviar mensaje en mi caso
   * POST /api/cases/my/:id/messages
   */
  async sendMessage(req, res, next) {
    try {
      const { message } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'El mensaje es requerido' });
      }

      const caseItem = await Case.findOne({
        where: { id: req.params.id, client_id: req.user.id }
      });

      if (!caseItem) {
        return res.status(404).json({ error: 'Caso no encontrado' });
      }

      const newMessage = await CaseMessage.create({
        case_id: req.params.id,
        sender_id: req.user.id,
        message: message.trim()
      });

      // Cargar con relaciones
      const messageWithSender = await CaseMessage.findByPk(newMessage.id, {
        include: [{
          model: User,
          as: 'sender',
          attributes: ['id', 'first_name', 'last_name', 'role_id']
        }]
      });

      res.status(201).json(messageWithSender);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Contar mensajes no leídos
   * GET /api/cases/my/unread-count
   */
  async getUnreadCount(req, res, next) {
    try {
      // Obtener IDs de casos del cliente
      const cases = await Case.findAll({
        where: { client_id: req.user.id },
        attributes: ['id']
      });

      const caseIds = cases.map(c => c.id);

      if (caseIds.length === 0) {
        return res.json({ count: 0 });
      }

      const count = await CaseMessage.count({
        where: {
          case_id: { [Op.in]: caseIds },
          sender_id: { [Op.ne]: req.user.id },
          is_read: false
        }
      });

      res.json({ count });
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN ====================

  /**
   * Obtener todos los casos (admin)
   * GET /api/cases/admin
   */
  async getAll(req, res, next) {
    try {
      const {
        status,
        lawyer_id,
        client_id,
        priority,
        search,
        page = 1,
        limit = 20
      } = req.query;

      const where = {};

      if (status) where.status = status;
      if (lawyer_id) where.lawyer_id = lawyer_id;
      if (client_id) where.client_id = client_id;
      if (priority) where.priority = priority;
      if (search) {
        where[Op.or] = [
          { case_number: { [Op.like]: `%${search}%` } },
          { title: { [Op.like]: `%${search}%` } }
        ];
      }

      const offset = (page - 1) * limit;

      const { count, rows: cases } = await Case.findAndCountAll({
        where,
        include: [
          { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: Lawyer, as: 'lawyer', attributes: ['id', 'full_name', 'photo_url'] },
          { model: Service, as: 'service', attributes: ['id', 'name'] }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        cases,
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
   * Obtener caso por ID (admin)
   * GET /api/cases/admin/:id
   */
  async getById(req, res, next) {
    try {
      const caseItem = await Case.findByPk(req.params.id, {
        include: [
          { model: User, as: 'client', attributes: { exclude: ['password_hash'] } },
          { model: Lawyer, as: 'lawyer' },
          { model: Service, as: 'service' },
          {
            model: CaseUpdate,
            as: 'updates',
            include: [{ model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }],
            order: [['created_at', 'DESC']]
          },
          {
            model: CaseDocument,
            as: 'documents',
            include: [{ model: User, as: 'uploader', attributes: ['id', 'first_name', 'last_name'] }]
          },
          {
            model: CaseMessage,
            as: 'messages',
            include: [{ model: User, as: 'sender', attributes: ['id', 'first_name', 'last_name'] }],
            order: [['created_at', 'ASC']]
          }
        ]
      });

      if (!caseItem) {
        return res.status(404).json({ error: 'Caso no encontrado' });
      }

      res.json(caseItem);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crear caso (admin)
   * POST /api/cases/admin
   */
  async create(req, res, next) {
    try {
      const {
        client_id,
        lawyer_id,
        service_id,
        title,
        description,
        status = 'pending',
        priority = 'medium',
        start_date,
        confidentiality_level = 'normal'
      } = req.body;

      if (!client_id || !lawyer_id || !title) {
        return res.status(400).json({
          error: 'Cliente, abogado y título son requeridos'
        });
      }

      // Verificar cliente y abogado
      const [client, lawyer] = await Promise.all([
        User.findByPk(client_id),
        Lawyer.findByPk(lawyer_id)
      ]);

      if (!client) {
        return res.status(400).json({ error: 'Cliente no encontrado' });
      }
      if (!lawyer) {
        return res.status(400).json({ error: 'Abogado no encontrado' });
      }

      const newCase = await Case.create({
        client_id,
        lawyer_id,
        service_id,
        title,
        description,
        status,
        priority,
        start_date: start_date || new Date(),
        confidentiality_level
      });

      // Crear actualización inicial
      await CaseUpdate.create({
        case_id: newCase.id,
        update_type: 'status_change',
        description: 'Caso creado',
        created_by: req.user.id
      });

      // Log de auditoría
      await AuditLog.log({
        userId: req.user.id,
        action: 'create',
        entityType: 'Case',
        entityId: newCase.id,
        newValues: { title, status, lawyer_id, client_id },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'Caso creado exitosamente',
        case: newCase
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar caso (admin)
   * PUT /api/cases/admin/:id
   */
  async update(req, res, next) {
    try {
      const caseItem = await Case.findByPk(req.params.id);

      if (!caseItem) {
        return res.status(404).json({ error: 'Caso no encontrado' });
      }

      const oldStatus = caseItem.status;
      const allowedFields = [
        'lawyer_id', 'service_id', 'title', 'description',
        'status', 'priority', 'start_date', 'end_date', 'confidentiality_level'
      ];

      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      await caseItem.update(updates);

      // Si cambió el estado, crear actualización
      if (updates.status && updates.status !== oldStatus) {
        await CaseUpdate.create({
          case_id: caseItem.id,
          update_type: 'status_change',
          description: `Estado cambiado de "${Case.STATUS_LABELS[oldStatus]}" a "${Case.STATUS_LABELS[updates.status]}"`,
          created_by: req.user.id
        });
      }

      res.json({ message: 'Caso actualizado', case: caseItem });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Agregar actualización al caso (admin)
   * POST /api/cases/admin/:id/updates
   */
  async addUpdate(req, res, next) {
    try {
      const { update_type, description } = req.body;

      if (!update_type || !description) {
        return res.status(400).json({
          error: 'Tipo y descripción son requeridos'
        });
      }

      const caseItem = await Case.findByPk(req.params.id);
      if (!caseItem) {
        return res.status(404).json({ error: 'Caso no encontrado' });
      }

      const update = await CaseUpdate.create({
        case_id: req.params.id,
        update_type,
        description,
        created_by: req.user.id
      });

      const updateWithCreator = await CaseUpdate.findByPk(update.id, {
        include: [{ model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }]
      });

      res.status(201).json(updateWithCreator);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Subir documento (admin o cliente)
   * POST /api/cases/:id/documents
   */
  async uploadDocument(req, res, next) {
    try {
      const caseId = req.params.id;

      // Verificar acceso al caso
      const whereClause = req.user.role?.name === 'admin'
        ? { id: caseId }
        : { id: caseId, client_id: req.user.id };

      const caseItem = await Case.findOne({ where: whereClause });

      if (!caseItem) {
        return res.status(404).json({ error: 'Caso no encontrado' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó archivo' });
      }

      const { description } = req.body;

      const document = await CaseDocument.create({
        case_id: caseId,
        name: req.file.filename,
        original_name: req.file.originalname,
        file_path: req.file.path,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        uploaded_by: req.user.id,
        is_encrypted: true,
        description
      });

      // Crear actualización
      await CaseUpdate.create({
        case_id: caseId,
        update_type: 'document',
        description: `Documento subido: ${req.file.originalname}`,
        created_by: req.user.id
      });

      res.status(201).json({
        message: 'Documento subido exitosamente',
        document
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Descargar documento
   * GET /api/cases/:caseId/documents/:docId/download
   */
  async downloadDocument(req, res, next) {
    try {
      const { caseId, docId } = req.params;

      // Verificar acceso al caso
      const whereClause = req.user.role?.name === 'admin'
        ? { id: caseId }
        : { id: caseId, client_id: req.user.id };

      const caseItem = await Case.findOne({ where: whereClause });

      if (!caseItem) {
        return res.status(404).json({ error: 'Caso no encontrado' });
      }

      const document = await CaseDocument.findOne({
        where: { id: docId, case_id: caseId }
      });

      if (!document) {
        return res.status(404).json({ error: 'Documento no encontrado' });
      }

      res.download(document.file_path, document.original_name);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar documento (admin)
   * DELETE /api/cases/admin/:caseId/documents/:docId
   */
  async deleteDocument(req, res, next) {
    try {
      const { caseId, docId } = req.params;

      const document = await CaseDocument.findOne({
        where: { id: docId, case_id: caseId }
      });

      if (!document) {
        return res.status(404).json({ error: 'Documento no encontrado' });
      }

      // Eliminar archivo físico
      try {
        await fs.unlink(document.file_path);
      } catch (e) {
        console.error('Error eliminando archivo:', e);
      }

      await document.destroy();

      res.json({ message: 'Documento eliminado' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enviar mensaje en caso (admin)
   * POST /api/cases/admin/:id/messages
   */
  async adminSendMessage(req, res, next) {
    try {
      const { message } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'El mensaje es requerido' });
      }

      const caseItem = await Case.findByPk(req.params.id);

      if (!caseItem) {
        return res.status(404).json({ error: 'Caso no encontrado' });
      }

      const newMessage = await CaseMessage.create({
        case_id: req.params.id,
        sender_id: req.user.id,
        message: message.trim()
      });

      const messageWithSender = await CaseMessage.findByPk(newMessage.id, {
        include: [{
          model: User,
          as: 'sender',
          attributes: ['id', 'first_name', 'last_name', 'role_id']
        }]
      });

      res.status(201).json(messageWithSender);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar caso (admin)
   * DELETE /api/cases/admin/:id
   */
  async delete(req, res, next) {
    try {
      const caseItem = await Case.findByPk(req.params.id);

      if (!caseItem) {
        return res.status(404).json({ error: 'Caso no encontrado' });
      }

      // Eliminar documentos físicos
      const documents = await CaseDocument.findAll({
        where: { case_id: req.params.id }
      });

      for (const doc of documents) {
        try {
          await fs.unlink(doc.file_path);
        } catch (e) {
          console.error('Error eliminando archivo:', e);
        }
      }

      // Eliminar registros relacionados
      await Promise.all([
        CaseDocument.destroy({ where: { case_id: req.params.id } }),
        CaseMessage.destroy({ where: { case_id: req.params.id } }),
        CaseUpdate.destroy({ where: { case_id: req.params.id } })
      ]);

      await caseItem.destroy();

      res.json({ message: 'Caso eliminado' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Estadísticas de casos (admin)
   * GET /api/cases/admin/stats
   */
  async getStats(req, res, next) {
    try {
      const [total, pending, inProgress, resolved, byPriority] = await Promise.all([
        Case.count(),
        Case.count({ where: { status: 'pending' } }),
        Case.count({ where: { status: 'in_progress' } }),
        Case.count({ where: { status: 'resolved' } }),
        Case.findAll({
          attributes: [
            'priority',
            [require('sequelize').fn('COUNT', 'id'), 'count']
          ],
          group: ['priority']
        })
      ]);

      res.json({
        total,
        pending,
        in_progress: inProgress,
        resolved,
        by_priority: byPriority.reduce((acc, item) => {
          acc[item.priority] = parseInt(item.dataValues.count);
          return acc;
        }, {})
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CaseController();
