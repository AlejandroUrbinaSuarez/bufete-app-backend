module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Acción realizada (create, update, delete, login, etc.)'
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Tipo de entidad afectada (User, Case, etc.)'
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    old_values: {
      type: DataTypes.JSON,
      allowNull: true
    },
    new_values: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  // Método estático para registrar acción
  AuditLog.log = async function(params) {
    return AuditLog.create({
      user_id: params.userId || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      old_values: params.oldValues || null,
      new_values: params.newValues || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null
    });
  };

  return AuditLog;
};
