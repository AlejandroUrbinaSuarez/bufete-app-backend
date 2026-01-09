const { ChatSession, ChatMessage, User } = require('../models');
const { Op } = require('sequelize');

class ChatController {
  /**
   * Obtener todas las sesiones de chat (admin)
   * GET /api/chat/sessions
   */
  async getSessions(req, res, next) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (status) {
        where.status = status;
      }

      const { count, rows } = await ChatSession.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
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
   * Obtener sesiones activas/en espera (para panel de agente)
   * GET /api/chat/sessions/active
   */
  async getActiveSessions(req, res, next) {
    try {
      const sessions = await ChatSession.findAll({
        where: {
          status: {
            [Op.in]: ['active', 'waiting']
          }
        },
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'first_name', 'last_name']
          },
          {
            model: ChatMessage,
            as: 'messages',
            limit: 1,
            order: [['created_at', 'DESC']]
          }
        ],
        order: [['created_at', 'DESC']]
      });

      // Añadir conteo de mensajes no leídos
      const sessionsWithCount = await Promise.all(
        sessions.map(async (session) => {
          const messageCount = await ChatMessage.count({
            where: { session_id: session.id }
          });
          return {
            ...session.toJSON(),
            messageCount,
            lastMessage: session.messages[0] || null
          };
        })
      );

      res.json(sessionsWithCount);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener una sesión con sus mensajes
   * GET /api/chat/sessions/:id
   */
  async getSessionById(req, res, next) {
    try {
      const session = await ChatSession.findByPk(req.params.id, {
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'first_name', 'last_name', 'email']
          },
          {
            model: ChatMessage,
            as: 'messages',
            order: [['created_at', 'ASC']]
          }
        ]
      });

      if (!session) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
      }

      res.json(session);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Estadísticas de chat (admin dashboard)
   * GET /api/chat/stats
   */
  async getStats(req, res, next) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalSessions,
        activeSessions,
        waitingSessions,
        todaySessions,
        totalMessages
      ] = await Promise.all([
        ChatSession.count(),
        ChatSession.count({ where: { status: 'active' } }),
        ChatSession.count({ where: { status: 'waiting' } }),
        ChatSession.count({
          where: {
            created_at: { [Op.gte]: today }
          }
        }),
        ChatMessage.count()
      ]);

      // Promedio de mensajes por sesión
      const avgMessages = totalSessions > 0
        ? (totalMessages / totalSessions).toFixed(1)
        : 0;

      res.json({
        totalSessions,
        activeSessions,
        waitingSessions,
        todaySessions,
        totalMessages,
        avgMessages
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cerrar una sesión
   * PUT /api/chat/sessions/:id/close
   */
  async closeSession(req, res, next) {
    try {
      const session = await ChatSession.findByPk(req.params.id);

      if (!session) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
      }

      await session.update({
        status: 'closed',
        closed_at: new Date()
      });

      res.json({ message: 'Sesión cerrada', session });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Asignar agente a sesión
   * PUT /api/chat/sessions/:id/assign
   */
  async assignAgent(req, res, next) {
    try {
      const { agentId } = req.body;
      const session = await ChatSession.findByPk(req.params.id);

      if (!session) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
      }

      await session.update({
        assigned_to: agentId,
        status: 'active'
      });

      const updatedSession = await ChatSession.findByPk(session.id, {
        include: [{ model: User, as: 'agent', attributes: ['id', 'first_name', 'last_name'] }]
      });

      res.json(updatedSession);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar sesión (soft delete - cambiar a closed)
   * DELETE /api/chat/sessions/:id
   */
  async deleteSession(req, res, next) {
    try {
      const session = await ChatSession.findByPk(req.params.id);

      if (!session) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
      }

      // Soft delete - marcar como cerrada
      await session.update({
        status: 'closed',
        closed_at: new Date()
      });

      res.json({ message: 'Sesión eliminada' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();
