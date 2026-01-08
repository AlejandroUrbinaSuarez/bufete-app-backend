const { Op } = require('sequelize');
const { Appointment, AppointmentSlot, Lawyer, Service, User, AuditLog } = require('../models');
const emailService = require('../services/emailService');

class AppointmentController {
  // ==================== PÚBLICO ====================

  /**
   * Obtener abogados disponibles para citas
   * GET /api/appointments/lawyers
   */
  async getAvailableLawyers(req, res, next) {
    try {
      const lawyers = await Lawyer.findAll({
        where: { is_active: true },
        attributes: ['id', 'full_name', 'specialization', 'photo_url'],
        include: [{
          model: AppointmentSlot,
          as: 'availabilitySlots',
          where: { is_active: true },
          required: true,
          attributes: ['day_of_week', 'start_time', 'end_time']
        }]
      });

      res.json(lawyers);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener horarios disponibles de un abogado para una fecha
   * GET /api/appointments/availability/:lawyerId
   */
  async getAvailability(req, res, next) {
    try {
      const { lawyerId } = req.params;
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({ error: 'Fecha requerida' });
      }

      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.getDay();

      // Obtener slots configurados para ese día
      const slots = await AppointmentSlot.findAll({
        where: {
          lawyer_id: lawyerId,
          day_of_week: dayOfWeek,
          is_active: true
        },
        order: [['start_time', 'ASC']]
      });

      // Obtener citas ya agendadas para esa fecha
      const bookedAppointments = await Appointment.findAll({
        where: {
          lawyer_id: lawyerId,
          appointment_date: date,
          status: { [Op.in]: ['pending', 'confirmed'] }
        },
        attributes: ['start_time', 'end_time']
      });

      // Generar intervalos de 30 minutos disponibles
      const availableSlots = [];
      const duration = 30; // minutos por cita

      for (const slot of slots) {
        const startParts = slot.start_time.split(':');
        const endParts = slot.end_time.split(':');

        let currentMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
        const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

        while (currentMinutes + duration <= endMinutes) {
          const startHour = Math.floor(currentMinutes / 60);
          const startMin = currentMinutes % 60;
          const endHour = Math.floor((currentMinutes + duration) / 60);
          const endMin = (currentMinutes + duration) % 60;

          const startTimeStr = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`;
          const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

          // Verificar si está ocupado
          const isBooked = bookedAppointments.some(apt => {
            const aptStart = apt.start_time;
            const aptEnd = apt.end_time;
            return (startTimeStr >= aptStart && startTimeStr < aptEnd) ||
                   (endTimeStr > aptStart && endTimeStr <= aptEnd);
          });

          if (!isBooked) {
            availableSlots.push({
              start_time: startTimeStr.slice(0, 5),
              end_time: endTimeStr.slice(0, 5)
            });
          }

          currentMinutes += duration;
        }
      }

      res.json({
        date,
        lawyer_id: parseInt(lawyerId),
        slots: availableSlots
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crear cita (público - visitantes o clientes)
   * POST /api/appointments
   */
  async create(req, res, next) {
    try {
      const {
        lawyer_id,
        service_id,
        appointment_date,
        start_time,
        end_time,
        client_name,
        client_email,
        client_phone,
        notes,
        type = 'consultation'
      } = req.body;

      // Validaciones básicas
      if (!lawyer_id || !appointment_date || !start_time) {
        return res.status(400).json({
          error: 'Abogado, fecha y hora son requeridos'
        });
      }

      // Si no está autenticado, requiere datos del cliente
      const clientId = req.user?.id || null;
      if (!clientId && (!client_name || !client_email)) {
        return res.status(400).json({
          error: 'Nombre y email son requeridos para visitantes'
        });
      }

      // Verificar que el abogado existe
      const lawyer = await Lawyer.findByPk(lawyer_id);
      if (!lawyer || !lawyer.is_active) {
        return res.status(400).json({ error: 'Abogado no disponible' });
      }

      // Calcular end_time si no se proporciona (30 min por defecto)
      const calculatedEndTime = end_time || (() => {
        const [h, m] = start_time.split(':').map(Number);
        const endMinutes = h * 60 + m + 30;
        return `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
      })();

      // Verificar disponibilidad
      const existingAppointment = await Appointment.findOne({
        where: {
          lawyer_id,
          appointment_date,
          status: { [Op.in]: ['pending', 'confirmed'] },
          [Op.or]: [
            {
              start_time: { [Op.lt]: calculatedEndTime },
              end_time: { [Op.gt]: start_time }
            }
          ]
        }
      });

      if (existingAppointment) {
        return res.status(400).json({
          error: 'Este horario ya no está disponible'
        });
      }

      // Crear la cita
      const appointment = await Appointment.create({
        client_id: clientId,
        lawyer_id,
        service_id,
        appointment_date,
        start_time,
        end_time: calculatedEndTime,
        client_name: clientId ? null : client_name,
        client_email: clientId ? null : client_email,
        client_phone: clientId ? null : client_phone,
        notes,
        type,
        status: 'pending'
      });

      // Enviar confirmación por email
      try {
        const user = clientId ? await User.findByPk(clientId) : {
          email: client_email,
          first_name: client_name
        };
        await emailService.sendAppointmentConfirmation(appointment, user, lawyer);
      } catch (emailError) {
        console.error('Error enviando confirmación de cita:', emailError);
      }

      res.status(201).json({
        message: 'Cita agendada exitosamente',
        appointment: {
          id: appointment.id,
          date: appointment.appointment_date,
          time: appointment.start_time,
          lawyer: lawyer.full_name,
          status: appointment.status
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancelar cita (público - con token)
   * POST /api/appointments/:id/cancel
   */
  async cancel(req, res, next) {
    try {
      const { id } = req.params;
      const { token, reason } = req.body;

      const appointment = await Appointment.findByPk(id);

      if (!appointment) {
        return res.status(404).json({ error: 'Cita no encontrada' });
      }

      // Verificar token o que sea el cliente
      if (appointment.confirmation_token !== token &&
          (!req.user || req.user.id !== appointment.client_id)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      if (appointment.status === 'cancelled') {
        return res.status(400).json({ error: 'La cita ya está cancelada' });
      }

      if (appointment.status === 'completed') {
        return res.status(400).json({ error: 'No se puede cancelar una cita completada' });
      }

      await appointment.update({
        status: 'cancelled',
        notes: reason ? `${appointment.notes || ''}\nMotivo cancelación: ${reason}`.trim() : appointment.notes
      });

      res.json({ message: 'Cita cancelada exitosamente' });
    } catch (error) {
      next(error);
    }
  }

  // ==================== CLIENTE AUTENTICADO ====================

  /**
   * Obtener mis citas
   * GET /api/appointments/my
   */
  async getMyAppointments(req, res, next) {
    try {
      const appointments = await Appointment.findAll({
        where: { client_id: req.user.id },
        include: [
          { model: Lawyer, as: 'lawyer', attributes: ['id', 'full_name', 'photo_url', 'specialization'] },
          { model: Service, as: 'service', attributes: ['id', 'name'] }
        ],
        order: [['appointment_date', 'DESC'], ['start_time', 'DESC']]
      });

      res.json(appointments);
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN ====================

  /**
   * Obtener todas las citas (admin)
   * GET /api/appointments/admin
   */
  async getAll(req, res, next) {
    try {
      const {
        status,
        lawyer_id,
        date_from,
        date_to,
        page = 1,
        limit = 20
      } = req.query;

      const where = {};

      if (status) where.status = status;
      if (lawyer_id) where.lawyer_id = lawyer_id;
      if (date_from || date_to) {
        where.appointment_date = {};
        if (date_from) where.appointment_date[Op.gte] = date_from;
        if (date_to) where.appointment_date[Op.lte] = date_to;
      }

      const offset = (page - 1) * limit;

      const { count, rows: appointments } = await Appointment.findAndCountAll({
        where,
        include: [
          { model: Lawyer, as: 'lawyer', attributes: ['id', 'full_name', 'photo_url'] },
          { model: Service, as: 'service', attributes: ['id', 'name'] },
          { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name', 'email', 'phone'] }
        ],
        order: [['appointment_date', 'DESC'], ['start_time', 'ASC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        appointments,
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
   * Obtener cita por ID (admin)
   * GET /api/appointments/admin/:id
   */
  async getById(req, res, next) {
    try {
      const appointment = await Appointment.findByPk(req.params.id, {
        include: [
          { model: Lawyer, as: 'lawyer' },
          { model: Service, as: 'service' },
          { model: User, as: 'client', attributes: { exclude: ['password_hash'] } }
        ]
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Cita no encontrada' });
      }

      res.json(appointment);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar estado de cita (admin)
   * PATCH /api/appointments/admin/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      const appointment = await Appointment.findByPk(req.params.id, {
        include: [{ model: Lawyer, as: 'lawyer' }]
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Cita no encontrada' });
      }

      const oldStatus = appointment.status;
      await appointment.update({ status });

      // Log de auditoría
      await AuditLog.log({
        userId: req.user.id,
        action: 'update_status',
        entityType: 'Appointment',
        entityId: appointment.id,
        oldValues: { status: oldStatus },
        newValues: { status },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: 'Estado actualizado', status });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar cita (admin)
   * PUT /api/appointments/admin/:id
   */
  async update(req, res, next) {
    try {
      const appointment = await Appointment.findByPk(req.params.id);

      if (!appointment) {
        return res.status(404).json({ error: 'Cita no encontrada' });
      }

      const allowedFields = [
        'appointment_date', 'start_time', 'end_time',
        'notes', 'meeting_link', 'type', 'status'
      ];

      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      await appointment.update(updates);

      res.json({ message: 'Cita actualizada', appointment });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar cita (admin)
   * DELETE /api/appointments/admin/:id
   */
  async delete(req, res, next) {
    try {
      const appointment = await Appointment.findByPk(req.params.id);

      if (!appointment) {
        return res.status(404).json({ error: 'Cita no encontrada' });
      }

      await appointment.destroy();

      res.json({ message: 'Cita eliminada' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener estadísticas de citas (admin)
   * GET /api/appointments/admin/stats
   */
  async getStats(req, res, next) {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [total, pending, confirmed, todayCount, thisWeek] = await Promise.all([
        Appointment.count(),
        Appointment.count({ where: { status: 'pending' } }),
        Appointment.count({ where: { status: 'confirmed' } }),
        Appointment.count({ where: { appointment_date: today } }),
        Appointment.count({
          where: {
            appointment_date: {
              [Op.gte]: today,
              [Op.lte]: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }
          }
        })
      ]);

      res.json({
        total,
        pending,
        confirmed,
        today: todayCount,
        this_week: thisWeek
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== GESTIÓN DE SLOTS (ADMIN) ====================

  /**
   * Obtener slots de un abogado (admin)
   * GET /api/appointments/admin/slots/:lawyerId
   */
  async getSlots(req, res, next) {
    try {
      const { lawyerId } = req.params;

      const slots = await AppointmentSlot.findAll({
        where: { lawyer_id: lawyerId },
        order: [['day_of_week', 'ASC'], ['start_time', 'ASC']]
      });

      res.json(slots);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crear slot de disponibilidad (admin)
   * POST /api/appointments/admin/slots
   */
  async createSlot(req, res, next) {
    try {
      const { lawyer_id, day_of_week, start_time, end_time } = req.body;

      if (lawyer_id === undefined || day_of_week === undefined || !start_time || !end_time) {
        return res.status(400).json({
          error: 'Abogado, día, hora inicio y hora fin son requeridos'
        });
      }

      // Verificar abogado
      const lawyer = await Lawyer.findByPk(lawyer_id);
      if (!lawyer) {
        return res.status(400).json({ error: 'Abogado no encontrado' });
      }

      // Verificar que no se solape con otro slot
      const overlapping = await AppointmentSlot.findOne({
        where: {
          lawyer_id,
          day_of_week,
          [Op.or]: [
            {
              start_time: { [Op.lt]: end_time },
              end_time: { [Op.gt]: start_time }
            }
          ]
        }
      });

      if (overlapping) {
        return res.status(400).json({
          error: 'El horario se solapa con otro existente'
        });
      }

      const slot = await AppointmentSlot.create({
        lawyer_id,
        day_of_week,
        start_time,
        end_time,
        is_active: true
      });

      res.status(201).json({
        message: 'Horario creado',
        slot
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar slot (admin)
   * PUT /api/appointments/admin/slots/:id
   */
  async updateSlot(req, res, next) {
    try {
      const slot = await AppointmentSlot.findByPk(req.params.id);

      if (!slot) {
        return res.status(404).json({ error: 'Slot no encontrado' });
      }

      const { start_time, end_time, is_active } = req.body;

      await slot.update({
        start_time: start_time || slot.start_time,
        end_time: end_time || slot.end_time,
        is_active: is_active !== undefined ? is_active : slot.is_active
      });

      res.json({ message: 'Horario actualizado', slot });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar slot (admin)
   * DELETE /api/appointments/admin/slots/:id
   */
  async deleteSlot(req, res, next) {
    try {
      const slot = await AppointmentSlot.findByPk(req.params.id);

      if (!slot) {
        return res.status(404).json({ error: 'Slot no encontrado' });
      }

      await slot.destroy();

      res.json({ message: 'Horario eliminado' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Copiar horarios de un abogado a otro (admin)
   * POST /api/appointments/admin/slots/copy
   */
  async copySlots(req, res, next) {
    try {
      const { from_lawyer_id, to_lawyer_id } = req.body;

      if (!from_lawyer_id || !to_lawyer_id) {
        return res.status(400).json({
          error: 'IDs de abogados origen y destino requeridos'
        });
      }

      // Obtener slots del abogado origen
      const sourceSlots = await AppointmentSlot.findAll({
        where: { lawyer_id: from_lawyer_id }
      });

      if (sourceSlots.length === 0) {
        return res.status(400).json({
          error: 'El abogado origen no tiene horarios configurados'
        });
      }

      // Eliminar slots existentes del destino
      await AppointmentSlot.destroy({
        where: { lawyer_id: to_lawyer_id }
      });

      // Copiar slots
      const newSlots = await AppointmentSlot.bulkCreate(
        sourceSlots.map(s => ({
          lawyer_id: to_lawyer_id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          is_active: s.is_active
        }))
      );

      res.json({
        message: `${newSlots.length} horarios copiados`,
        slots: newSlots
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AppointmentController();
