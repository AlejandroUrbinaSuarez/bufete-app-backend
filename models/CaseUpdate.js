module.exports = (sequelize, DataTypes) => {
  const CaseUpdate = sequelize.define('CaseUpdate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    case_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'cases',
        key: 'id'
      }
    },
    update_type: {
      type: DataTypes.ENUM('status_change', 'note', 'milestone', 'document', 'meeting'),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'case_updates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  // Labels para tipos de actualización
  CaseUpdate.TYPE_LABELS = {
    status_change: 'Cambio de Estado',
    note: 'Nota',
    milestone: 'Hito',
    document: 'Documento',
    meeting: 'Reunión'
  };

  return CaseUpdate;
};
