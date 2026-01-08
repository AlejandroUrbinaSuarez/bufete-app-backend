const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Case = sequelize.define('Case', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
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
    case_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'on_hold', 'resolved', 'closed', 'cancelled'),
      defaultValue: 'pending'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    notes_encrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas confidenciales cifradas'
    },
    confidentiality_level: {
      type: DataTypes.ENUM('normal', 'confidential', 'highly_confidential'),
      defaultValue: 'normal'
    }
  }, {
    tableName: 'cases',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: (caseInstance) => {
        // Generar número de caso único
        if (!caseInstance.case_number) {
          const year = new Date().getFullYear();
          const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          caseInstance.case_number = `CASE-${year}-${random}`;
        }
      }
    }
  });

  // Status labels en español
  Case.STATUS_LABELS = {
    pending: 'Pendiente',
    in_progress: 'En Progreso',
    on_hold: 'En Espera',
    resolved: 'Resuelto',
    closed: 'Cerrado',
    cancelled: 'Cancelado'
  };

  Case.PRIORITY_LABELS = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente'
  };

  return Case;
};
