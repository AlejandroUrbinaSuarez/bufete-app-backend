const nodemailer = require('nodemailer');
const emailConfig = require('../config/email');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth
    });
  }

  /**
   * Envía un email
   * @param {Object} options - Opciones del email
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      const info = await this.transporter.sendMail({
        from: emailConfig.from,
        to,
        subject,
        html,
        text
      });

      console.log('Email enviado:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error enviando email:', error);
      throw error;
    }
  }

  /**
   * Email de verificación de cuenta
   */
  async sendVerificationEmail(user, token) {
    const verifyUrl = `${process.env.FRONTEND_URL}/verificar-email/${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Verifica tu cuenta</h1>
        <p>Hola ${user.first_name},</p>
        <p>Gracias por registrarte en ${process.env.SITE_NAME}. Por favor verifica tu email haciendo clic en el siguiente enlace:</p>
        <p style="text-align: center;">
          <a href="${verifyUrl}"
             style="display: inline-block; padding: 12px 24px; background-color: #1a365d; color: white; text-decoration: none; border-radius: 5px;">
            Verificar Email
          </a>
        </p>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
        <p>Este enlace expira en 24 horas.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          Si no creaste esta cuenta, puedes ignorar este mensaje.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Verifica tu cuenta - ${process.env.SITE_NAME}`,
      html
    });
  }

  /**
   * Email de recuperación de contraseña
   */
  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/restablecer-password/${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Restablecer Contraseña</h1>
        <p>Hola ${user.first_name},</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el siguiente enlace:</p>
        <p style="text-align: center;">
          <a href="${resetUrl}"
             style="display: inline-block; padding: 12px 24px; background-color: #1a365d; color: white; text-decoration: none; border-radius: 5px;">
            Restablecer Contraseña
          </a>
        </p>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>Este enlace expira en 1 hora.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          Si no solicitaste restablecer tu contraseña, puedes ignorar este mensaje. Tu cuenta está segura.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Restablecer Contraseña - ${process.env.SITE_NAME}`,
      html
    });
  }

  /**
   * Email de bienvenida después de verificar
   */
  async sendWelcomeEmail(user) {
    const loginUrl = `${process.env.FRONTEND_URL}/login`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">¡Bienvenido a ${process.env.SITE_NAME}!</h1>
        <p>Hola ${user.first_name},</p>
        <p>Tu cuenta ha sido verificada exitosamente. Ya puedes acceder a tu portal de cliente.</p>
        <p style="text-align: center;">
          <a href="${loginUrl}"
             style="display: inline-block; padding: 12px 24px; background-color: #d4a574; color: white; text-decoration: none; border-radius: 5px;">
            Iniciar Sesión
          </a>
        </p>
        <p>En tu portal podrás:</p>
        <ul>
          <li>Ver el estado de tus casos</li>
          <li>Agendar citas con tu abogado</li>
          <li>Enviar y recibir documentos de forma segura</li>
          <li>Comunicarte directamente con tu equipo legal</li>
        </ul>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          ${process.env.SITE_NAME} - Tu socio legal de confianza
        </p>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Bienvenido a ${process.env.SITE_NAME}`,
      html
    });
  }

  /**
   * Email de confirmación de cita
   */
  async sendAppointmentConfirmation(appointment, user, lawyer) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Cita Confirmada</h1>
        <p>Hola ${user.first_name || appointment.client_name},</p>
        <p>Tu cita ha sido agendada exitosamente:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Fecha:</strong> ${appointment.appointment_date}</p>
          <p><strong>Hora:</strong> ${appointment.start_time} - ${appointment.end_time}</p>
          <p><strong>Abogado:</strong> ${lawyer.full_name}</p>
          ${appointment.meeting_link ? `<p><strong>Enlace de reunión:</strong> <a href="${appointment.meeting_link}">${appointment.meeting_link}</a></p>` : ''}
        </div>
        <p>Te enviaremos un recordatorio antes de tu cita.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          Si necesitas cancelar o reprogramar, por favor contáctanos con anticipación.
        </p>
      </div>
    `;

    const email = user ? user.email : appointment.client_email;

    return this.sendEmail({
      to: email,
      subject: `Cita Confirmada - ${process.env.SITE_NAME}`,
      html
    });
  }

  /**
   * Email de nuevo mensaje de contacto (para admins)
   */
  async sendContactNotification(contact) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Nuevo Mensaje de Contacto</h1>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
          <p><strong>Nombre:</strong> ${contact.name}</p>
          <p><strong>Email:</strong> ${contact.email}</p>
          <p><strong>Teléfono:</strong> ${contact.phone || 'No proporcionado'}</p>
          <p><strong>Asunto:</strong> ${contact.subject || 'Sin asunto'}</p>
          <p><strong>Mensaje:</strong></p>
          <p style="white-space: pre-wrap;">${contact.message}</p>
        </div>
        <p style="margin-top: 20px;">
          <a href="${process.env.FRONTEND_URL}/admin/contactos"
             style="display: inline-block; padding: 10px 20px; background-color: #1a365d; color: white; text-decoration: none; border-radius: 5px;">
            Ver en Panel Admin
          </a>
        </p>
      </div>
    `;

    return this.sendEmail({
      to: process.env.SITE_EMAIL,
      subject: `Nuevo Contacto: ${contact.subject || contact.name}`,
      html
    });
  }

  /**
   * Email de respuesta a mensaje de contacto
   */
  async sendContactResponse(contact, response) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Respuesta a su consulta</h1>
        <p>Estimado/a ${contact.name},</p>
        <p>Gracias por contactarnos. A continuación, nuestra respuesta a su consulta:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="white-space: pre-wrap;">${response}</p>
        </div>
        <p>Su mensaje original:</p>
        <div style="background-color: #eee; padding: 15px; border-radius: 5px; color: #666; font-size: 14px;">
          <p style="white-space: pre-wrap;">${contact.message}</p>
        </div>
        <p style="margin-top: 20px;">Si tiene alguna pregunta adicional, no dude en responder a este correo o llamarnos.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          ${process.env.SITE_NAME}<br>
          ${process.env.SITE_PHONE || ''}<br>
          ${process.env.SITE_EMAIL || ''}
        </p>
      </div>
    `;

    return this.sendEmail({
      to: contact.email,
      subject: `Re: ${contact.subject || 'Su consulta'} - ${process.env.SITE_NAME}`,
      html
    });
  }

  /**
   * Email de recordatorio de cita (24 horas antes)
   */
  async sendAppointmentReminder(appointment, user, lawyer) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Recordatorio de Cita</h1>
        <p>Hola ${user.first_name || appointment.client_name},</p>
        <p>Te recordamos que tienes una cita programada para <strong>mañana</strong>:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Fecha:</strong> ${appointment.appointment_date}</p>
          <p><strong>Hora:</strong> ${appointment.start_time} - ${appointment.end_time}</p>
          <p><strong>Abogado:</strong> ${lawyer.full_name}</p>
          ${appointment.meeting_link ? `<p><strong>Enlace de reunión:</strong> <a href="${appointment.meeting_link}">${appointment.meeting_link}</a></p>` : ''}
        </div>
        <p>Si no puedes asistir, por favor contáctanos lo antes posible para reprogramar.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          ${process.env.SITE_NAME}<br>
          ${process.env.SITE_PHONE || ''}<br>
          ${process.env.SITE_EMAIL || ''}
        </p>
      </div>
    `;

    const email = user ? user.email : appointment.client_email;

    return this.sendEmail({
      to: email,
      subject: `Recordatorio: Cita mañana - ${process.env.SITE_NAME}`,
      html
    });
  }

  /**
   * Email de cancelación de cita
   */
  async sendAppointmentCancellation(appointment, user, lawyer, reason = '') {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Cita Cancelada</h1>
        <p>Hola ${user.first_name || appointment.client_name},</p>
        <p>Te informamos que tu cita ha sido cancelada:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Fecha:</strong> ${appointment.appointment_date}</p>
          <p><strong>Hora:</strong> ${appointment.start_time} - ${appointment.end_time}</p>
          <p><strong>Abogado:</strong> ${lawyer.full_name}</p>
          ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
        </div>
        <p>Si deseas reagendar tu cita, puedes hacerlo a través de nuestra página web.</p>
        <p style="text-align: center; margin-top: 20px;">
          <a href="${process.env.FRONTEND_URL}/agendar-cita"
             style="display: inline-block; padding: 12px 24px; background-color: #1a365d; color: white; text-decoration: none; border-radius: 5px;">
            Agendar Nueva Cita
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          ${process.env.SITE_NAME}<br>
          ${process.env.SITE_PHONE || ''}<br>
          ${process.env.SITE_EMAIL || ''}
        </p>
      </div>
    `;

    const email = user ? user.email : appointment.client_email;

    return this.sendEmail({
      to: email,
      subject: `Cita Cancelada - ${process.env.SITE_NAME}`,
      html
    });
  }
}

module.exports = new EmailService();
