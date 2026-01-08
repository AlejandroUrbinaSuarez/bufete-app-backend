const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define('Appointment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Null si es visitante no registrado'
    },
    lawyer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lawyers',
        key: 'id'
      }
    },
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'services',
        key: 'id'
      }
    },
    case_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'cases',
        key: 'id'
      }
    },
    // Datos del cliente (para visitantes no registrados)
    client_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    client_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    client_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    // Fecha y hora
    appointment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    // Estado y tipo
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show'),
      defaultValue: 'pending'
    },
    type: {
      type: DataTypes.ENUM('consultation', 'follow_up', 'meeting', 'court_date'),
      defaultValue: 'consultation'
    },
    // Detalles
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    meeting_link: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Link para videollamada si aplica'
    },
    confirmation_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    reminder_sent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'appointments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: (appointment) => {
        // Generar token de confirmación
        appointment.confirmation_token = crypto.randomBytes(32).toString('hex');
      }
    }
  });

  // Labels
  Appointment.STATUS_LABELS = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    completed: 'Completada',
    no_show: 'No asistió'
  };

  Appointment.TYPE_LABELS = {
    consultation: 'Consulta',
    follow_up: 'Seguimiento',
    meeting: 'Reunión',
    court_date: 'Fecha de Juicio'
  };

  return Appointment;
};
