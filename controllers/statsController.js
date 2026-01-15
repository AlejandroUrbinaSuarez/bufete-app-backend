const { Op } = require('sequelize');
const {
  User,
  Case,
  Appointment,
  ContactMessage,
  ChatSession,
  BlogPost,
  Testimonial,
  SuccessCase,
  Service,
  Lawyer,
  Role
} = require('../models');

class StatsController {
  // GET /api/stats/dashboard - Estadísticas principales del dashboard
  async getDashboardStats(req, res, next) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

      // Obtener rol de cliente
      const clientRole = await Role.findOne({ where: { name: 'client' } });
      const clientRoleId = clientRole ? clientRole.id : null;

      // Conteos actuales
      const [
        totalClients,
        totalCases,
        activeCases,
        pendingAppointments,
        todayAppointments,
        unreadMessages,
        activeChats,
        totalLawyers,
        totalServices
      ] = await Promise.all([
        // Total de clientes
        User.count({ where: clientRoleId ? { role_id: clientRoleId } : {} }),
        // Total de casos
        Case.count(),
        // Casos activos (no cerrados)
        Case.count({ where: { status: { [Op.notIn]: ['closed', 'archived'] } } }),
        // Citas pendientes
        Appointment.count({ where: { status: 'pending' } }),
        // Citas de hoy
        Appointment.count({
          where: {
            date: {
              [Op.gte]: today,
              [Op.lt]: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            },
            status: { [Op.in]: ['pending', 'confirmed'] }
          }
        }),
        // Mensajes de contacto no leídos
        ContactMessage.count({ where: { status: 'new' } }),
        // Chats activos o en espera
        ChatSession.count({ where: { status: { [Op.in]: ['waiting', 'active'] } } }),
        // Total abogados activos
        Lawyer.count({ where: { is_active: true } }),
        // Total servicios activos
        Service.count({ where: { is_active: true } })
      ]);

      // Conteos del mes pasado para calcular cambios
      const [
        lastMonthClients,
        lastMonthCases,
        lastMonthAppointments,
        lastMonthMessages
      ] = await Promise.all([
        User.count({
          where: clientRoleId ? {
            role_id: clientRoleId,
            created_at: { [Op.lt]: thisMonth }
          } : { created_at: { [Op.lt]: thisMonth } }
        }),
        Case.count({ where: { created_at: { [Op.lt]: thisMonth } } }),
        Appointment.count({ where: { created_at: { [Op.lt]: thisMonth } } }),
        ContactMessage.count({ where: { created_at: { [Op.lt]: thisMonth } } })
      ]);

      // Conteos de este mes
      const [
        thisMonthClients,
        thisMonthCases,
        thisMonthAppointments,
        thisMonthMessages
      ] = await Promise.all([
        User.count({
          where: clientRoleId ? {
            role_id: clientRoleId,
            created_at: { [Op.gte]: thisMonth }
          } : { created_at: { [Op.gte]: thisMonth } }
        }),
        Case.count({ where: { created_at: { [Op.gte]: thisMonth } } }),
        Appointment.count({ where: { created_at: { [Op.gte]: thisMonth } } }),
        ContactMessage.count({ where: { created_at: { [Op.gte]: thisMonth } } })
      ]);

      // Calcular porcentajes de cambio
      const calculateChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      // Obtener conteos del mes pasado (solo ese mes)
      const [
        prevMonthOnlyClients,
        prevMonthOnlyCases,
        prevMonthOnlyAppointments,
        prevMonthOnlyMessages
      ] = await Promise.all([
        User.count({
          where: clientRoleId ? {
            role_id: clientRoleId,
            created_at: { [Op.gte]: lastMonth, [Op.lt]: thisMonth }
          } : { created_at: { [Op.gte]: lastMonth, [Op.lt]: thisMonth } }
        }),
        Case.count({ where: { created_at: { [Op.gte]: lastMonth, [Op.lt]: thisMonth } } }),
        Appointment.count({ where: { created_at: { [Op.gte]: lastMonth, [Op.lt]: thisMonth } } }),
        ContactMessage.count({ where: { created_at: { [Op.gte]: lastMonth, [Op.lt]: thisMonth } } })
      ]);

      res.json({
        success: true,
        data: {
          // KPIs principales
          kpis: {
            clients: {
              total: totalClients,
              thisMonth: thisMonthClients,
              change: calculateChange(thisMonthClients, prevMonthOnlyClients)
            },
            cases: {
              total: totalCases,
              active: activeCases,
              thisMonth: thisMonthCases,
              change: calculateChange(thisMonthCases, prevMonthOnlyCases)
            },
            appointments: {
              pending: pendingAppointments,
              today: todayAppointments,
              thisMonth: thisMonthAppointments,
              change: calculateChange(thisMonthAppointments, prevMonthOnlyAppointments)
            },
            messages: {
              unread: unreadMessages,
              thisMonth: thisMonthMessages,
              change: calculateChange(thisMonthMessages, prevMonthOnlyMessages)
            },
            chats: {
              active: activeChats
            }
          },
          // Resumen general
          summary: {
            lawyers: totalLawyers,
            services: totalServices
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/stats/cases - Estadísticas de casos
  async getCaseStats(req, res, next) {
    try {
      // Distribución por estado
      const casesByStatus = await Case.findAll({
        attributes: [
          'status',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        group: ['status']
      });

      // Casos por servicio
      const casesByService = await Case.findAll({
        attributes: [
          [require('sequelize').fn('COUNT', require('sequelize').col('Case.id')), 'count']
        ],
        include: [{
          model: Service,
          as: 'service',
          attributes: ['id', 'name']
        }],
        group: ['service.id', 'service.name']
      });

      // Casos por mes (últimos 6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const casesByMonth = await Case.findAll({
        attributes: [
          [require('sequelize').fn('YEAR', require('sequelize').col('created_at')), 'year'],
          [require('sequelize').fn('MONTH', require('sequelize').col('created_at')), 'month'],
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        where: {
          created_at: { [Op.gte]: sixMonthsAgo }
        },
        group: [
          require('sequelize').fn('YEAR', require('sequelize').col('created_at')),
          require('sequelize').fn('MONTH', require('sequelize').col('created_at'))
        ],
        order: [
          [require('sequelize').fn('YEAR', require('sequelize').col('created_at')), 'ASC'],
          [require('sequelize').fn('MONTH', require('sequelize').col('created_at')), 'ASC']
        ]
      });

      res.json({
        success: true,
        data: {
          byStatus: casesByStatus.map(c => ({
            status: c.status,
            count: parseInt(c.get('count'))
          })),
          byService: casesByService.map(c => ({
            service: c.service?.name || 'Sin servicio',
            count: parseInt(c.get('count'))
          })),
          byMonth: casesByMonth.map(c => ({
            year: c.get('year'),
            month: c.get('month'),
            count: parseInt(c.get('count'))
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/stats/appointments - Estadísticas de citas
  async getAppointmentStats(req, res, next) {
    try {
      // Distribución por estado
      const appointmentsByStatus = await Appointment.findAll({
        attributes: [
          'status',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        group: ['status']
      });

      // Citas por abogado (top 5)
      const appointmentsByLawyer = await Appointment.findAll({
        attributes: [
          [require('sequelize').fn('COUNT', require('sequelize').col('Appointment.id')), 'count']
        ],
        include: [{
          model: Lawyer,
          as: 'lawyer',
          attributes: ['id', 'full_name']
        }],
        group: ['lawyer.id', 'lawyer.full_name'],
        order: [[require('sequelize').fn('COUNT', require('sequelize').col('Appointment.id')), 'DESC']],
        limit: 5
      });

      // Citas por mes (últimos 6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const appointmentsByMonth = await Appointment.findAll({
        attributes: [
          [require('sequelize').fn('YEAR', require('sequelize').col('created_at')), 'year'],
          [require('sequelize').fn('MONTH', require('sequelize').col('created_at')), 'month'],
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        where: {
          created_at: { [Op.gte]: sixMonthsAgo }
        },
        group: [
          require('sequelize').fn('YEAR', require('sequelize').col('created_at')),
          require('sequelize').fn('MONTH', require('sequelize').col('created_at'))
        ],
        order: [
          [require('sequelize').fn('YEAR', require('sequelize').col('created_at')), 'ASC'],
          [require('sequelize').fn('MONTH', require('sequelize').col('created_at')), 'ASC']
        ]
      });

      res.json({
        success: true,
        data: {
          byStatus: appointmentsByStatus.map(a => ({
            status: a.status,
            count: parseInt(a.get('count'))
          })),
          byLawyer: appointmentsByLawyer.map(a => ({
            lawyer: a.lawyer?.full_name || 'Sin asignar',
            count: parseInt(a.get('count'))
          })),
          byMonth: appointmentsByMonth.map(a => ({
            year: a.get('year'),
            month: a.get('month'),
            count: parseInt(a.get('count'))
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/stats/recent - Actividad reciente
  async getRecentActivity(req, res, next) {
    try {
      const [recentCases, todayAppointments, recentMessages, recentChats] = await Promise.all([
        // Casos recientes
        Case.findAll({
          include: [
            { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name', 'email'] },
            { model: Lawyer, as: 'lawyer', attributes: ['id', 'full_name'] },
            { model: Service, as: 'service', attributes: ['id', 'name'] }
          ],
          order: [['created_at', 'DESC']],
          limit: 5
        }),
        // Citas de hoy
        Appointment.findAll({
          where: {
            date: {
              [Op.gte]: new Date().setHours(0, 0, 0, 0),
              [Op.lt]: new Date().setHours(23, 59, 59, 999)
            }
          },
          include: [
            { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name', 'email'] },
            { model: Lawyer, as: 'lawyer', attributes: ['id', 'full_name'] },
            { model: Service, as: 'service', attributes: ['id', 'name'] }
          ],
          order: [['time', 'ASC']],
          limit: 10
        }),
        // Mensajes de contacto recientes
        ContactMessage.findAll({
          include: [
            { model: Service, as: 'service', attributes: ['id', 'name'] }
          ],
          order: [['created_at', 'DESC']],
          limit: 5
        }),
        // Chats recientes activos
        ChatSession.findAll({
          where: { status: { [Op.in]: ['waiting', 'active'] } },
          include: [
            { model: User, as: 'agent', attributes: ['id', 'first_name', 'last_name'] }
          ],
          order: [['updated_at', 'DESC']],
          limit: 5
        })
      ]);

      res.json({
        success: true,
        data: {
          recentCases: recentCases.map(c => ({
            id: c.id,
            title: c.title,
            status: c.status,
            client: c.client ? `${c.client.first_name} ${c.client.last_name}` : null,
            lawyer: c.lawyer?.full_name,
            service: c.service?.name,
            createdAt: c.created_at
          })),
          todayAppointments: todayAppointments.map(a => ({
            id: a.id,
            time: a.time,
            status: a.status,
            client: a.client ? `${a.client.first_name} ${a.client.last_name}` : a.client_name,
            lawyer: a.lawyer?.full_name,
            service: a.service?.name
          })),
          recentMessages: recentMessages.map(m => ({
            id: m.id,
            name: m.name,
            email: m.email,
            subject: m.subject,
            status: m.status,
            service: m.service?.name,
            createdAt: m.created_at
          })),
          activeChats: recentChats.map(c => ({
            id: c.id,
            visitorName: c.visitor_name,
            visitorEmail: c.visitor_email,
            status: c.status,
            agent: c.agent ? `${c.agent.first_name} ${c.agent.last_name}` : null,
            updatedAt: c.updated_at
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/stats/content - Estadísticas de contenido
  async getContentStats(req, res, next) {
    try {
      const [
        totalPosts,
        publishedPosts,
        totalSuccessCases,
        publishedSuccessCases,
        totalTestimonials,
        approvedTestimonials
      ] = await Promise.all([
        BlogPost.count(),
        BlogPost.count({ where: { status: 'published' } }),
        SuccessCase.count(),
        SuccessCase.count({ where: { is_published: true } }),
        Testimonial.count(),
        Testimonial.count({ where: { is_approved: true } })
      ]);

      res.json({
        success: true,
        data: {
          blog: {
            total: totalPosts,
            published: publishedPosts,
            drafts: totalPosts - publishedPosts
          },
          successCases: {
            total: totalSuccessCases,
            published: publishedSuccessCases
          },
          testimonials: {
            total: totalTestimonials,
            approved: approvedTestimonials,
            pending: totalTestimonials - approvedTestimonials
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StatsController();
